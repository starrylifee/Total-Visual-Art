import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/gemini.js';
import { studentAuthService } from '../services/studentAuthService';
import { getMasterpiece } from '../data/masterpieces';
import { Sparkles, CheckCircle, Pencil, Loader } from 'lucide-react';

/**
 * 모듈 1: 1차 감상 → AI 비계 질문 → 2차 감상 (학생)
 * 진행 상태는 서버(deepAppreciations/{sno})에 저장되어 재입장해도 이어진다.
 */
const DeepAppreciation = ({ session, showToast }) => {
    const masterpiece = getMasterpiece(session.masterpieceId);
    const rubric = session.rubric || [];

    const [step, setStep] = useState('loading'); // loading | first | second | done
    const [firstText, setFirstText] = useState('');
    const [questions, setQuestions] = useState([]);
    const [secondText, setSecondText] = useState('');
    const [isWorking, setIsWorking] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const saved = await studentAuthService.getDeepAppreciation();
                if (saved?.status === 'second_done') {
                    setFirstText(saved.firstText); setQuestions(saved.questions); setSecondText(saved.secondText);
                    setStep('done');
                } else if (saved?.status === 'first_done') {
                    setFirstText(saved.firstText); setQuestions(saved.questions);
                    setStep('second');
                } else {
                    setStep('first');
                }
            } catch (e) {
                console.error('감상 복원 실패:', e);
                setStep('first');
            }
        })();
    }, []);

    // 1차 감상 제출 → AI 질문 생성 → 저장
    const handleFirstSubmit = async () => {
        if (firstText.trim().length < 10) {
            showToast('감상을 조금 더 자세히 적어 주세요! (10자 이상)', 'error');
            return;
        }
        setIsWorking(true);
        try {
            const qs = await geminiService.scaffoldQuestions(firstText.trim(), rubric, masterpiece);
            await studentAuthService.saveDeepFirst(firstText.trim(), qs);
            setQuestions(qs);
            setStep('second');
            showToast('✅ 1차 감상 완료! AI 질문을 읽어 보세요.', 'success');
        } catch (e) {
            showToast('오류: ' + e.message, 'error');
        } finally {
            setIsWorking(false);
        }
    };

    const handleSecondSubmit = async () => {
        if (secondText.trim().length < 10) {
            showToast('2차 감상을 조금 더 자세히 적어 주세요! (10자 이상)', 'error');
            return;
        }
        setIsWorking(true);
        try {
            await studentAuthService.saveDeepSecond(secondText.trim());
            setStep('done');
            showToast('🎉 감상 완성! 정말 잘했어요!', 'success');
        } catch (e) {
            showToast('오류: ' + e.message, 'error');
        } finally {
            setIsWorking(false);
        }
    };

    if (step === 'loading') {
        return <p style={{ color: 'var(--text-sub)' }}><Loader size={16} style={{ animation: 'spin 1s linear infinite', verticalAlign: '-3px' }} /> 내 감상을 불러오는 중...</p>;
    }

    const stepBadge = (n, label, active, doneStep) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: active || doneStep ? 1 : 0.4 }}>
            <span style={{
                width: '1.8rem', height: '1.8rem', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: doneStep ? '#10b981' : active ? 'var(--primary)' : '#cbd5e1', color: 'white', fontWeight: 700
            }}>{doneStep ? '✓' : n}</span>
            <span style={{ fontWeight: 600 }}>{label}</span>
        </div>
    );

    return (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {/* 왼쪽: 작품 + 감상 약속 */}
            <div style={{ flex: '1 1 320px', minWidth: '280px' }}>
                {session.referenceImageUrl ? (
                    <>
                        <img src={session.referenceImageUrl} alt="감상 작품" style={{ width: '100%', borderRadius: '1rem', boxShadow: 'var(--shadow)', maxHeight: '420px', objectFit: 'contain', background: '#f1f5f9' }} />
                        {masterpiece && (
                            <p style={{ margin: '0.5rem 0 0', fontSize: '1rem', color: 'var(--text-sub)' }}>
                                <strong style={{ color: 'var(--text-main)' }}>{masterpiece.title}</strong>
                                {' · '}{masterpiece.artist} ({masterpiece.year}) · {masterpiece.style}
                            </p>
                        )}
                    </>
                ) : (
                    <p style={{ color: 'var(--text-sub)' }}>이 활동에 감상 작품이 설정되지 않았어요. 선생님께 알려 주세요.</p>
                )}
                {rubric.length > 0 && (
                    <div style={{ background: '#eef2ff', border: '2px solid var(--primary)', borderRadius: '1rem', padding: '1rem 1.25rem', marginTop: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.5rem' }}>📋 우리 반 감상 약속</h4>
                        <ol style={{ margin: 0, paddingLeft: '1.3rem', lineHeight: 1.7 }}>
                            {rubric.map((r, i) => <li key={i}>{r}</li>)}
                        </ol>
                    </div>
                )}
            </div>

            {/* 오른쪽: 감상 흐름 */}
            <div style={{ flex: '1.4 1 400px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    {stepBadge(1, '1차 감상', step === 'first', step === 'second' || step === 'done')}
                    {stepBadge(2, 'AI 질문', step === 'second', step === 'done')}
                    {stepBadge(3, '2차 감상', step === 'second', step === 'done')}
                </div>

                {step === 'first' && (
                    <div>
                        <h3 style={{ margin: '0 0 0.5rem' }}>✏️ 1차 감상: 처음 본 느낌을 자유롭게!</h3>
                        <p style={{ color: 'var(--text-sub)', margin: '0 0 0.75rem' }}>작품을 천천히 보고, 보이는 것과 느낀 것을 마음껏 적어 보세요.</p>
                        <textarea
                            value={firstText}
                            onChange={e => setFirstText(e.target.value)}
                            autoFocus
                            placeholder="나는 이 작품에서 ...이 보인다. 그리고 ...한 느낌이 든다."
                            style={{ width: '100%', height: '220px', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd', fontSize: '1.1rem', lineHeight: 1.6 }}
                        />
                        <button onClick={handleFirstSubmit} disabled={isWorking} className="btn-primary" style={{ marginTop: '0.75rem', padding: '0.9rem 2rem', fontSize: '1.05rem', opacity: isWorking ? 0.7 : 1 }}>
                            {isWorking ? '🤖 AI가 질문을 만드는 중...' : '✅ 다 썼어요! AI 질문 받기'}
                        </button>
                    </div>
                )}

                {step === 'second' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '1rem' }}>
                            <h4 style={{ margin: '0 0 0.4rem', color: 'var(--text-sub)' }}>내가 쓴 1차 감상</h4>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{firstText}</p>
                        </div>
                        <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
                            <h3 style={{ margin: '0 0 0.5rem' }}><Sparkles size={18} style={{ verticalAlign: '-3px' }} /> AI 선생님의 질문</h3>
                            <ol style={{ margin: 0, paddingLeft: '1.3rem', fontSize: '1.1rem', lineHeight: 1.9 }}>
                                {questions.map((q, i) => <li key={i}>{q}</li>)}
                            </ol>
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 0.5rem' }}>✍️ 2차 감상: 질문에 답하며 더 깊게!</h3>
                            <textarea
                                value={secondText}
                                onChange={e => setSecondText(e.target.value)}
                                autoFocus
                                placeholder="질문을 읽고 다시 작품을 본 뒤, 나의 생각을 더 자세히 적어 보세요."
                                style={{ width: '100%', height: '220px', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd', fontSize: '1.1rem', lineHeight: 1.6 }}
                            />
                            <button onClick={handleSecondSubmit} disabled={isWorking} className="btn-primary" style={{ marginTop: '0.75rem', padding: '0.9rem 2rem', fontSize: '1.05rem', opacity: isWorking ? 0.7 : 1 }}>
                                {isWorking ? '저장 중...' : '🎉 감상 완성하기'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'done' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontWeight: 700, fontSize: '1.2rem' }}>
                            <CheckCircle size={24} /> 감상 완성! 1차와 2차를 비교해 보세요.
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 250px', background: '#f8fafc', borderRadius: '0.75rem', padding: '1rem' }}>
                                <h4 style={{ margin: '0 0 0.4rem' }}>1️⃣ 처음 감상</h4>
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{firstText}</p>
                            </div>
                            <div style={{ flex: '1 1 250px', background: '#ecfdf5', border: '2px solid #10b981', borderRadius: '0.75rem', padding: '1rem' }}>
                                <h4 style={{ margin: '0 0 0.4rem' }}>2️⃣ 깊어진 감상</h4>
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{secondText}</p>
                            </div>
                        </div>
                        <div style={{ background: '#fef3c7', borderRadius: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.95rem' }}>
                            <strong>AI 질문:</strong> {questions.join(' ')}
                        </div>
                        <button onClick={() => setStep('second')} style={{ alignSelf: 'flex-start', padding: '0.6rem 1.2rem', borderRadius: '2rem', border: '1px solid var(--primary)', background: 'white', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                            <Pencil size={14} style={{ verticalAlign: '-2px' }} /> 2차 감상 고치기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeepAppreciation;
