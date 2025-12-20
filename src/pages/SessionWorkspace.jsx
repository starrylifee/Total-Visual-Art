import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { geminiService } from '../services/gemini.js';
import { imageGenService } from '../services/imageGenService';
import { generateAndUploadImage } from '../services/geminiImageService';
import { badgeService } from '../services/badgeService';
import { awardAchievement } from '../services/groundService';
import MediaEmbed from '../components/MediaEmbed';
import { useAuth } from '../context/AuthContext';
import { Image, MessageSquare, PenTool, Loader, Send, X, CheckCircle, AlertCircle, Video } from 'lucide-react';

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1';
    const Icon = type === 'success' ? CheckCircle : AlertCircle;

    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            background: bgColor,
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease'
        }}>
            <Icon size={20} />
            <span style={{ fontWeight: '500' }}>{message}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '0.5rem' }}>
                <X size={16} />
            </button>
        </div>
    );
};

const SessionWorkspace = () => {
    const { sessionId, classId } = useParams();
    const { currentUser, userRole } = useAuth();
    const [sessionData, setSessionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('creation');

    // Toast State
    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'info') => setToast({ message, type });

    // Feature 3 States
    const [selectedImage, setSelectedImage] = useState(null);
    const [visionAnalysis, setVisionAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const [userCritique, setUserCritique] = useState('');
    const [refinedCritique, setRefinedCritique] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    // Feature 1 States
    const [genPrompt, setGenPrompt] = useState('');
    const [myGenerations, setMyGenerations] = useState([]);
    const [teacherQueue, setTeacherQueue] = useState([]);
    const [generatingId, setGeneratingId] = useState(null);

    // Chatbot States
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatEndRef = useRef(null);

    // Appreciation States
    const [appreciationText, setAppreciationText] = useState('');
    const [isSavingAppreciation, setIsSavingAppreciation] = useState(false);

    // Fetch real session data from Firestore
    useEffect(() => {
        const fetchSession = async () => {
            if (!sessionId || !classId) {
                console.log("Missing sessionId or classId");
                setLoading(false);
                return;
            }

            try {
                const sessionRef = doc(db, 'classes', classId, 'sessions', sessionId);
                const sessionSnap = await getDoc(sessionRef);

                if (sessionSnap.exists()) {
                    const data = sessionSnap.data();
                    setSessionData({
                        id: sessionSnap.id,
                        title: data.title || '세션',
                        visionPrompt: data.visionPrompt || '이 작품의 색상과 구도를 분석해주세요.',
                        textPrompt: data.textPrompt || '더 시적으로 표현해주세요.',
                        chatbotInstruction: data.chatbotInstruction || '당신은 미술 수업을 도와주는 친절한 AI 선생님입니다. 학생들의 질문에 쉽고 재미있게 답변해주세요.',
                        referenceImageUrl: data.referenceImageUrl || '',
                        features: data.features || { imageGen: true, vision: false, chat: false, appreciation: false },
                        ...data
                    });

                    if (data.features?.imageGen) setActiveTab('creation');
                    else if (data.features?.vision) setActiveTab('vision');
                    else if (data.features?.appreciation) setActiveTab('appreciation');
                } else {
                    console.error("Session not found");
                    setSessionData({ title: '세션을 찾을 수 없습니다', features: {} });
                }
            } catch (e) {
                console.error("Error fetching session:", e);
                setSessionData({ title: '세션 로드 오류', features: {} });
            }
            setLoading(false);
        };

        fetchSession();
    }, [sessionId, classId]);

    // Subscribe to generation queue
    useEffect(() => {
        if (!sessionId || !classId) return;

        const unsubscribe = imageGenService.subscribeToQueue(classId, sessionId, (items) => {
            if (userRole === 'teacher') {
                setTeacherQueue(items);
            } else if (currentUser) {
                const mine = items.filter(i => i.studentId === currentUser.uid);
                setMyGenerations(mine);
            }
        });

        return () => unsubscribe();
    }, [sessionId, classId, currentUser, userRole]);

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSelectedImage(file);
        setIsAnalyzing(true);

        try {
            const analysis = await geminiService.analyzeImage(file, sessionData.visionPrompt);
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
            const result = await geminiService.refineText(userCritique, sessionData.textPrompt);
            setRefinedCritique(result);
        } catch (error) {
            setRefinedCritique("오류: " + error.message);
        } finally {
            setIsRefining(false);
        }
    };

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

        try {
            await imageGenService.submitPrompt(classId, sessionId, currentUser.uid, genPrompt, currentUser.displayName || '학생');
            setGenPrompt('');
            showToast("✅ 승인 요청 완료! 선생님이 확인할 거예요.", "success");
        } catch (error) {
            showToast("오류: " + error.message, "error");
        }
    };

    // Teacher Actions (no popups)
    const handleTeacherAction = async (genId, action, imageUrl = null, promptText = null) => {
        try {
            if (action === 'approve') {
                await imageGenService.approvePrompt(classId, sessionId, genId);
                showToast("✅ 승인 완료!", "success");
            } else if (action === 'reject') {
                await imageGenService.rejectPrompt(classId, sessionId, genId, "적절하지 않은 내용");
                showToast("❌ 거절 완료", "info");
            } else if (action === 'generate') {
                const finalUrl = imageUrl || `https://picsum.photos/seed/${genId}/512`;
                await imageGenService.completeGeneration(classId, sessionId, genId, finalUrl);
                showToast("🖼️ 이미지 URL 저장 완료!", "success");
            } else if (action === 'ai_generate') {
                setGeneratingId(genId);
                try {
                    const result = await generateAndUploadImage(promptText, classId, sessionId, genId);
                    if (result.success) {
                        // Save directly - for now use a base64 data url or placeholder
                        // In production, use Firebase Storage
                        await imageGenService.completeGeneration(classId, sessionId, genId, result.imageUrl);
                        showToast("🎨 AI 이미지 생성 완료!", "success");
                    } else {
                        showToast("❌ 이미지 생성 실패: " + result.error, "error");
                    }
                } finally {
                    setGeneratingId(null);
                }
            } else if (action === 'publish') {
                await imageGenService.publishImage(classId, sessionId, genId);
                showToast("📤 학생에게 공개됨!", "success");

                // Auto-award badge and points
                const item = teacherQueue.find(i => i.id === genId);
                if (item?.studentId) {
                    try {
                        // Award Ground points
                        await awardAchievement(item.studentId, 'ARTWORK_COMPLETED');
                        // Check auto-badges
                        await badgeService.checkAutoBadges(item.studentId, classId, 'submit_artwork');
                        console.log('Points and badge check completed for', item.studentId);
                    } catch (e) {
                        console.error('Failed to award points/badges:', e);
                    }
                }
            } else if (action === 'delete') {
                await imageGenService.deleteGeneration(classId, sessionId, genId);
                showToast("🗑️ 삭제 완료", "info");
            }
        } catch (error) {
            setGeneratingId(null);
            showToast("작업 실패: " + error.message, "error");
        }
    };

    // Chatbot Handler
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
                sessionData.chatbotInstruction
            );

            setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: "죄송해요, 오류가 발생했어요: " + error.message }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    // Save Appreciation
    const handleSaveAppreciation = async () => {
        if (!appreciationText.trim()) {
            showToast("성찰 내용을 입력해주세요!", "error");
            return;
        }

        setIsSavingAppreciation(true);
        try {
            await addDoc(collection(db, 'classes', classId, 'sessions', sessionId, 'appreciations'), {
                studentId: currentUser.uid,
                studentName: currentUser.displayName || '학생',
                observation: userCritique,
                reflection: appreciationText,
                createdAt: serverTimestamp()
            });
            showToast("✅ 감상 완료! 잘했어요!", "success");
            setAppreciationText('');
        } catch (error) {
            showToast("저장 오류: " + error.message, "error");
        } finally {
            setIsSavingAppreciation(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎨</div>
                <p style={{ color: 'var(--text-sub)' }}>워크스페이스 로딩 중...</p>
            </div>
        </div>
    );

    return (
        <div className="workspace-container" style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '2rem',
            minHeight: '85vh',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Toast Notification */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* CSS for animation */}
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>

            <header style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                padding: '1.5rem 2rem',
                borderRadius: '1rem',
                marginBottom: '1.5rem',
                color: 'white',
                boxShadow: 'var(--shadow)'
            }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>📚 {sessionData.title}</h1>
                <p style={{ margin: '0.5rem 0 0', opacity: 0.9 }}>🎨 AI 도움 받기 미술 수업</p>
            </header>

            <div className="workspace-tabs" style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap'
            }}>
                {sessionData.features?.imageGen && (
                    <button
                        className={activeTab === 'creation' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setActiveTab('creation')}
                    >
                        <Image size={16} /> 🖌️ AI 그림 만들기
                    </button>
                )}

                {sessionData.features?.vision && (
                    <button
                        className={activeTab === 'vision' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setActiveTab('vision')}
                    >
                        <Image size={16} /> 👁️ 작품 분석
                    </button>
                )}

                {(sessionData.features?.appreciation || sessionData.features?.textHelp) && (
                    <button
                        className={activeTab === 'text' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setActiveTab('text')}
                    >
                        <PenTool size={16} /> ✏️ 표현 도우미
                    </button>
                )}

                {sessionData.features?.chat && (
                    <button
                        className={activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setActiveTab('chat')}
                    >
                        <MessageSquare size={16} /> 💬 챗봇
                    </button>
                )}

                {sessionData.features?.appreciation && (
                    <button
                        className={activeTab === 'appreciation' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setActiveTab('appreciation')}
                    >
                        <Image size={16} /> 🔄 감상 루프
                    </button>
                )}
            </div>

            <div className="workspace-content" style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '2rem', background: '#fff', overflowY: 'auto' }}>

                {/* CREATION TOOL */}
                {activeTab === 'creation' && (
                    <div className="tool-creation" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        {userRole === 'teacher' ? (
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <h3>👩‍🏫 선생님 관리 센터</h3>
                                <div className="queue-list" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                                    <h4>📋 승인 대기 ({teacherQueue.filter(i => i.status === 'pending_approval').length})</h4>
                                    {teacherQueue.filter(i => i.status === 'pending_approval').map(item => (
                                        <div key={item.id} style={{ padding: '0.75rem', borderBottom: '1px solid #ddd', marginBottom: '0.5rem', background: '#fff', borderRadius: '0.5rem' }}>
                                            <p style={{ margin: '0 0 0.5rem' }}><strong>{item.prompt}</strong></p>
                                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--text-sub)' }}>👤 {item.studentName || '학생'}</p>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleTeacherAction(item.id, 'approve')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: '500' }}>✅ 승인</button>
                                                <button onClick={() => handleTeacherAction(item.id, 'reject')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: '500' }}>❌ 거절</button>
                                            </div>
                                        </div>
                                    ))}
                                    {teacherQueue.filter(i => i.status === 'pending_approval').length === 0 && (
                                        <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem' }}>대기 중인 요청이 없습니다.</p>
                                    )}

                                    <h4 style={{ marginTop: '2rem' }}>🎨 이미지 생성 ({teacherQueue.filter(i => i.status === 'approved').length})</h4>
                                    {teacherQueue.filter(i => i.status === 'approved').map(item => (
                                        <div key={item.id} style={{ padding: '1rem', border: '2px solid var(--primary)', borderRadius: '0.75rem', marginBottom: '1rem', background: '#fff' }}>
                                            <p style={{ marginBottom: '0.5rem' }}><strong>📝 {item.prompt}</strong></p>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '1rem' }}>👤 {item.studentName || '학생'}</p>
                                            <button
                                                onClick={() => handleTeacherAction(item.id, 'ai_generate', null, item.prompt)}
                                                disabled={generatingId === item.id}
                                                className="btn-primary"
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    opacity: generatingId === item.id ? 0.7 : 1
                                                }}
                                            >
                                                {generatingId === item.id ? (
                                                    <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> 생성 중...</>
                                                ) : (
                                                    <>🤖 AI 이미지 생성</>
                                                )}
                                            </button>
                                        </div>
                                    ))}

                                    <h4 style={{ marginTop: '2rem' }}>🖼️ 검토 후 공개 ({teacherQueue.filter(i => i.status === 'generated').length})</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                                        {teacherQueue.filter(i => i.status === 'generated').map(item => (
                                            <div key={item.id} style={{ padding: '0.75rem', border: '2px solid var(--primary)', borderRadius: '0.5rem', background: '#fff' }}>
                                                <img src={item.imageUrl} alt="생성됨" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '0.5rem' }} />
                                                <p style={{ fontSize: '0.75rem', margin: '0.5rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.prompt}</p>
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <button onClick={() => handleTeacherAction(item.id, 'publish')} style={{ flex: 1, background: '#6366f1', color: 'white', border: 'none', padding: '0.4rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}>📤 공개</button>
                                                    <button onClick={() => handleTeacherAction(item.id, 'delete')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.4rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}>🗑️</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <h4 style={{ marginTop: '2rem' }}>✅ 공개됨 ({teacherQueue.filter(i => i.status === 'published').length})</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
                                        {teacherQueue.filter(i => i.status === 'published').map(item => (
                                            <div key={item.id} style={{ position: 'relative' }}>
                                                <img src={item.imageUrl} alt="공개됨" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '0.5rem', border: '2px solid #10b981' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ flex: 1, minWidth: '280px' }}>
                                    <h3>🎨 새 작품 만들기</h3>
                                    <p>그리고 싶은 것을 설명해주세요. 선생님이 먼저 확인해요.</p>
                                    <textarea
                                        value={genPrompt}
                                        onChange={(e) => setGenPrompt(e.target.value)}
                                        style={{ width: '100%', height: '100px', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
                                        placeholder="하늘을 나는 자동차를 그리고 싶어요..."
                                    />
                                    <button onClick={handleSubmitPrompt} className="btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                                        🚀 승인 요청하기
                                    </button>
                                </div>
                                <div style={{ flex: 1, minWidth: '280px', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                                    <h3>🖼️ 내 갤러리</h3>
                                    {myGenerations.length === 0 ? (
                                        <p style={{ color: 'var(--text-sub)' }}>아직 작품이 없어요. 위에서 승인 요청해보세요!</p>
                                    ) : (
                                        myGenerations.map(gen => (
                                            <div key={gen.id} style={{ marginBottom: '1rem', padding: '1rem', background: '#fff', border: gen.status === 'published' ? '2px solid #10b981' : '1px solid #ddd', borderRadius: '0.75rem' }}>
                                                <p><strong>📝</strong> {gen.prompt}</p>
                                                <p>
                                                    <span style={{
                                                        fontWeight: 'bold',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '0.25rem',
                                                        background: gen.status === 'published' ? '#d1fae5' : gen.status === 'pending_approval' ? '#fef3c7' : '#fee2e2',
                                                        color: gen.status === 'published' ? '#059669' : gen.status === 'pending_approval' ? '#d97706' : '#dc2626',
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        {gen.status === 'published' ? '✅ 완료!' : gen.status === 'pending_approval' ? '⏳ 대기중' : gen.status === 'approved' ? '🎨 생성중' : gen.status === 'rejected' ? '❌ 거절됨' : gen.status}
                                                    </span>
                                                </p>
                                                {gen.status === 'published' && gen.imageUrl && (
                                                    <div style={{ marginTop: '0.5rem' }}>
                                                        <img src={gen.imageUrl} alt="내 작품" style={{ width: '100%', maxWidth: '250px', borderRadius: '0.5rem' }} />
                                                    </div>
                                                )}
                                                {gen.status === 'rejected' && (
                                                    <p style={{ color: 'red', marginTop: '0.5rem', fontSize: '0.85rem' }}>❌ {gen.rejectionReason || "적절하지 않음"}</p>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* VISION TOOL */}
                {activeTab === 'vision' && (
                    <div className="tool-vision" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
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
                            <p style={{ fontStyle: 'italic', color: '#666', fontSize: '0.9rem' }}>분석 지침: "{sessionData.visionPrompt}"</p>
                            <hr style={{ borderColor: '#eee' }} />
                            {isAnalyzing ? <p>🔍 분석 중...</p> : (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{visionAnalysis}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* TEXT TOOL */}
                {activeTab === 'text' && (
                    <div className="tool-text" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '280px' }}>
                            <h3>✏️ 내 생각 작성</h3>
                            <textarea
                                value={userCritique}
                                onChange={(e) => setUserCritique(e.target.value)}
                                style={{ width: '100%', height: '200px', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
                                placeholder="이 작품을 보고 느낀 점을 적어보세요..."
                            />
                            <button className="btn-primary" onClick={handleCritiqueRefinement} style={{ marginTop: '1rem' }}>
                                ✨ 표현 다듬기
                            </button>
                        </div>
                        <div style={{ flex: 1, minWidth: '280px', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                            <h3>📝 표현 도우미</h3>
                            <p style={{ fontStyle: 'italic', color: '#666' }}>목표: "{sessionData.textPrompt}"</p>
                            <hr style={{ borderColor: '#eee' }} />
                            {isRefining ? <p>✨ 문장을 다듬는 중...</p> : (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{refinedCritique}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* CHATBOT TOOL */}
                {activeTab === 'chat' && (
                    <div className="tool-chat" style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
                        <h3 style={{ margin: '0 0 1rem' }}>💬 AI 도우미와 대화하기</h3>
                        <div style={{
                            flex: 1,
                            border: '1px solid #ddd',
                            borderRadius: '0.75rem',
                            padding: '1rem',
                            overflowY: 'auto',
                            background: '#f9f9f9',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                        }}>
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
                                    padding: '0.75rem 1rem',
                                    borderRadius: '1rem',
                                    maxWidth: '80%',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
                                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                                placeholder="질문을 입력하세요..."
                                style={{
                                    flex: 1,
                                    padding: '0.75rem 1rem',
                                    borderRadius: '2rem',
                                    border: '2px solid var(--primary)',
                                    outline: 'none'
                                }}
                            />
                            <button
                                onClick={handleSendChat}
                                disabled={isChatLoading}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '2rem',
                                    border: 'none',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* APPRECIATION LOOP */}
                {activeTab === 'appreciation' && (
                    <div className="tool-appreciation">
                        {!sessionData.referenceImageUrl ? (
                            <p style={{ color: 'var(--text-sub)' }}>이 세션에 참조 이미지가 설정되지 않았습니다.</p>
                        ) : (
                            <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
                                {/* Stage 1 */}
                                <div className="stage-1" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                    <div style={{ flex: '1 1 300px' }}>
                                        <h3>📖 1단계: 깊이 감상하기</h3>
                                        <img src={sessionData.referenceImageUrl} alt="참조 작품" style={{ maxWidth: '100%', borderRadius: '1rem', maxHeight: '400px', boxShadow: 'var(--shadow)' }} />

                                        {/* Reference Video */}
                                        {sessionData.referenceVideoUrl && (
                                            <div style={{ marginTop: '1rem' }}>
                                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <Video size={18} /> 참고 영상
                                                </h4>
                                                <MediaEmbed url={sessionData.referenceVideoUrl} height="250px" />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: '1 1 300px' }}>
                                        <h3>👀 무엇이 보이나요?</h3>
                                        <p style={{ color: 'var(--text-sub)' }}>색, 선, 느낌을 자세히 적어보세요.</p>
                                        <textarea
                                            value={userCritique}
                                            onChange={e => setUserCritique(e.target.value)}
                                            style={{ width: '100%', height: '150px', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
                                            placeholder="나는 이 그림에서... 를 보았다"
                                        />
                                        <button onClick={handleCritiqueRefinement} style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
                                            ✨ AI 도움 받기
                                        </button>
                                        {refinedCritique && (
                                            <div style={{ background: '#fef3c7', padding: '1rem', marginTop: '0.5rem', borderRadius: '0.5rem' }}>
                                                <strong>AI 제안:</strong> {refinedCritique}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Stage 2 */}
                                <div className="stage-2" style={{ borderTop: '2px solid var(--primary)', paddingTop: '1.5rem' }}>
                                    <h3>🎨 2단계: 재창조하기</h3>
                                    <p style={{ color: 'var(--text-sub)' }}>감상한 내용을 바탕으로 AI가 새로운 이미지를 만들어요!</p>
                                    <button
                                        style={{ padding: '1rem 2rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '2rem', cursor: 'pointer', fontWeight: '600', marginTop: '1rem' }}
                                        onClick={() => {
                                            if (!userCritique) {
                                                showToast("먼저 1단계에서 감상을 작성해주세요!", "error");
                                                return;
                                            }
                                            setGenPrompt(userCritique);
                                            setActiveTab('creation');
                                        }}
                                    >
                                        🖌️ 내 감상으로 그림 만들기
                                    </button>
                                </div>

                                {/* Stage 3 */}
                                <div className="stage-3" style={{ borderTop: '2px solid var(--primary)', paddingTop: '1.5rem' }}>
                                    <h3>🔍 3단계: 비교하기</h3>
                                    <p style={{ color: 'var(--text-sub)' }}>원본 작품과 AI가 만든 작품을 나란히 비교해보세요.</p>
                                    <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ flex: '1 1 200px', textAlign: 'center' }}>
                                            <h4>📌 원본 작품</h4>
                                            <img src={sessionData.referenceImageUrl} alt="원본" style={{ maxWidth: '100%', borderRadius: '0.5rem', border: '3px solid var(--primary)' }} />
                                        </div>
                                        <div style={{ flex: '1 1 200px', textAlign: 'center' }}>
                                            <h4>🤖 AI 재창조 작품</h4>
                                            {myGenerations.filter(g => g.status === 'published').length > 0 ? (
                                                <img src={myGenerations.filter(g => g.status === 'published')[0].imageUrl} alt="AI 제작" style={{ maxWidth: '100%', borderRadius: '0.5rem', border: '3px solid var(--accent)' }} />
                                            ) : (
                                                <div style={{ padding: '3rem', background: '#f8f8f8', borderRadius: '0.5rem', color: 'var(--text-sub)' }}>
                                                    아직 생성된 이미지가 없어요.<br />2단계에서 그림을 만들어보세요!
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Stage 4 */}
                                <div className="stage-4" style={{ borderTop: '2px solid var(--primary)', paddingTop: '1.5rem' }}>
                                    <h3>📝 4단계: 성찰하기</h3>
                                    <p style={{ color: 'var(--text-sub)' }}>두 작품을 비교하며 느낀 점을 작성해보세요.</p>
                                    <textarea
                                        value={appreciationText}
                                        onChange={(e) => setAppreciationText(e.target.value)}
                                        placeholder="원본과 AI가 만든 그림을 비교했을 때, 나는...&#10;비슷한 점:&#10;다른 점:&#10;이 활동을 통해 배운 것:"
                                        style={{ width: '100%', height: '200px', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ddd', marginTop: '1rem' }}
                                    />
                                    <button
                                        onClick={handleSaveAppreciation}
                                        disabled={isSavingAppreciation}
                                        style={{
                                            marginTop: '1rem',
                                            padding: '1rem 2rem',
                                            background: 'var(--accent)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '2rem',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            opacity: isSavingAppreciation ? 0.7 : 1
                                        }}
                                    >
                                        {isSavingAppreciation ? '저장 중...' : '✅ 감상 완료하기'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SessionWorkspace;
