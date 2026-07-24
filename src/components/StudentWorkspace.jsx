import React, { useState, useEffect, useRef, useCallback } from 'react';
import { geminiService } from '../services/gemini.js';
import { studentAuthService } from '../services/studentAuthService';
import DeepAppreciation from './DeepAppreciation';
import RestoreChallenge from './RestoreChallenge';
import PortraitStory from './PortraitStory';
import StoryboardStudio from './StoryboardStudio';
import ArtworkReview from './ArtworkReview';
import { Image, MessageSquare, PenTool, Loader, Send, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);
    const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1';
    const Icon = type === 'success' ? CheckCircle : AlertCircle;
    return (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: bgColor, color: 'white', padding: '1rem 1.5rem', borderRadius: '0.75rem', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 9999 }}>
            <Icon size={20} />
            <span style={{ fontWeight: '500' }}>{message}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={16} /></button>
        </div>
    );
};

const QUEUE_POLL_MS = 10000;

// 학생 활동 화면 (토큰 기반). session = /api/student me 응답
const StudentWorkspace = ({ session }) => {
    const features = session.features || {};
    const firstTab = features.deepAppreciation ? 'deep'
        : features.portrait ? 'portrait'
        : features.storyboard ? 'storyboard'
        : features.artReview ? 'artreview'
        : features.imageGen ? 'creation'
        : features.vision ? 'vision'
        : features.appreciation ? 'appreciation'
        : features.chat ? 'chat' : 'text';
    const [activeTab, setActiveTab] = useState(firstTab);

    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'info') => setToast({ message, type });

    // AI 그림 만들기
    const [genPrompt, setGenPrompt] = useState('');
    const [myGenerations, setMyGenerations] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRefreshingQueue, setIsRefreshingQueue] = useState(false);

    // 작품 분석
    const [selectedImage, setSelectedImage] = useState(null);
    const [visionAnalysis, setVisionAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // 표현 도우미
    const [userCritique, setUserCritique] = useState('');
    const [refinedCritique, setRefinedCritique] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    // 챗봇
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatEndRef = useRef(null);

    const refreshQueue = useCallback(async (manual = false) => {
        if (manual) setIsRefreshingQueue(true);
        try {
            const items = await studentAuthService.listMyQueue();
            setMyGenerations(items);
        } catch (e) {
            console.error('큐 조회 실패:', e);
        } finally {
            if (manual) setIsRefreshingQueue(false);
        }
    }, []);

    // 내 생성 요청 목록: 입장 시 + 주기적으로 갱신 (실시간 구독 대신 폴링)
    useEffect(() => {
        if (!features.imageGen) return;
        refreshQueue();
        const timer = setInterval(refreshQueue, QUEUE_POLL_MS);
        return () => clearInterval(timer);
    }, [features.imageGen, refreshQueue]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSubmitPrompt = async () => {
        if (!genPrompt.trim()) {
            showToast("프롬프트를 입력해주세요!", "error");
            return;
        }
        const badWords = ['폭력', '위험', 'violence', 'kill'];
        if (badWords.some(word => genPrompt.toLowerCase().includes(word))) {
            showToast("⚠️ 적절하지 않은 내용이 포함되어 있어요.", "error");
            return;
        }
        setIsSubmitting(true);
        try {
            await studentAuthService.submitPrompt(genPrompt);
            setGenPrompt('');
            showToast("✅ 승인 요청 완료! 선생님이 확인할 거예요.", "success");
            refreshQueue();
        } catch (error) {
            showToast("오류: " + error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedImage(file);
        setIsAnalyzing(true);
        try {
            const analysis = await geminiService.analyzeImage(file, session.visionPrompt || '이 작품의 색상과 구도를 분석해주세요.');
            setVisionAnalysis(analysis);
        } catch (error) {
            setVisionAnalysis("이미지 분석 오류: " + error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCritiqueRefinement = async () => {
        if (!userCritique) return;
        setIsRefining(true);
        try {
            const result = await geminiService.refineText(userCritique, session.textPrompt || '더 시적으로 표현해주세요.');
            setRefinedCritique(result);
        } catch (error) {
            setRefinedCritique("오류: " + error.message);
        } finally {
            setIsRefining(false);
        }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim() || isChatLoading) return;
        const userMessage = { role: 'user', content: chatInput };
        setChatMessages(prev => [...prev, userMessage]);
        setChatInput('');
        setIsChatLoading(true);
        try {
            const history = chatMessages.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }));
            const response = await geminiService.chatWithPersona(
                history,
                chatInput,
                session.chatbotInstruction || '당신은 미술 수업을 도와주는 친절한 AI 선생님입니다. 학생들의 질문에 쉽고 재미있게 답변해주세요.'
            );
            setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: "죄송해요, 오류가 발생했어요: " + error.message }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>

            <div className="workspace-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {features.deepAppreciation && (
                    <button className={activeTab === 'deep' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('deep')}>
                        <PenTool size={16} /> 🖼️ 감상 쓰기
                    </button>
                )}
                {features.imageGen && (
                    <button className={activeTab === 'creation' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('creation')}>
                        <Image size={16} /> 🖌️ AI 그림 만들기
                    </button>
                )}
                {features.vision && (
                    <button className={activeTab === 'vision' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('vision')}>
                        <Image size={16} /> 👁️ 작품 분석
                    </button>
                )}
                {features.textHelp && (
                    <button className={activeTab === 'text' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('text')}>
                        <PenTool size={16} /> ✏️ 표현 도우미
                    </button>
                )}
                {features.chat && (
                    <button className={activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('chat')}>
                        <MessageSquare size={16} /> 💬 챗봇
                    </button>
                )}
                {features.appreciation && (
                    <button className={activeTab === 'appreciation' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('appreciation')}>
                        <Image size={16} /> 🧩 복원 챌린지
                    </button>
                )}
                {features.portrait && (
                    <button className={activeTab === 'portrait' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('portrait')}>
                        <Image size={16} /> 🎬 인물의 하루
                    </button>
                )}
                {features.storyboard && (
                    <button className={activeTab === 'storyboard' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('storyboard')}>
                        <Image size={16} /> 🎞️ 스토리보드
                    </button>
                )}
                {features.artReview && (
                    <button className={activeTab === 'artreview' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('artreview')}>
                        <Image size={16} /> 🖼️ 내 작품 평가
                    </button>
                )}
            </div>

            <div className="workspace-content" style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '2rem', background: '#fff', overflowY: 'auto' }}>

                {activeTab === 'deep' && (
                    <DeepAppreciation session={session} showToast={showToast} />
                )}

                {activeTab === 'creation' && (
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '280px' }}>
                            <h3>🎨 새 작품 만들기</h3>
                            <p>그리고 싶은 것을 설명해주세요. 선생님이 먼저 확인해요.</p>
                            <textarea
                                value={genPrompt}
                                onChange={(e) => setGenPrompt(e.target.value)}
                                style={{ width: '100%', height: '100px', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontSize: '1.05rem' }}
                                placeholder="하늘을 나는 자동차를 그리고 싶어요..."
                            />
                            <button onClick={handleSubmitPrompt} disabled={isSubmitting} className="btn-primary" style={{ marginTop: '1rem', width: '100%', opacity: isSubmitting ? 0.7 : 1 }}>
                                {isSubmitting ? '요청 중...' : '🚀 승인 요청하기'}
                            </button>
                        </div>
                        <div style={{ flex: 1, minWidth: '280px', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ margin: 0 }}>🖼️ 내 갤러리</h3>
                                <button onClick={() => refreshQueue(true)} title="새로고침" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                                    <RefreshCw size={18} style={isRefreshingQueue ? { animation: 'spin 1s linear infinite' } : undefined} />
                                </button>
                            </div>
                            {myGenerations.length === 0 ? (
                                <p style={{ color: 'var(--text-sub)' }}>아직 작품이 없어요. 위에서 승인 요청해보세요!</p>
                            ) : (
                                myGenerations.map(gen => (
                                    <div key={gen.id} style={{ marginBottom: '1rem', padding: '1rem', background: '#fff', border: gen.status === 'published' ? '2px solid #10b981' : '1px solid #ddd', borderRadius: '0.75rem' }}>
                                        <p><strong>📝</strong> {gen.prompt}</p>
                                        <p>
                                            <span style={{
                                                fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '0.25rem',
                                                background: gen.status === 'published' ? '#d1fae5' : gen.status === 'pending_approval' ? '#fef3c7' : '#fee2e2',
                                                color: gen.status === 'published' ? '#059669' : gen.status === 'pending_approval' ? '#d97706' : '#dc2626',
                                                fontSize: '0.85rem'
                                            }}>
                                                {gen.status === 'published' ? '✅ 완료!' : gen.status === 'pending_approval' ? '⏳ 대기중' : gen.status === 'approved' ? '🎨 생성중' : gen.status === 'generated' ? '🎨 생성중' : gen.status === 'rejected' ? '❌ 거절됨' : gen.status}
                                            </span>
                                        </p>
                                        {gen.status === 'published' && gen.imageUrl && (
                                            <img src={gen.imageUrl} alt="내 작품" style={{ width: '100%', maxWidth: '250px', borderRadius: '0.5rem', marginTop: '0.5rem' }} />
                                        )}
                                        {gen.status === 'rejected' && (
                                            <p style={{ color: 'red', marginTop: '0.5rem', fontSize: '0.85rem' }}>❌ {gen.rejectionReason || "적절하지 않음"}</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'vision' && (
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '280px' }}>
                            <h3>🖼️ 작품 업로드</h3>
                            <input type="file" accept="image/*" onChange={handleImageUpload} />
                            {selectedImage && (
                                <div style={{ marginTop: '1rem' }}>
                                    <img src={URL.createObjectURL(selectedImage)} alt="Upload" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '0.5rem' }} />
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: '280px', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                            <h3>🤖 AI 분석 결과</h3>
                            {isAnalyzing ? <p>🔍 분석 중...</p> : (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{visionAnalysis || '작품 사진을 올리면 AI가 분석해줘요.'}</div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'text' && (
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '280px' }}>
                            <h3>✏️ 내 생각 작성</h3>
                            <textarea
                                value={userCritique}
                                onChange={(e) => setUserCritique(e.target.value)}
                                style={{ width: '100%', height: '200px', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontSize: '1.05rem' }}
                                placeholder="이 작품을 보고 느낀 점을 적어보세요..."
                            />
                            <button className="btn-primary" onClick={handleCritiqueRefinement} style={{ marginTop: '1rem' }}>
                                ✨ 표현 다듬기
                            </button>
                        </div>
                        <div style={{ flex: 1, minWidth: '280px', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                            <h3>📝 표현 도우미</h3>
                            {isRefining ? <p>✨ 문장을 다듬는 중...</p> : (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{refinedCritique}</div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
                        <h3 style={{ margin: '0 0 1rem' }}>💬 AI 도우미와 대화하기</h3>
                        <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '0.75rem', padding: '1rem', overflowY: 'auto', background: '#f9f9f9', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {chatMessages.length === 0 && (
                                <div style={{ textAlign: 'center', color: 'var(--text-sub)', padding: '2rem' }}>
                                    <p style={{ fontSize: '2rem', margin: 0 }}>👋</p>
                                    <p>안녕! 궁금한 거 있으면 물어봐!</p>
                                </div>
                            )}
                            {chatMessages.map((msg, i) => (
                                <div key={i} style={{
                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    background: msg.role === 'user' ? 'var(--primary)' : '#fff',
                                    color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                                    padding: '0.75rem 1rem', borderRadius: '1rem', maxWidth: '80%', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}>
                                    {msg.content}
                                </div>
                            ))}
                            {isChatLoading && (
                                <div style={{ alignSelf: 'flex-start', background: '#fff', padding: '0.75rem 1rem', borderRadius: '1rem' }}>
                                    <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> 생각 중...
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                            <input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                placeholder="질문을 입력하세요..."
                                autoFocus
                                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '2rem', border: '2px solid var(--primary)', outline: 'none', fontSize: '1.05rem' }}
                            />
                            <button onClick={handleSendChat} disabled={isChatLoading} style={{ padding: '0.75rem 1.5rem', borderRadius: '2rem', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'appreciation' && (
                    <RestoreChallenge session={session} showToast={showToast} />
                )}

                {activeTab === 'portrait' && (
                    <PortraitStory session={session} showToast={showToast} />
                )}

                {activeTab === 'storyboard' && (
                    <StoryboardStudio session={session} showToast={showToast} />
                )}

                {activeTab === 'artreview' && (
                    <ArtworkReview session={session} showToast={showToast} />
                )}
            </div>
        </div>
    );
};

export default StudentWorkspace;
