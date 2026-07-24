import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/gemini.js';
import { studentAuthService } from '../services/studentAuthService';
import MediaEmbed from './MediaEmbed';
import { Loader, Sparkles, Send, Film, CheckCircle, Plus, Trash2 } from 'lucide-react';

const POLL_MS = 15000;

/**
 * 모듈 4: 스토리보드 스튜디오 (학생)
 * 친구 작품 갤러리에서 선택 → 한 줄 감상 → 3~4컷 스토리보드 → AI 다듬기 → 영상 프롬프트 제출
 * 제출은 videoPrompts/{sno}_sb — 교사 오퍼레이터 보드가 그대로 처리한다
 */
const StoryboardStudio = ({ session, showToast }) => {
    const [data, setData] = useState(null);
    const [gallery, setGallery] = useState([]);
    const [loaded, setLoaded] = useState(false);

    const [appreciationDraft, setAppreciationDraft] = useState('');
    const [cuts, setCuts] = useState(['', '', '']);
    const [promptDraft, setPromptDraft] = useState('');
    const [tip, setTip] = useState('');
    const [isWorking, setIsWorking] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [saved, items] = await Promise.all([
                    studentAuthService.getStoryboard(),
                    studentAuthService.listGallery(),
                ]);
                setGallery(items);
                if (saved) {
                    setData(saved);
                    setAppreciationDraft(saved.appreciation);
                    if (saved.cuts?.length >= 3) setCuts(saved.cuts);
                    setPromptDraft(saved.prompt);
                } else {
                    setData({});
                }
            } catch (e) {
                console.error('스토리보드 로드 실패:', e);
                setData({});
            } finally {
                setLoaded(true);
            }
        })();
        const timer = setInterval(async () => {
            try {
                const saved = await studentAuthService.getStoryboard();
                if (saved?.status === 'submitted') setData(prev => ({ ...prev, ...saved }));
            } catch { /* 폴링 실패는 무시 */ }
        }, POLL_MS);
        return () => clearInterval(timer);
    }, []);

    if (!loaded || data === null) {
        return <p style={{ color: 'var(--text-sub)' }}><Loader size={16} style={{ animation: 'spin 1s linear infinite', verticalAlign: '-3px' }} /> 불러오는 중...</p>;
    }

    const chosen = gallery.find(g => g.id === data.chosenQueueId);
    const submitted = data.status === 'submitted';

    const handleChoose = async (item) => {
        if (appreciationDraft.trim().length < 5) {
            showToast('먼저 아래에 이 작품의 마음에 드는 점을 적고 골라 주세요!', 'error');
            return;
        }
        setIsWorking(true);
        try {
            const patch = { chosenQueueId: item.id, appreciation: appreciationDraft.trim() };
            await studentAuthService.saveStoryboard(patch);
            setData({ ...data, ...patch });
            showToast(`✅ ${item.studentName} 작품 선택! 이제 스토리보드를 짜 볼까요?`, 'success');
        } catch (e) {
            showToast('저장 오류: ' + e.message, 'error');
        } finally {
            setIsWorking(false);
        }
    };

    const handlePolish = async () => {
        const filled = cuts.map(c => c.trim());
        if (filled.filter(c => c.length >= 5).length < 3) {
            showToast('컷을 3개 이상, 각각 조금 더 자세히 채워 주세요!', 'error');
            return;
        }
        setIsPolishing(true);
        try {
            await studentAuthService.saveStoryboard({ cuts: filled });
            const result = await geminiService.polishStoryboard(filled, data.appreciation);
            setPromptDraft(result.prompt);
            setTip(result.tip);
            setData({ ...data, cuts: filled });
            showToast('✨ AI가 영상 설명으로 다듬었어요! 읽고 고쳐 보세요.', 'success');
        } catch (e) {
            showToast('다듬기 오류: ' + e.message, 'error');
        } finally {
            setIsPolishing(false);
        }
    };

    const handleSubmit = async () => {
        if (promptDraft.trim().length < 20) {
            showToast('영상 설명을 20자 이상으로 완성해 주세요!', 'error');
            return;
        }
        setIsWorking(true);
        try {
            await studentAuthService.saveStoryboard({ prompt: promptDraft.trim(), cuts: cuts.map(c => c.trim()), submitted: true });
            setData({ ...data, prompt: promptDraft.trim(), status: 'submitted' });
            showToast('🎬 제출 완료! 선생님이 영상을 만들어 주실 거예요.', 'success');
        } catch (e) {
            showToast('제출 오류: ' + e.message, 'error');
        } finally {
            setIsWorking(false);
        }
    };

    // 제출 후 화면
    if (submitted) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '760px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontWeight: 700, fontSize: '1.15rem' }}>
                    <CheckCircle size={22} /> 스토리보드 제출 완료!
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {chosen && (
                        <div style={{ flex: '0 1 220px', textAlign: 'center' }}>
                            <img src={chosen.imageUrl} alt="선택한 작품" style={{ width: '100%', borderRadius: '0.75rem', border: '2px solid var(--primary)' }} />
                            <p style={{ margin: '0.3rem 0 0', fontSize: '0.9rem', color: 'var(--text-sub)' }}>{chosen.studentName} 작품</p>
                        </div>
                    )}
                    <div style={{ flex: '1 1 300px', background: '#f8fafc', borderRadius: '0.75rem', padding: '1rem' }}>
                        <strong>내 영상 설명</strong>
                        <p style={{ margin: '0.4rem 0 0', whiteSpace: 'pre-wrap' }}>{data.prompt}</p>
                    </div>
                </div>
                {data.videoUrl ? (
                    <div>
                        <h3 style={{ margin: '0 0 0.5rem' }}><Film size={18} style={{ verticalAlign: '-3px' }} /> 완성된 영상</h3>
                        <MediaEmbed url={data.videoUrl} height="320px" />
                    </div>
                ) : (
                    <div style={{ background: '#fef3c7', borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '2rem', margin: 0 }}>🎬</p>
                        <p style={{ fontWeight: 600, margin: '0.4rem 0 0' }}>선생님이 내 스토리보드로 영상을 만들고 있어요.</p>
                    </div>
                )}
            </div>
        );
    }

    // 1) 작품 선택 화면
    if (!data.chosenQueueId) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: 0 }}>🖼️ 1단계: 친구 작품 고르기</h3>
                {gallery.length === 0 ? (
                    <p style={{ color: 'var(--text-sub)' }}>아직 공개된 작품이 없어요. 친구들의 작품이 공개되면 여기에 나타나요.</p>
                ) : (
                    <>
                        <p style={{ color: 'var(--text-sub)', margin: 0 }}>영상으로 만들고 싶은 작품을 고르고, 마음에 드는 점을 한 줄 적어 주세요.</p>
                        <input
                            value={appreciationDraft}
                            onChange={e => setAppreciationDraft(e.target.value)}
                            placeholder="이 작품이 마음에 드는 점: (예: 색이 알록달록해서 신나는 느낌이라서)"
                            autoFocus
                            style={{ padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '2px solid var(--primary)', fontSize: '1.05rem' }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                            {gallery.map(item => (
                                <button key={item.id} onClick={() => handleChoose(item)} disabled={isWorking}
                                    style={{ padding: 0, border: '1px solid #ddd', borderRadius: '0.75rem', overflow: 'hidden', cursor: 'pointer', background: 'white', textAlign: 'center' }}>
                                    <img src={item.imageUrl} alt={`${item.studentName} 작품`} loading="lazy" style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} />
                                    <div style={{ padding: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>{item.studentName}</div>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // 2) 스토리보드 편집 + 다듬기 + 제출
    return (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 1 260px', minWidth: '220px' }}>
                {chosen ? (
                    <>
                        <img src={chosen.imageUrl} alt="선택한 작품" style={{ width: '100%', borderRadius: '1rem', boxShadow: 'var(--shadow)' }} />
                        <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: 'var(--text-sub)' }}>{chosen.studentName} 작품</p>
                    </>
                ) : (
                    <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem' }}>선택한 작품을 불러오는 중이거나, 작품이 더 이상 공개 상태가 아니에요.</p>
                )}
                <div style={{ background: '#eef2ff', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginTop: '0.75rem', fontSize: '0.95rem' }}>
                    💬 <strong>내 감상:</strong> {data.appreciation}
                </div>
            </div>

            <div style={{ flex: '1.5 1 380px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <h3 style={{ margin: 0 }}>🎞️ 2단계: 3~4컷 스토리보드 짜기</h3>
                <p style={{ color: 'var(--text-sub)', margin: 0 }}>이 작품이 살아 움직인다면? 장면을 순서대로 적어 보세요. (컷마다 무엇이 어떻게 움직이는지)</p>
                {cuts.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: '3.2rem', paddingTop: '0.7rem' }}>컷 {i + 1}</span>
                        <textarea
                            value={c}
                            onChange={e => setCuts(cuts.map((x, idx) => (idx === i ? e.target.value : x)))}
                            placeholder={i === 0 ? '예: 그림 속 고양이가 천천히 눈을 뜬다' : '다음 장면...'}
                            style={{ flex: 1, height: '64px', padding: '0.6rem 0.8rem', borderRadius: '0.6rem', border: '1px solid #ddd', fontSize: '1.02rem', lineHeight: 1.5 }}
                        />
                        {cuts.length > 3 && (
                            <button onClick={() => setCuts(cuts.filter((_, idx) => idx !== i))} title="컷 삭제" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', paddingTop: '0.7rem' }}>
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                ))}
                {cuts.length < 4 && (
                    <button onClick={() => setCuts([...cuts, ''])} style={{ alignSelf: 'flex-start', padding: '0.45rem 1rem', borderRadius: '2rem', border: '1px dashed var(--primary)', background: 'white', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                        <Plus size={14} style={{ verticalAlign: '-2px' }} /> 컷 추가 (최대 4컷)
                    </button>
                )}

                <button onClick={handlePolish} disabled={isPolishing} style={{ alignSelf: 'flex-start', padding: '0.75rem 1.4rem', borderRadius: '2rem', border: '1px solid var(--accent)', background: 'white', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, opacity: isPolishing ? 0.7 : 1 }}>
                    <Sparkles size={15} style={{ verticalAlign: '-2px' }} /> {isPolishing ? 'AI가 다듬는 중...' : 'AI로 영상 설명 만들기'}
                </button>

                {(promptDraft || tip) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <h3 style={{ margin: 0 }}>🎬 3단계: 영상 설명 완성하기</h3>
                        {tip && <p style={{ margin: 0, background: '#fef3c7', borderRadius: '0.6rem', padding: '0.6rem 0.9rem' }}>💡 {tip}</p>}
                        <textarea
                            value={promptDraft}
                            onChange={e => setPromptDraft(e.target.value)}
                            style={{ width: '100%', height: '150px', padding: '1rem', borderRadius: '0.75rem', border: '2px solid var(--primary)', fontSize: '1.05rem', lineHeight: 1.6 }}
                        />
                        <button onClick={handleSubmit} disabled={isWorking} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '0.8rem 1.8rem', fontSize: '1.05rem', opacity: isWorking ? 0.7 : 1 }}>
                            <Send size={15} style={{ verticalAlign: '-2px' }} /> 선생님께 제출하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoryboardStudio;
