import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { geminiService } from '../services/gemini.js';
import { X, RefreshCw, Sparkles, CheckCircle } from 'lucide-react';

const FELDMAN_LABELS = { 1: '서술', 2: '분석', 3: '해석', 4: '판단' };
const POLL_MS = 30000;

/**
 * 모듈 1: 감상 현황 모니터링 (교사)
 * - 출석번호 그리드로 미시작/1차/2차 진행을 한눈에
 * - AI 초벌 판정(펠드만 단계) → 교사 최종 확정
 */
const AppreciationMonitor = ({ classId, session, studentCount, onClose }) => {
    const [records, setRecords] = useState({}); // { sno_3: {...} }
    const [selectedNo, setSelectedNo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isJudging, setIsJudging] = useState(false);
    const [judgeProgress, setJudgeProgress] = useState('');

    const load = useCallback(async () => {
        try {
            const snap = await getDocs(collection(db, 'classes', classId, 'sessions', session.id, 'deepAppreciations'));
            const map = {};
            snap.docs.forEach(d => { map[d.id] = d.data(); });
            setRecords(map);
        } catch (e) {
            console.error('감상 현황 로드 실패:', e);
            alert('감상 현황을 불러오지 못했습니다. Firestore 규칙이 최신인지 확인해 주세요.\n' + e.message);
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
    const levelOf = (rec) => rec?.teacherLevel || rec?.aiLevel || null;

    // 2차까지 쓴 학생 중 아직 AI 판정이 없는 학생을 순차 판정 (분당 한도 보호)
    const handleJudgeAll = async () => {
        const targets = Object.entries(records)
            .filter(([, r]) => r.secondText && !r.aiLevel);
        if (targets.length === 0) {
            alert('판정할 학생이 없습니다. (2차 감상 완료 + 미판정 학생 대상)');
            return;
        }
        setIsJudging(true);
        let done = 0;
        try {
            for (const [id, r] of targets) {
                setJudgeProgress(`${r.studentName || id} 판정 중... (${done + 1}/${targets.length})`);
                try {
                    const { level, reason } = await geminiService.judgeFeldman(r.firstText, r.secondText, session.rubric || []);
                    await updateDoc(doc(db, 'classes', classId, 'sessions', session.id, 'deepAppreciations', id), {
                        aiLevel: level, aiReason: reason, aiJudgedAt: serverTimestamp(),
                    });
                    done++;
                } catch (e) {
                    console.error(`${id} 판정 실패:`, e);
                }
                await new Promise(s => setTimeout(s, 1200));
            }
        } finally {
            setIsJudging(false);
            setJudgeProgress('');
            await load();
        }
    };

    const handleConfirm = async (no, level) => {
        try {
            await updateDoc(doc(db, 'classes', classId, 'sessions', session.id, 'deepAppreciations', `sno_${no}`), {
                teacherLevel: level, confirmedAt: serverTimestamp(),
            });
            setRecords({ ...records, [`sno_${no}`]: { ...records[`sno_${no}`], teacherLevel: level } });
        } catch (e) {
            alert('확정 저장 실패: ' + e.message);
        }
    };

    // 요약 통계
    const nos = Array.from({ length: studentCount || 30 }, (_, i) => i + 1);
    const stats = { none: 0, first: 0, second: 0, levels: { 1: 0, 2: 0, 3: 0, 4: 0 } };
    nos.forEach(no => {
        const r = recOf(no);
        if (!r) stats.none++;
        else if (r.status === 'second_done') stats.second++;
        else stats.first++;
        const lv = levelOf(r);
        if (lv) stats.levels[lv]++;
    });

    const selected = selectedNo ? recOf(selectedNo) : null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 150 }}>
            <div style={{ background: 'var(--card-bg)', padding: '1.75rem', borderRadius: '1rem', width: '1040px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>📊 감상 현황 — {session.title}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={load} title="새로고침(30초마다 자동)" style={{ padding: '0.45rem 0.9rem', borderRadius: '2rem', border: '1px solid #ddd', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <RefreshCw size={14} /> 새로고침
                        </button>
                        <button onClick={handleJudgeAll} disabled={isJudging} style={{ padding: '0.45rem 0.9rem', borderRadius: '2rem', border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', opacity: isJudging ? 0.7 : 1 }}>
                            <Sparkles size={14} /> {isJudging ? judgeProgress || '판정 중...' : 'AI 초벌 판정 (미판정 전체)'}
                        </button>
                        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-sub)' }}><X size={22} /></button>
                    </div>
                </div>

                {/* 요약 바 */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.95rem' }}>
                    <span>⬜ 미시작 <strong>{stats.none}</strong></span>
                    <span style={{ color: '#d97706' }}>🟨 1차 완료 <strong>{stats.first}</strong></span>
                    <span style={{ color: '#059669' }}>🟩 2차 완료 <strong>{stats.second}</strong></span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-sub)' }}>
                        펠드만: 서술 {stats.levels[1]} · 분석 {stats.levels[2]} · 해석 {stats.levels[3]} · 판단 {stats.levels[4]}
                    </span>
                </div>

                {isLoading ? <p style={{ color: 'var(--text-sub)' }}>불러오는 중...</p> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        {nos.map(no => {
                            const r = recOf(no);
                            const lv = levelOf(r);
                            const bg = !r ? '#f1f5f9' : r.status === 'second_done' ? '#d1fae5' : '#fef3c7';
                            const border = selectedNo === no ? '3px solid var(--primary)' : '1px solid #e2e8f0';
                            return (
                                <button key={no} onClick={() => setSelectedNo(no === selectedNo ? null : no)}
                                    style={{ padding: '0.6rem 0.25rem', borderRadius: '0.6rem', border, background: bg, cursor: r ? 'pointer' : 'default', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{no}번</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', minHeight: '1rem' }}>
                                        {lv ? `${r.teacherLevel ? '✔' : '🤖'}${FELDMAN_LABELS[lv]}` : r ? (r.status === 'second_done' ? '2차✓' : '1차✓') : ''}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 학생 상세 */}
                {selected && (
                    <div style={{ borderTop: '2px solid var(--primary)', paddingTop: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem' }}>🧑‍🎨 {selectedNo}번 학생</h4>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 260px', background: '#f8fafc', borderRadius: '0.75rem', padding: '0.9rem' }}>
                                <strong>1차 감상</strong>
                                <p style={{ whiteSpace: 'pre-wrap', margin: '0.4rem 0 0' }}>{selected.firstText || '—'}</p>
                            </div>
                            <div style={{ flex: '1 1 260px', background: '#fffbeb', borderRadius: '0.75rem', padding: '0.9rem' }}>
                                <strong>AI 질문</strong>
                                <ol style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
                                    {(selected.questions || []).map((q, i) => <li key={i}>{q}</li>)}
                                </ol>
                            </div>
                            <div style={{ flex: '1 1 260px', background: '#ecfdf5', borderRadius: '0.75rem', padding: '0.9rem' }}>
                                <strong>2차 감상</strong>
                                <p style={{ whiteSpace: 'pre-wrap', margin: '0.4rem 0 0' }}>{selected.secondText || '— (아직)'}</p>
                            </div>
                        </div>

                        <div style={{ marginTop: '0.9rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 300px' }}>
                                {selected.aiLevel ? (
                                    <p style={{ margin: 0 }}>
                                        🤖 AI 초벌: <strong>{selected.aiLevel}단계 ({FELDMAN_LABELS[selected.aiLevel]})</strong>
                                        <span style={{ color: 'var(--text-sub)' }}> — {selected.aiReason}</span>
                                    </p>
                                ) : (
                                    <p style={{ margin: 0, color: 'var(--text-sub)' }}>아직 AI 판정이 없습니다. (위의 'AI 초벌 판정' 버튼)</p>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600 }}>교사 확정:</span>
                                {[1, 2, 3, 4].map(lv => (
                                    <button key={lv} onClick={() => handleConfirm(selectedNo, lv)}
                                        style={{
                                            padding: '0.45rem 0.8rem', borderRadius: '0.6rem', cursor: 'pointer', fontWeight: 700,
                                            border: selected.teacherLevel === lv ? 'none' : '1px solid #ddd',
                                            background: selected.teacherLevel === lv ? 'var(--primary)' : 'white',
                                            color: selected.teacherLevel === lv ? 'white' : 'var(--text-main)',
                                        }}>
                                        {lv} {FELDMAN_LABELS[lv]}
                                    </button>
                                ))}
                                {selected.teacherLevel && <CheckCircle size={20} color="#10b981" />}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppreciationMonitor;
