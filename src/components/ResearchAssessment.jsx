import React, { useState, useEffect, useCallback, useRef } from 'react';
import { studentAuthService } from '../services/studentAuthService';
import { PHASE_LABELS } from '../data/assessment';
import { Loader, CheckCircle, ChevronLeft, ChevronRight, Send } from 'lucide-react';

const POLL_MS = 15000;

/**
 * 모듈 6: 연구 평가 (학생) — 사전·사후 서술형 검사
 * - 단계(사전/사후)는 교사가 대시보드에서 전환한다. 학생 화면은 폴링으로 따라간다
 * - 한 문항씩 보여 주고(크롬북 한 화면), 이동할 때마다 임시 저장 → 재입장 복원
 * - 제출하면 잠긴다 (연구 검사이므로 사후 수정 방지)
 */
const ResearchAssessment = ({ session, showToast }) => {
    const [state, setState] = useState(null); // { phase, questions, answers, submitted }
    const [answers, setAnswers] = useState([]);
    const [idx, setIdx] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const phaseRef = useRef(null);
    const taRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const data = await studentAuthService.getAssessment();
            setState(data);
            // 교사가 단계를 바꿨거나 첫 로드면 답안을 서버 기준으로 맞춘다
            if (phaseRef.current !== data.phase) {
                phaseRef.current = data.phase;
                setAnswers(data.questions.map((_, i) => data.answers[i] || ''));
                setIdx(0);
            }
        } catch (e) {
            console.error('검사 정보 로드 실패:', e);
        }
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(load, POLL_MS);
        return () => clearInterval(t);
    }, [load]);

    useEffect(() => {
        taRef.current?.focus();
    }, [idx, state?.submitted]);

    if (!state) {
        return <p style={{ color: 'var(--text-sub)' }}><Loader size={16} style={{ animation: 'spin 1s linear infinite', verticalAlign: '-3px' }} /> 불러오는 중...</p>;
    }
    if (state.questions.length === 0) {
        return <p style={{ color: 'var(--text-sub)' }}>검사 문항이 아직 준비되지 않았어요. 선생님께 알려 주세요.</p>;
    }

    const phaseLabel = PHASE_LABELS[state.phase] || '검사';

    if (state.submitted) {
        return (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <CheckCircle size={56} color="#10b981" />
                <h3 style={{ margin: '1rem 0 0.5rem', fontSize: '1.5rem' }}>{phaseLabel}를 마쳤어요!</h3>
                <p style={{ color: 'var(--text-sub)', fontSize: '1.05rem', margin: 0 }}>
                    끝까지 생각해서 답해 줘서 고마워요. 답은 선생님만 볼 수 있어요.
                </p>
                <p style={{ color: 'var(--text-sub)', marginTop: '1.25rem' }}>
                    {state.phase === 'pre'
                        ? '수업을 마친 뒤에 사후 검사를 하게 될 거예요.'
                        : '수고했어요. 이제 다른 활동을 해도 좋아요.'}
                </p>
            </div>
        );
    }

    const saveDraft = async (next = answers) => {
        setIsSaving(true);
        try {
            await studentAuthService.saveAssessment(next, false);
        } catch (e) {
            console.error('임시 저장 실패:', e);
        } finally {
            setIsSaving(false);
        }
    };

    const setAnswer = (v) => setAnswers(answers.map((a, i) => (i === idx ? v : a)));

    const go = async (delta) => {
        await saveDraft();
        setIdx(Math.min(state.questions.length - 1, Math.max(0, idx + delta)));
    };

    const handleSubmit = async () => {
        const written = answers.filter(a => a.trim()).length;
        if (written < state.questions.length) {
            const ok = window.confirm(`${state.questions.length}문항 중 ${written}문항만 답했어요.\n제출하면 고칠 수 없는데 지금 낼까요?`);
            if (!ok) return;
        }
        setIsSubmitting(true);
        try {
            await studentAuthService.saveAssessment(answers, true);
            showToast('✅ 제출 완료! 수고했어요.', 'success');
            await load();
        } catch (e) {
            showToast('제출 실패: ' + e.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLast = idx === state.questions.length - 1;

    return (
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            {/* 단계 + 진행 표시 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{ padding: '0.3rem 0.8rem', borderRadius: '999px', background: state.phase === 'pre' ? '#e0e7ff' : '#d1fae5', color: state.phase === 'pre' ? '#3730a3' : '#065f46', fontWeight: 700 }}>
                    📝 {phaseLabel}
                </span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {state.questions.map((_, i) => (
                        <span key={i} style={{
                            width: '2rem', height: '0.4rem', borderRadius: '999px',
                            background: i === idx ? 'var(--primary)' : answers[i]?.trim() ? '#a5b4fc' : '#e2e8f0',
                        }} />
                    ))}
                </div>
                <span style={{ color: 'var(--text-sub)' }}>{idx + 1} / {state.questions.length}</span>
                {isSaving && <span style={{ color: 'var(--text-sub)', fontSize: '0.85rem' }}>저장 중...</span>}
            </div>

            {/* 문항 */}
            <div style={{ background: '#f8fafc', borderRadius: '1rem', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.5 }}>
                    {idx + 1}. {state.questions[idx]}
                </p>
            </div>

            <textarea
                ref={taRef}
                value={answers[idx] || ''}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                    // 서술형이라 엔터는 줄바꿈. 다음 문항은 Ctrl+Enter
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        if (isLast) handleSubmit(); else go(1);
                    }
                }}
                placeholder="생각한 것을 자유롭게 적어 보세요. 까닭도 함께 쓰면 더 좋아요."
                style={{ width: '100%', height: '190px', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd', fontSize: '1.1rem', lineHeight: 1.6 }}
            />
            <p style={{ margin: '0.4rem 0 1rem', fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                Ctrl + Enter 를 누르면 {isLast ? '제출' : '다음 문항으로 이동'}해요.
            </p>

            {/* 이동 · 제출 */}
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                    onClick={() => go(-1)}
                    disabled={idx === 0}
                    style={{ padding: '0.75rem 1.2rem', borderRadius: '0.75rem', border: '1px solid #ddd', background: 'white', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}
                >
                    <ChevronLeft size={18} /> 이전
                </button>

                {!isLast ? (
                    <button
                        onClick={() => go(1)}
                        className="btn-primary"
                        style={{ padding: '0.75rem 1.6rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, fontSize: '1.05rem' }}
                    >
                        다음 <ChevronRight size={18} />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        style={{ padding: '0.75rem 1.8rem', borderRadius: '0.75rem', border: 'none', background: '#059669', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: isSubmitting ? 0.7 : 1 }}
                    >
                        <Send size={18} /> {isSubmitting ? '제출 중...' : '제출하기'}
                    </button>
                )}

                <span style={{ marginLeft: 'auto', color: 'var(--text-sub)', fontSize: '0.9rem' }}>
                    제출하면 고칠 수 없어요
                </span>
            </div>
        </div>
    );
};

export default ResearchAssessment;
