import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '../services/firebase';
import { sessionService } from '../services/sessionService';
import { geminiService } from '../services/gemini.js';
import { SCORE_LEVELS, MAX_SCORE_PER_ITEM, PHASE_LABELS } from '../data/assessment';
import { X, RefreshCw, Sparkles, CheckCircle, Download, RotateCcw } from 'lucide-react';

const POLL_MS = 30000;

const sumScores = (rec, phase) => {
    const p = rec?.[phase];
    if (!p) return null;
    const scores = p.teacherScores?.length ? p.teacherScores : (p.aiItems || []).map(it => it.score);
    if (!scores?.length) return null;
    return scores.reduce((a, b) => a + (Number(b) || 0), 0);
};

// CSV 셀 이스케이프 (쉼표·줄바꿈·따옴표가 든 서술형 답을 안전하게)
const csvCell = (v) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * 모듈 6: 연구 평가 보드 (교사)
 * - 사전/사후 단계 전환, 응시 현황, AI 초벌 채점 → 교사 확정, CSV 내보내기
 */
const AssessmentBoard = ({ classId, session, studentCount, onClose, onPhaseChanged }) => {
    const [records, setRecords] = useState({});
    const [phase, setPhase] = useState(session.assessmentPhase === 'post' ? 'post' : 'pre');
    const [selectedNo, setSelectedNo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScoring, setIsScoring] = useState(false);
    const [progress, setProgress] = useState('');

    const questions = session.assessmentQuestions || [];

    const load = useCallback(async () => {
        try {
            const snap = await getDocs(collection(db, 'classes', classId, 'sessions', session.id, 'assessments'));
            const map = {};
            snap.docs.forEach(d => { map[d.id] = d.data(); });
            setRecords(map);
        } catch (e) {
            console.error('연구 평가 로드 실패:', e);
            alert('응시 현황을 불러오지 못했습니다. Firestore 규칙이 최신인지 확인해 주세요.\n' + e.message);
        } finally {
            setIsLoading(false);
        }
    }, [classId, session.id]);

    useEffect(() => {
        load();
        const t = setInterval(load, POLL_MS);
        return () => clearInterval(t);
    }, [load]);

    const recOf = (no) => records[`sno_${no}`];
    const nos = Array.from({ length: studentCount || 30 }, (_, i) => i + 1);

    // 학생이 어느 단계를 푸는지는 세션 필드가 결정한다
    const handleSwitchPhase = async (next) => {
        if (next === phase) return;
        const label = PHASE_LABELS[next];
        if (!window.confirm(`학생 화면을 '${label}'로 바꿀까요?\n지금 입장해 있는 학생도 15초 안에 ${label} 문항으로 바뀝니다.`)) return;
        try {
            await sessionService.updateSession(classId, session.id, { assessmentPhase: next });
            setPhase(next);
            onPhaseChanged?.(next);
        } catch (e) {
            alert('단계 전환 실패: ' + e.message);
        }
    };

    // 제출했고 아직 AI 채점이 없는 학생을 순차 채점 (분당 한도 보호)
    const handleScoreAll = async () => {
        const targets = Object.entries(records).filter(([, r]) => r[phase]?.submittedAt && !r[phase]?.aiItems?.length);
        if (targets.length === 0) {
            alert(`채점할 학생이 없습니다.\n(${PHASE_LABELS[phase]} 제출 완료 + 미채점 학생 대상)`);
            return;
        }
        setIsScoring(true);
        let done = 0;
        try {
            for (const [id, r] of targets) {
                setProgress(`${r.studentName || id} 채점 중... (${done + 1}/${targets.length})`);
                try {
                    const items = await geminiService.scoreAssessment(questions, r[phase].answers || []);
                    await updateDoc(doc(db, 'classes', classId, 'sessions', session.id, 'assessments', id), {
                        [`${phase}.aiItems`]: items,
                        [`${phase}.aiScoredAt`]: serverTimestamp(),
                    });
                    done++;
                } catch (e) {
                    console.error(`${id} 채점 실패:`, e);
                }
                await new Promise(s => setTimeout(s, 1200));
            }
        } finally {
            setIsScoring(false);
            setProgress('');
            await load();
        }
    };

    // 교사 확정: 문항 하나의 점수를 바꾸면 나머지는 AI 점수를 그대로 이어받는다
    const handleSetScore = async (no, qIdx, score) => {
        const id = `sno_${no}`;
        const rec = records[id];
        const cur = rec?.[phase] || {};
        const base = cur.teacherScores?.length
            ? [...cur.teacherScores]
            : questions.map((_, i) => cur.aiItems?.[i]?.score ?? 0);
        base[qIdx] = score;
        try {
            await updateDoc(doc(db, 'classes', classId, 'sessions', session.id, 'assessments', id), {
                [`${phase}.teacherScores`]: base,
                [`${phase}.confirmedAt`]: serverTimestamp(),
            });
            setRecords({ ...records, [id]: { ...rec, [phase]: { ...cur, teacherScores: base } } });
        } catch (e) {
            alert('확정 저장 실패: ' + e.message);
        }
    };

    // 잘못 제출한 학생을 다시 풀게 (답은 남기고 제출 잠금만 해제)
    const handleReopen = async (no) => {
        if (!window.confirm(`${no}번 학생이 ${PHASE_LABELS[phase]}를 다시 풀 수 있게 할까요?\n적었던 답은 그대로 남습니다.`)) return;
        try {
            await updateDoc(doc(db, 'classes', classId, 'sessions', session.id, 'assessments', `sno_${no}`), {
                [`${phase}.submittedAt`]: deleteField(),
            });
            await load();
        } catch (e) {
            alert('해제 실패: ' + e.message);
        }
    };

    const handleExportCsv = () => {
        const header = [
            '출석번호', '사전총점', '사후총점', '향상도', '사전확정', '사후확정',
            ...questions.map((_, i) => `사전${i + 1}점`),
            ...questions.map((_, i) => `사후${i + 1}점`),
            ...questions.map((_, i) => `사전${i + 1}답`),
            ...questions.map((_, i) => `사후${i + 1}답`),
        ];
        const scoresOf = (rec, ph) => {
            const p = rec?.[ph];
            if (!p) return questions.map(() => '');
            const s = p.teacherScores?.length ? p.teacherScores : (p.aiItems || []).map(it => it.score);
            return questions.map((_, i) => (s?.[i] ?? ''));
        };
        const rows = nos.map(no => {
            const rec = recOf(no);
            const pre = sumScores(rec, 'pre');
            const post = sumScores(rec, 'post');
            return [
                no,
                pre ?? '', post ?? '',
                pre != null && post != null ? post - pre : '',
                rec?.pre?.teacherScores?.length ? 'Y' : 'N',
                rec?.post?.teacherScores?.length ? 'Y' : 'N',
                ...scoresOf(rec, 'pre'),
                ...scoresOf(rec, 'post'),
                ...questions.map((_, i) => rec?.pre?.answers?.[i] || ''),
                ...questions.map((_, i) => rec?.post?.answers?.[i] || ''),
            ];
        });
        const csv = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
        // 엑셀(한글 Windows)에서 깨지지 않도록 UTF-8 BOM 부착
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `연구평가_${session.title}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const stats = { done: 0, writing: 0, none: 0 };
    nos.forEach(no => {
        const p = recOf(no)?.[phase];
        if (p?.submittedAt) stats.done++;
        else if (p?.answers?.some(a => a)) stats.writing++;
        else stats.none++;
    });

    const selected = selectedNo ? recOf(selectedNo)?.[phase] : null;
    const selectedScores = selected?.teacherScores?.length
        ? selected.teacherScores
        : questions.map((_, i) => selected?.aiItems?.[i]?.score ?? null);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 150 }}>
            <div style={{ background: 'var(--card-bg)', padding: '1.75rem', borderRadius: '1rem', width: '1080px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>📝 연구 평가 — {session.title}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button onClick={load} title="새로고침(30초마다 자동)" style={{ padding: '0.45rem 0.9rem', borderRadius: '2rem', border: '1px solid #ddd', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <RefreshCw size={14} /> 새로고침
                        </button>
                        <button onClick={handleScoreAll} disabled={isScoring} style={{ padding: '0.45rem 0.9rem', borderRadius: '2rem', border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', opacity: isScoring ? 0.7 : 1 }}>
                            <Sparkles size={14} /> {isScoring ? progress || '채점 중...' : 'AI 초벌 채점 (미채점 전체)'}
                        </button>
                        <button onClick={handleExportCsv} style={{ padding: '0.45rem 0.9rem', borderRadius: '2rem', border: '1px solid #059669', background: 'white', color: '#059669', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Download size={14} /> CSV 내보내기
                        </button>
                        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-sub)' }}><X size={22} /></button>
                    </div>
                </div>

                {/* 단계 전환 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '0.75rem', flexWrap: 'wrap' }}>
                    <strong>학생 화면 단계:</strong>
                    {['pre', 'post'].map(p => (
                        <button key={p} onClick={() => handleSwitchPhase(p)}
                            style={{
                                padding: '0.5rem 1.2rem', borderRadius: '0.6rem', cursor: 'pointer', fontWeight: 700,
                                border: phase === p ? 'none' : '1px solid #ddd',
                                background: phase === p ? 'var(--primary)' : 'white',
                                color: phase === p ? 'white' : 'var(--text-main)',
                            }}>
                            {phase === p ? '● ' : ''}{PHASE_LABELS[p]}
                        </button>
                    ))}
                    <span style={{ color: 'var(--text-sub)', fontSize: '0.85rem' }}>
                        수업 전에는 사전, 프로그램을 마친 뒤 사후로 바꿔 주세요. 아래 현황·채점은 선택한 단계 기준입니다.
                    </span>
                </div>

                {/* 요약 */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.95rem' }}>
                    <span>⬜ 미응시 <strong>{stats.none}</strong></span>
                    <span style={{ color: '#d97706' }}>🟨 작성 중 <strong>{stats.writing}</strong></span>
                    <span style={{ color: '#059669' }}>🟩 제출 완료 <strong>{stats.done}</strong></span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-sub)' }}>
                        문항 {questions.length}개 · 문항당 0~{MAX_SCORE_PER_ITEM}점 · 총점 {questions.length * MAX_SCORE_PER_ITEM}점
                    </span>
                </div>

                {isLoading ? <p style={{ color: 'var(--text-sub)' }}>불러오는 중...</p> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        {nos.map(no => {
                            const rec = recOf(no);
                            const p = rec?.[phase];
                            const total = sumScores(rec, phase);
                            const bg = p?.submittedAt ? '#d1fae5' : p?.answers?.some(a => a) ? '#fef3c7' : '#f1f5f9';
                            const border = selectedNo === no ? '3px solid var(--primary)' : '1px solid #e2e8f0';
                            return (
                                <button key={no} onClick={() => setSelectedNo(no === selectedNo ? null : no)}
                                    style={{ padding: '0.6rem 0.25rem', borderRadius: '0.6rem', border, background: bg, cursor: 'pointer', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{no}번</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', minHeight: '1rem' }}>
                                        {total != null ? `${p?.teacherScores?.length ? '✔' : '🤖'}${total}점` : p?.submittedAt ? '제출✓' : ''}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 학생 상세 */}
                {selectedNo && (
                    <div style={{ borderTop: '2px solid var(--primary)', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                            <h4 style={{ margin: 0 }}>🧑‍🎓 {selectedNo}번 · {PHASE_LABELS[phase]}</h4>
                            {selected?.submittedAt && (
                                <button onClick={() => handleReopen(selectedNo)} style={{ padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid #b45309', background: 'white', color: '#b45309', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <RotateCcw size={13} /> 다시 풀게 하기
                                </button>
                            )}
                            <span style={{ marginLeft: 'auto', fontWeight: 700 }}>
                                총점 {sumScores(recOf(selectedNo), phase) ?? '—'} / {questions.length * MAX_SCORE_PER_ITEM}
                            </span>
                        </div>

                        {!selected ? (
                            <p style={{ color: 'var(--text-sub)' }}>아직 이 단계 검사를 시작하지 않았습니다.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                                {questions.map((q, i) => (
                                    <div key={i} style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '0.9rem 1rem' }}>
                                        <p style={{ margin: '0 0 0.4rem', fontWeight: 700 }}>{i + 1}. {q}</p>
                                        <p style={{ margin: '0 0 0.6rem', whiteSpace: 'pre-wrap' }}>{selected.answers?.[i] || <span style={{ color: 'var(--text-sub)' }}>— (답 없음)</span>}</p>
                                        {selected.aiItems?.[i] && (
                                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                                                🤖 AI {selected.aiItems[i].score}점 — {selected.aiItems[i].reason}
                                            </p>
                                        )}
                                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>교사 확정:</span>
                                            {SCORE_LEVELS.map(lv => (
                                                <button key={lv.score} onClick={() => handleSetScore(selectedNo, i, lv.score)}
                                                    title={lv.desc}
                                                    style={{
                                                        padding: '0.35rem 0.7rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                                        border: selectedScores[i] === lv.score ? 'none' : '1px solid #ddd',
                                                        background: selectedScores[i] === lv.score ? 'var(--primary)' : 'white',
                                                        color: selectedScores[i] === lv.score ? 'white' : 'var(--text-main)',
                                                    }}>
                                                    {lv.score} {lv.label}
                                                </button>
                                            ))}
                                            {selected.teacherScores?.length > 0 && <CheckCircle size={16} color="#10b981" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssessmentBoard;
