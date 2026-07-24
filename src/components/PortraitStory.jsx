import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/gemini.js';
import { studentAuthService } from '../services/studentAuthService';
import MediaEmbed from './MediaEmbed';
import { Loader, Sparkles, Send, Film, CheckCircle } from 'lucide-react';

const POLL_MS = 15000;

/**
 * 모듈 3: 인물의 하루 (학생)
 * 인물 사진 관찰(감정·상황·의상) → '평범한 하루' 영상 프롬프트 작성 → AI 코멘트 비계 → 제출
 * 영상은 앱이 만들지 않는다 — 선생님이 프롬프트로 영상을 만들어 URL을 등록하면 여기서 감상 (AI 오퍼레이터 방식)
 */
const PortraitStory = ({ session, showToast }) => {
    const [data, setData] = useState(null);
    const [loaded, setLoaded] = useState(false);

    const [feelings, setFeelings] = useState('');
    const [situation, setSituation] = useState('');
    const [clothes, setClothes] = useState('');
    const [promptDraft, setPromptDraft] = useState('');
    const [coach, setCoach] = useState(null); // { good, tips }
    const [isWorking, setIsWorking] = useState(false);
    const [isCoaching, setIsCoaching] = useState(false);

    useEffect(() => {
        let timer;
        (async () => {
            try {
                const saved = await studentAuthService.getPortrait();
                if (saved) {
                    setData(saved);
                    setFeelings(saved.feelings); setSituation(saved.situation); setClothes(saved.clothes);
                    setPromptDraft(saved.prompt);
                } else {
                    setData({});
                }
            } catch (e) {
                console.error('인물의 하루 로드 실패:', e);
                setData({});
            } finally {
                setLoaded(true);
            }
        })();
        // 제출 후 영상 URL 등록을 기다리는 동안만 폴링
        timer = setInterval(async () => {
            try {
                const saved = await studentAuthService.getPortrait();
                if (saved?.status === 'submitted') setData(prev => ({ ...prev, ...saved }));
            } catch { /* 폴링 실패는 무시 */ }
        }, POLL_MS);
        return () => clearInterval(timer);
    }, []);

    if (!loaded || data === null) {
        return <p style={{ color: 'var(--text-sub)' }}><Loader size={16} style={{ animation: 'spin 1s linear infinite', verticalAlign: '-3px' }} /> 불러오는 중...</p>;
    }
    if (!session.portraitImageUrl) {
        return <p style={{ color: 'var(--text-sub)' }}>이 활동에 인물 사진이 설정되지 않았어요. 선생님께 알려 주세요.</p>;
    }

    const observationDone = data.feelings && data.situation && data.clothes;
    const submitted = data.status === 'submitted';

    const handleSaveObservation = async () => {
        if (feelings.trim().length < 5 || situation.trim().length < 5 || clothes.trim().length < 5) {
            showToast('세 칸 모두 조금 더 자세히 적어 주세요!', 'error');
            return;
        }
        setIsWorking(true);
        try {
            const patch = { feelings: feelings.trim(), situation: situation.trim(), clothes: clothes.trim() };
            await studentAuthService.savePortrait(patch);
            setData({ ...data, ...patch });
            showToast('✅ 관찰 완료! 이제 이분의 하루를 상상해 볼까요?', 'success');
        } catch (e) {
            showToast('저장 오류: ' + e.message, 'error');
        } finally {
            setIsWorking(false);
        }
    };

    const handleCoach = async () => {
        if (promptDraft.trim().length < 10) {
            showToast('영상 설명을 조금 더 적어 주세요!', 'error');
            return;
        }
        setIsCoaching(true);
        try {
            const result = await geminiService.coachVideoPrompt(
                { feelings: data.feelings, situation: data.situation, clothes: data.clothes },
                promptDraft.trim(),
                session.portraitName
            );
            setCoach(result);
            await studentAuthService.savePortrait({ prompt: promptDraft.trim(), aiComment: `${result.good} / ${result.tips.join(' ')}` });
            setData({ ...data, prompt: promptDraft.trim() });
        } catch (e) {
            showToast('코멘트 오류: ' + e.message, 'error');
        } finally {
            setIsCoaching(false);
        }
    };

    const handleSubmit = async () => {
        if (promptDraft.trim().length < 20) {
            showToast('영상 설명을 20자 이상으로 완성해 주세요!', 'error');
            return;
        }
        setIsWorking(true);
        try {
            await studentAuthService.savePortrait({ prompt: promptDraft.trim(), submitted: true });
            setData({ ...data, prompt: promptDraft.trim(), status: 'submitted' });
            showToast('🎬 제출 완료! 선생님이 영상을 만들어 주실 거예요.', 'success');
        } catch (e) {
            showToast('제출 오류: ' + e.message, 'error');
        } finally {
            setIsWorking(false);
        }
    };

    const fieldStyle = { width: '100%', height: '90px', padding: '0.75rem', borderRadius: '0.6rem', border: '1px solid #ddd', fontSize: '1.05rem', lineHeight: 1.5 };

    return (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {/* 왼쪽: 인물 사진 */}
            <div style={{ flex: '1 1 300px', minWidth: '260px' }}>
                <img src={session.portraitImageUrl} alt={session.portraitName || '인물 사진'} style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '1rem', boxShadow: 'var(--shadow)', background: '#f1f5f9' }} />
                <h3 style={{ margin: '0.6rem 0 0.2rem' }}>{session.portraitName || '이 인물'}</h3>
                {session.portraitDesc && <p style={{ margin: 0, color: 'var(--text-sub)' }}>{session.portraitDesc}</p>}
            </div>

            {/* 오른쪽: 흐름 */}
            <div style={{ flex: '1.4 1 380px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {submitted ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontWeight: 700, fontSize: '1.15rem' }}>
                            <CheckCircle size={22} /> 영상 설명 제출 완료!
                        </div>
                        <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '1rem' }}>
                            <strong>내가 쓴 영상 설명</strong>
                            <p style={{ margin: '0.4rem 0 0', whiteSpace: 'pre-wrap' }}>{data.prompt}</p>
                        </div>
                        {data.videoUrl ? (
                            <div>
                                <h3 style={{ margin: '0 0 0.5rem' }}><Film size={18} style={{ verticalAlign: '-3px' }} /> 완성된 영상</h3>
                                <MediaEmbed url={data.videoUrl} height="320px" />
                            </div>
                        ) : (
                            <div style={{ background: '#fef3c7', borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'center' }}>
                                <p style={{ fontSize: '2rem', margin: 0 }}>🎬</p>
                                <p style={{ fontWeight: 600, margin: '0.4rem 0 0' }}>선생님이 내 설명으로 영상을 만들고 있어요.</p>
                                <p style={{ color: 'var(--text-sub)', margin: '0.2rem 0 0', fontSize: '0.9rem' }}>영상이 준비되면 여기에 나타나요.</p>
                            </div>
                        )}
                    </div>
                ) : !observationDone ? (
                    <div>
                        <h3 style={{ margin: '0 0 0.5rem' }}>🔎 1단계: 사진 속 인물 관찰하기</h3>
                        <p style={{ color: 'var(--text-sub)', margin: '0 0 0.75rem' }}>사진을 자세히 보고 세 가지를 적어 보세요.</p>
                        <label style={{ fontWeight: 600 }}>😊 표정과 감정 — 어떤 마음일까요?</label>
                        <textarea value={feelings} onChange={e => setFeelings(e.target.value)} style={{ ...fieldStyle, margin: '0.3rem 0 0.75rem' }} placeholder="표정이 ...해 보인다. 아마 ...한 마음일 것 같다." autoFocus />
                        <label style={{ fontWeight: 600 }}>🏞️ 상황과 배경 — 언제, 어디일까요?</label>
                        <textarea value={situation} onChange={e => setSituation(e.target.value)} style={{ ...fieldStyle, margin: '0.3rem 0 0.75rem' }} placeholder="뒤에 ...이 보인다. ...하던 중인 것 같다." />
                        <label style={{ fontWeight: 600 }}>👕 옷차림과 물건 — 무엇을 입고, 들고 있나요?</label>
                        <textarea value={clothes} onChange={e => setClothes(e.target.value)} style={{ ...fieldStyle, margin: '0.3rem 0 0.75rem' }} placeholder="...옷을 입고 있다. 손에는 ...이 있다." />
                        <button onClick={handleSaveObservation} disabled={isWorking} className="btn-primary" style={{ padding: '0.9rem 2rem', fontSize: '1.05rem', opacity: isWorking ? 0.7 : 1 }}>
                            ✅ 관찰 끝! 다음 단계로
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '0.9rem', fontSize: '0.95rem' }}>
                            <strong>내 관찰</strong> — 😊 {data.feelings} · 🏞️ {data.situation} · 👕 {data.clothes}
                        </div>
                        <h3 style={{ margin: 0 }}>🎬 2단계: '{session.portraitName || '이 인물'}'의 평범한 하루</h3>
                        <p style={{ color: 'var(--text-sub)', margin: 0 }}>
                            이분에게도 우리처럼 평범한 하루가 있었을 거예요. 관찰한 내용을 바탕으로,
                            그 하루의 한 장면을 영상으로 만든다면 어떤 모습일지 설명해 보세요.
                            <strong> 장소·시간·행동·표정</strong>이 들어가면 좋아요.
                        </p>
                        <textarea
                            value={promptDraft}
                            onChange={e => setPromptDraft(e.target.value)}
                            placeholder="예: 이른 아침, 한복을 입은 ○○○이 마당에서 ...을 하며 살짝 웃고 있다. 카메라는 ..."
                            style={{ width: '100%', height: '160px', padding: '1rem', borderRadius: '0.75rem', border: '2px solid var(--primary)', fontSize: '1.05rem', lineHeight: 1.6 }}
                        />
                        {coach && (
                            <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '0.75rem', padding: '0.9rem 1.1rem' }}>
                                <p style={{ margin: 0 }}>💚 {coach.good}</p>
                                <ol style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
                                    {coach.tips.map((t, i) => <li key={i}>{t}</li>)}
                                </ol>
                                <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: 'var(--text-sub)' }}>질문에 답하듯 설명을 고쳐 보세요. 코멘트는 여러 번 받을 수 있어요.</p>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <button onClick={handleCoach} disabled={isCoaching} style={{ padding: '0.75rem 1.4rem', borderRadius: '2rem', border: '1px solid var(--accent)', background: 'white', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, opacity: isCoaching ? 0.7 : 1 }}>
                                <Sparkles size={15} style={{ verticalAlign: '-2px' }} /> {isCoaching ? 'AI가 읽는 중...' : 'AI 코멘트 받기'}
                            </button>
                            <button onClick={handleSubmit} disabled={isWorking} className="btn-primary" style={{ padding: '0.75rem 1.6rem', fontSize: '1.02rem', opacity: isWorking ? 0.7 : 1 }}>
                                <Send size={15} style={{ verticalAlign: '-2px' }} /> 선생님께 제출하기
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PortraitStory;
