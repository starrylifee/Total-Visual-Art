import React, { useState, useEffect, useCallback } from 'react';
import { geminiService } from '../services/gemini.js';
import { studentAuthService } from '../services/studentAuthService';
import { getMasterpiece } from '../data/masterpieces';
import { Loader, Sparkles, Search, Send, Trophy } from 'lucide-react';

const POLL_MS = 10000;

// 관찰 글 → 이미지 생성 설명 변환 지시 (refine 액션 재사용)
const CONVERT_INSTRUCTION = `학생이 명화를 관찰하고 쓴 글입니다. 이 글을 이미지 생성 AI에게 줄 "그리기 설명"으로 바꿔 주세요.
- 학생이 관찰한 내용만 사용하고, 새로운 내용을 지어내지 마세요.
- 무엇이 어디에 있는지, 색과 모양을 구체적으로. 2~4문장의 한국어.
- 설명문만 출력하세요.`;

/**
 * 모듈 2: 복원 챌린지 (명화 똑같이 만들기)
 * 관찰 → 프롬프트 변환 → 이중 승인 생성 → 원본 비교(AI 다른 점 2가지) → 2차 도전 → 성찰
 */
const RestoreChallenge = ({ session, showToast }) => {
    const masterpiece = getMasterpiece(session.masterpieceId);

    const [rc, setRc] = useState(null);        // restoreChallenges 문서
    const [queueMap, setQueueMap] = useState({}); // queueId -> {status, imageUrl, rejectionReason}
    const [loaded, setLoaded] = useState(false);

    const [obsDraft, setObsDraft] = useState('');
    const [promptDraft, setPromptDraft] = useState('');
    const [reflectionDraft, setReflectionDraft] = useState('');
    const [isWorking, setIsWorking] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [isComparing, setIsComparing] = useState(false);

    const load = useCallback(async () => {
        try {
            const [data, items] = await Promise.all([
                studentAuthService.getRestore(),
                studentAuthService.listMyQueue(),
            ]);
            setRc(data || {});
            const map = {};
            items.forEach(it => { map[it.id] = it; });
            setQueueMap(map);
        } catch (e) {
            console.error('복원 챌린지 로드 실패:', e);
        } finally {
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(load, POLL_MS);
        return () => clearInterval(t);
    }, [load]);

    if (!loaded || rc === null) {
        return <p style={{ color: 'var(--text-sub)' }}><Loader size={16} style={{ animation: 'spin 1s linear infinite', verticalAlign: '-3px' }} /> 불러오는 중...</p>;
    }
    if (!session.referenceImageUrl) {
        return <p style={{ color: 'var(--text-sub)' }}>이 활동에 원본 작품이 설정되지 않았어요. 선생님께 알려 주세요.</p>;
    }

    const q1 = rc.queueId1 ? queueMap[rc.queueId1] : null;
    const q2 = rc.queueId2 ? queueMap[rc.queueId2] : null;

    // 현재 단계 (저장된 데이터에서 파생 — 재입장해도 이어짐)
    const step =
        !rc.observation1 ? 'observe1'
        : !rc.queueId1 || q1?.status === 'rejected' ? 'prompt1'
        : q1?.status !== 'published' ? 'wait1'
        : !rc.diff1 ? 'compare1'
        : !rc.queueId2 || q2?.status === 'rejected' ? 'challenge2'
        : q2?.status !== 'published' ? 'wait2'
        : !rc.reflection ? 'final'
        : 'done';

    const save = async (patch) => {
        await studentAuthService.saveRestore(patch);
        setRc({ ...rc, ...patch });
    };

    const handleObserve1 = async () => {
        if (obsDraft.trim().length < 20) {
            showToast('원본을 더 자세히 관찰해서 20자 이상 적어 주세요!', 'error');
            return;
        }
        setIsWorking(true);
        try {
            await save({ observation1: obsDraft.trim() });
            showToast('✅ 관찰 완료! 이제 AI에게 설명해 볼까요?', 'success');
        } catch (e) {
            showToast('저장 오류: ' + e.message, 'error');
        } finally {
            setIsWorking(false);
        }
    };

    const handleConvert = async (observation) => {
        setIsConverting(true);
        try {
            const converted = await geminiService.refineText(observation, CONVERT_INSTRUCTION);
            setPromptDraft(converted.trim());
        } catch (e) {
            showToast('변환 오류: ' + e.message, 'error');
        } finally {
            setIsConverting(false);
        }
    };

    const handleSubmitRound = async (round) => {
        if (promptDraft.trim().length < 10) {
            showToast('그리기 설명을 조금 더 적어 주세요!', 'error');
            return;
        }
        setIsWorking(true);
        try {
            const { id } = await studentAuthService.submitPrompt(promptDraft.trim(), { kind: 'restore', round });
            await save(round === 1
                ? { prompt1: promptDraft.trim(), queueId1: id }
                : { prompt2: promptDraft.trim(), queueId2: id });
            setPromptDraft('');
            showToast('🚀 승인 요청 완료! 선생님이 확인하면 그림이 만들어져요.', 'success');
            load();
        } catch (e) {
            showToast('제출 오류: ' + e.message, 'error');
        } finally {
            setIsWorking(false);
        }
    };

    const handleCompare = async () => {
        setIsComparing(true);
        try {
            const { differences, praise } = await geminiService.compareRestore(rc.queueId1);
            await save({ diff1: differences, praise: praise || '' });
            showToast('🔍 AI가 다른 점을 찾았어요!', 'success');
        } catch (e) {
            showToast('비교 오류: ' + e.message, 'error');
        } finally {
            setIsComparing(false);
        }
    };

    const handleReflection = async () => {
        if (reflectionDraft.trim().length < 10) {
            showToast('배운 점을 조금 더 적어 주세요!', 'error');
            return;
        }
        setIsWorking(true);
        try {
            await save({ reflection: reflectionDraft.trim() });
            showToast('🏆 복원 챌린지 완주! 대단해요!', 'success');
        } catch (e) {
            showToast('저장 오류: ' + e.message, 'error');
        } finally {
            setIsWorking(false);
        }
    };

    // 공통: 원본 카드
    const OriginalCard = ({ small }) => (
        <div style={{ flex: small ? '1 1 200px' : '1 1 300px', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 0.5rem' }}>📌 원본 작품</h4>
            <img src={session.referenceImageUrl} alt="원본" style={{ maxWidth: '100%', maxHeight: small ? '260px' : '400px', borderRadius: '0.75rem', border: '3px solid var(--primary)', objectFit: 'contain', background: '#f1f5f9' }} />
            {masterpiece && <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: 'var(--text-sub)' }}>{masterpiece.title} · {masterpiece.artist}</p>}
        </div>
    );

    const waitCard = (q, round) => (
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8fafc', borderRadius: '1rem', padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '2.5rem', margin: 0 }}>{q?.status === 'pending_approval' ? '⏳' : '🎨'}</p>
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                {q?.status === 'pending_approval' ? '선생님이 확인하는 중이에요' : 'AI가 그림을 만드는 중이에요'}
            </p>
            <p style={{ color: 'var(--text-sub)', margin: 0 }}>{round}차 도전 · 화면은 10초마다 자동으로 새로고침돼요.</p>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* 진행 표시 */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                {['🔎 관찰', '✍️ AI에게 설명', '🖼️ 1차 그림', '🔍 비교', '💪 2차 도전', '🏆 완성'].map((label, i) => {
                    const idx = ['observe1', 'prompt1', 'wait1', 'compare1', 'challenge2', 'done'].indexOf(step);
                    const stepIdx = step === 'wait2' || step === 'final' ? 4 : idx;
                    const active = i <= (stepIdx === -1 ? 5 : stepIdx);
                    return (
                        <span key={label} style={{ padding: '0.35rem 0.8rem', borderRadius: '2rem', background: active ? 'var(--primary)' : '#e2e8f0', color: active ? 'white' : 'var(--text-sub)', fontWeight: 600 }}>
                            {label}
                        </span>
                    );
                })}
            </div>

            {step === 'observe1' && (
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <OriginalCard />
                    <div style={{ flex: '1.2 1 320px' }}>
                        <h3 style={{ margin: '0 0 0.5rem' }}><Search size={18} style={{ verticalAlign: '-3px' }} /> 1단계: 탐정처럼 관찰하기</h3>
                        <p style={{ color: 'var(--text-sub)' }}>이 그림을 AI가 똑같이 그리려면 무엇을 알아야 할까요? <strong>무엇이 어디에 있는지, 무슨 색인지, 어떤 모양인지</strong> 자세히 적어 보세요.</p>
                        <textarea
                            value={obsDraft}
                            onChange={e => setObsDraft(e.target.value)}
                            autoFocus
                            placeholder="예: 그림 가운데에는 ...이 있고, 색은 ...이다. 왼쪽에는..."
                            style={{ width: '100%', height: '240px', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd', fontSize: '1.1rem', lineHeight: 1.6 }}
                        />
                        <button onClick={handleObserve1} disabled={isWorking} className="btn-primary" style={{ marginTop: '0.75rem', padding: '0.9rem 2rem', fontSize: '1.05rem', opacity: isWorking ? 0.7 : 1 }}>
                            ✅ 관찰 끝! 다음 단계로
                        </button>
                    </div>
                </div>
            )}

            {(step === 'prompt1' || step === 'challenge2') && (() => {
                const round = step === 'prompt1' ? 1 : 2;
                const rejected = round === 1 ? q1?.status === 'rejected' : q2?.status === 'rejected';
                const baseObservation = round === 1 ? rc.observation1 : (rc.observation2 || rc.observation1);
                return (
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        <OriginalCard small />
                        <div style={{ flex: '1.4 1 340px' }}>
                            {round === 2 && (
                                <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '0.75rem', padding: '0.9rem 1.1rem', marginBottom: '0.9rem' }}>
                                    <strong>🔍 AI가 찾은 다른 점</strong>
                                    <ol style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
                                        {(rc.diff1 || []).map((d, i) => <li key={i}>{d}</li>)}
                                    </ol>
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--text-sub)' }}>이 단서를 설명에 추가해서 다시 도전해 보세요!</p>
                                </div>
                            )}
                            {rejected && (
                                <p style={{ color: '#dc2626', fontWeight: 600 }}>❌ 지난 요청이 거절됐어요{(round === 1 ? q1 : q2)?.rejectionReason ? ` (${(round === 1 ? q1 : q2).rejectionReason})` : ''}. 설명을 고쳐서 다시 요청해 주세요.</p>
                            )}
                            <h3 style={{ margin: '0 0 0.5rem' }}>✍️ {round}차: AI에게 그리기 설명하기</h3>
                            <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '0.9rem', marginBottom: '0.75rem' }}>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-sub)' }}>내 관찰 글</strong>
                                {round === 2 ? (
                                    <textarea
                                        value={rc.observation2 !== undefined && rc.observation2 !== '' ? rc.observation2 : (obsDraft || rc.observation1)}
                                        onChange={e => { setObsDraft(e.target.value); setRc({ ...rc, observation2: e.target.value }); }}
                                        style={{ width: '100%', height: '120px', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd', marginTop: '0.4rem', fontSize: '1rem' }}
                                    />
                                ) : (
                                    <p style={{ margin: '0.3rem 0 0', whiteSpace: 'pre-wrap' }}>{baseObservation}</p>
                                )}
                            </div>
                            <button onClick={() => handleConvert(round === 2 ? (rc.observation2 || rc.observation1) : rc.observation1)} disabled={isConverting}
                                style={{ padding: '0.6rem 1.2rem', borderRadius: '2rem', border: '1px solid var(--accent)', background: 'white', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, marginBottom: '0.75rem', opacity: isConverting ? 0.7 : 1 }}>
                                <Sparkles size={14} style={{ verticalAlign: '-2px' }} /> {isConverting ? '변환 중...' : '내 관찰 글을 그리기 설명으로 바꾸기'}
                            </button>
                            <textarea
                                value={promptDraft}
                                onChange={e => setPromptDraft(e.target.value)}
                                placeholder="AI에게 줄 그리기 설명. 위 버튼으로 자동 변환한 뒤 고쳐도 좋아요."
                                style={{ width: '100%', height: '140px', padding: '1rem', borderRadius: '0.75rem', border: '2px solid var(--primary)', fontSize: '1.05rem', lineHeight: 1.6 }}
                            />
                            <button onClick={() => handleSubmitRound(round)} disabled={isWorking} className="btn-primary" style={{ marginTop: '0.75rem', padding: '0.9rem 2rem', fontSize: '1.05rem', opacity: isWorking ? 0.7 : 1 }}>
                                <Send size={16} style={{ verticalAlign: '-2px' }} /> 선생님께 승인 요청하기
                            </button>
                        </div>
                    </div>
                );
            })()}

            {(step === 'wait1' || step === 'wait2') && (
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <OriginalCard small />
                    {waitCard(step === 'wait1' ? q1 : q2, step === 'wait1' ? 1 : 2)}
                </div>
            )}

            {step === 'compare1' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: 0 }}>🔍 원본과 내 1차 작품, 얼마나 닮았나요?</h3>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <OriginalCard small />
                        <div style={{ flex: '1 1 200px', textAlign: 'center' }}>
                            <h4 style={{ margin: '0 0 0.5rem' }}>🎨 내 1차 작품</h4>
                            <img src={q1.imageUrl} alt="1차 작품" style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '0.75rem', border: '3px solid var(--accent)' }} />
                        </div>
                    </div>
                    <button onClick={handleCompare} disabled={isComparing} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '0.9rem 2rem', fontSize: '1.05rem', opacity: isComparing ? 0.7 : 1 }}>
                        {isComparing ? '🤖 AI가 비교하는 중...' : '🤖 AI야, 다른 점을 알려줘!'}
                    </button>
                </div>
            )}

            {(step === 'final' || step === 'done') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: 0 }}><Trophy size={20} style={{ verticalAlign: '-3px', color: '#f59e0b' }} /> 나의 복원 챌린지 결과</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 180px', textAlign: 'center' }}>
                            <h4 style={{ margin: '0 0 0.4rem' }}>1️⃣ 1차 도전</h4>
                            <img src={q1?.imageUrl} alt="1차" style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '0.75rem', border: '2px solid #cbd5e1' }} />
                        </div>
                        <div style={{ flex: '1 1 180px', textAlign: 'center' }}>
                            <h4 style={{ margin: '0 0 0.4rem' }}>2️⃣ 2차 도전</h4>
                            <img src={q2?.imageUrl} alt="2차" style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '0.75rem', border: '3px solid #10b981' }} />
                        </div>
                        <OriginalCard small />
                    </div>
                    {rc.praise && (
                        <p style={{ background: '#ecfdf5', borderRadius: '0.75rem', padding: '0.75rem 1rem', margin: 0 }}>💚 <strong>AI 칭찬:</strong> {rc.praise}</p>
                    )}
                    {step === 'final' ? (
                        <div>
                            <h4 style={{ margin: '0 0 0.4rem' }}>📝 마지막: 무엇을 새로 발견했나요?</h4>
                            <textarea
                                value={reflectionDraft}
                                onChange={e => setReflectionDraft(e.target.value)}
                                autoFocus
                                placeholder="1차보다 2차가 어떻게 달라졌나요? 자세히 관찰하니 무엇이 새로 보였나요?"
                                style={{ width: '100%', height: '140px', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd', fontSize: '1.05rem' }}
                            />
                            <button onClick={handleReflection} disabled={isWorking} className="btn-primary" style={{ marginTop: '0.6rem', padding: '0.9rem 2rem', fontSize: '1.05rem', opacity: isWorking ? 0.7 : 1 }}>
                                🏆 챌린지 완주하기
                            </button>
                        </div>
                    ) : (
                        <div style={{ background: '#eef2ff', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
                            <strong>🏆 완주!</strong>
                            <p style={{ margin: '0.4rem 0 0', whiteSpace: 'pre-wrap' }}>{rc.reflection}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RestoreChallenge;
