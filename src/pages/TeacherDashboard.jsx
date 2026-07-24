import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, themes } from '../context/ThemeContext';
import { classService } from '../services/classService';
import { sessionService } from '../services/sessionService';
import { badgeService } from '../services/badgeService';
import { imageGenService } from '../services/imageGenService';
import ClassSlideshow from '../components/ClassSlideshow';
import { loadSessionOutputs } from '../services/portfolioService';
import { EXTERNAL_LINKS } from '../data/externalLinks';

// three.js가 무거워서 3D 갤러리를 열 때만 내려받는다 (학생 화면 번들 보호)
const Gallery3D = lazy(() => import('../components/Gallery3D'));
import MasterpiecePicker from '../components/MasterpiecePicker';
import RubricEditor from '../components/RubricEditor';
import AppreciationMonitor from '../components/AppreciationMonitor';
import OperatorBoard from '../components/OperatorBoard';
import ArtReviewBoard from '../components/ArtReviewBoard';
import { DEFAULT_RUBRIC, DEFAULT_ART_RUBRIC } from '../data/masterpieces';
import { Plus, Users, Award, Palette, Play, Monitor, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '../services/firebase';

// Collapsible Guide Section Component
const GuideSection = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div style={{ marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: isOpen ? 'var(--primary)' : '#f8fafc', color: isOpen ? 'white' : 'var(--text-main)',
                    border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', textAlign: 'left'
                }}
            >
                {title}
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {isOpen && (
                <div style={{ padding: '1rem', background: 'white' }}>
                    {children}
                </div>
            )}
        </div>
    );
};

const TeacherDashboard = () => {
    const { currentUser } = useAuth();
    const { currentTheme, switchTheme } = useTheme();

    const [classes, setClasses] = useState([]);
    const [newClassName, setNewClassName] = useState('');
    const [newClassStudentCount, setNewClassStudentCount] = useState(30);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const emptySessionData = {
        title: '', visionPrompt: '', textPrompt: '', chatbotInstruction: '', referenceImageUrl: '', referenceVideoUrl: '',
        masterpieceId: null,
        portraitImageUrl: '', portraitName: '', portraitDesc: '',
        features: { deepAppreciation: true, vision: true, imageGen: true, chat: true, appreciation: true, textHelp: true, portrait: false, storyboard: false, artReview: false }
    };
    const [newSessionData, setNewSessionData] = useState(emptySessionData);
    // 루브릭 편집 대상 세션 (모듈 1: 감상 루브릭 공동 설정)
    const [rubricSession, setRubricSession] = useState(null);
    // 감상 현황 모니터링 대상 세션 (모듈 1)
    const [monitorSession, setMonitorSession] = useState(null);
    // 영상 오퍼레이터 보드 대상 세션 (모듈 3)
    const [operatorSession, setOperatorSession] = useState(null);
    // 작품 평가 확정 보드 (모듈 5) / 작품 루브릭 편집
    const [artReviewSession, setArtReviewSession] = useState(null);
    const [artRubricSession, setArtRubricSession] = useState(null);
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [isLoadingClassDetail, setIsLoadingClassDetail] = useState(false);
    const [isCreatingClass, setIsCreatingClass] = useState(false);
    const [isCreatingSession, setIsCreatingSession] = useState(false);

    // Badge State
    const [activeTab, setActiveTab] = useState('classes');
    const [badges, setBadges] = useState([]);
    const [newBadge, setNewBadge] = useState({ name: '', iconUrl: '', description: '' });

    // Slideshow / 3D 갤러리 / PDF 포트폴리오 State (발표 탭)
    const [classArtworks, setClassArtworks] = useState([]);
    const [slideshowSession, setSlideshowSession] = useState(null);
    const [presentMode, setPresentMode] = useState('slideshow'); // slideshow | gallery3d | pdf
    const [sessionOutputs, setSessionOutputs] = useState(null);  // loadSessionOutputs 결과
    const [isLoadingOutputs, setIsLoadingOutputs] = useState(false);
    const [galleryPick, setGalleryPick] = useState(null);        // 3D 갤러리에서 클릭한 작품
    const [pdfBusyNo, setPdfBusyNo] = useState(null);            // PDF 생성 중인 출석번호

    // 학생 비밀번호 관리 (활동코드 접속 체계)
    const [registeredStudents, setRegisteredStudents] = useState([]);
    const [showPasswordPanel, setShowPasswordPanel] = useState(false);

    // Toast State
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = 'info') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchClasses();
    }, [currentUser]);

    const fetchClasses = async () => {
        setIsLoadingClasses(true);
        if (currentUser) {
            try {
                const data = await classService.getTeacherClasses(currentUser.uid);
                setClasses(data);
            } catch (error) {
                console.error('Failed to fetch classes:', error);
                showToast("학급 정보를 불러오지 못했습니다.", "error");
            } finally {
                setIsLoadingClasses(false);
            }
        } else {
            setClasses([]);
            setIsLoadingClasses(false);
        }
    };

    const handleCreateClass = async () => {
        if (!newClassName.trim() || isCreatingClass) return;
        setIsCreatingClass(true);
        try {
            const count = Math.min(40, Math.max(1, Number(newClassStudentCount) || 30));
            await classService.createClass(currentUser.uid, newClassName.trim(), count);
            setShowCreateModal(false);
            setNewClassName('');
            setNewClassStudentCount(30);
            await fetchClasses();
            showToast("✅ 학급이 생성되었습니다!", "success");
        } catch (error) {
            showToast("학급 생성 실패", "error");
        } finally {
            setIsCreatingClass(false);
        }
    };

    const handleSelectClass = async (cls) => {
        setIsLoadingClassDetail(true);
        setSelectedClass(cls);
        setShowPasswordPanel(false);
        setRegisteredStudents([]);
        // 발표 탭 상태 초기화 (다른 학급의 활동·산출물이 남지 않게)
        setSlideshowSession(null);
        setClassArtworks([]);
        setSessionOutputs(null);
        setGalleryPick(null);
        try {
            const classSessions = await sessionService.getClassSessions(cls.id);
            setSessions(classSessions);
        } catch (error) {
            console.error('Failed to load class detail:', error);
            setSessions([]);
            showToast("학급 상세 정보를 불러오지 못했습니다.", "error");
        } finally {
            setIsLoadingClassDetail(false);
        }
    };

    const handleCreateSession = async () => {
        if (!selectedClass || !newSessionData.title.trim() || isCreatingSession) return;

        setIsCreatingSession(true);
        try {
            await sessionService.createSession(selectedClass.id, {
                ...newSessionData,
                title: newSessionData.title.trim(),
                rubric: DEFAULT_RUBRIC,
                artRubric: DEFAULT_ART_RUBRIC,
                teacherId: currentUser.uid
            });
            setShowSessionModal(false);
            setNewSessionData(emptySessionData);
            const classSessions = await sessionService.getClassSessions(selectedClass.id);
            setSessions(classSessions);
            showToast("✅ 활동이 생성되었습니다!", "success");
        } catch (error) {
            console.error('Failed to create session:', error);
            showToast("활동 생성에 실패했습니다.", "error");
        } finally {
            setIsCreatingSession(false);
        }
    };

    // 활동코드가 없는 기존 세션에 코드 발급
    const handleAssignJoinCode = async (sessionId) => {
        if (!selectedClass) return;
        try {
            const code = await sessionService.assignJoinCode(selectedClass.id, sessionId, currentUser.uid);
            const classSessions = await sessionService.getClassSessions(selectedClass.id);
            setSessions(classSessions);
            showToast(`✅ 활동코드 발급: ${code}`, "success");
        } catch (error) {
            console.error('Failed to assign join code:', error);
            showToast("활동코드 발급에 실패했습니다.", "error");
        }
    };

    const handleLoadRegisteredStudents = async () => {
        if (!selectedClass) return;
        try {
            const students = await classService.getRegisteredStudents(selectedClass.id);
            setRegisteredStudents(students);
            setShowPasswordPanel(true);
        } catch (error) {
            console.error('Failed to load registered students:', error);
            showToast("학생 목록을 불러오지 못했습니다.", "error");
        }
    };

    const handleResetPassword = async (studentNo) => {
        if (!selectedClass) return;
        if (!window.confirm(`${studentNo}번 학생의 비밀번호를 초기화할까요?\n학생이 다음 입장 때 새 비밀번호를 만들게 됩니다.`)) return;
        try {
            await classService.resetStudentPassword(selectedClass.id, studentNo);
            await handleLoadRegisteredStudents();
            showToast(`🔑 ${studentNo}번 비밀번호 초기화 완료`, "success");
        } catch (error) {
            console.error('Failed to reset password:', error);
            showToast("비밀번호 초기화에 실패했습니다.", "error");
        }
    };

    const handleToggleSessionStatus = async (sessionId, currentStatus) => {
        if (!selectedClass) return;

        const nextStatus = currentStatus === 'archived' ? 'active' : 'archived';

        try {
            await sessionService.updateSessionStatus(selectedClass.id, sessionId, nextStatus);
            const classSessions = await sessionService.getClassSessions(selectedClass.id);
            setSessions(classSessions);
            showToast(nextStatus === 'archived' ? "활동을 보관했습니다." : "활동을 다시 활성화했습니다.", "success");
        } catch (error) {
            showToast("활동 상태 변경에 실패했습니다.", "error");
        }
    };

    const handleLoadBadges = async () => {
        if (!selectedClass) return;
        const clsBadges = await badgeService.getClassBadges(selectedClass.id);
        setBadges(clsBadges);
    };

    const handleCreateBadge = async () => {
        if (!selectedClass || !newBadge.name) return;
        await badgeService.createCustomBadge(selectedClass.id, newBadge.name, newBadge.iconUrl, newBadge.description);
        setNewBadge({ name: '', iconUrl: '', description: '' });
        handleLoadBadges();
        showToast("🏆 뱃지가 생성되었습니다!", "success");
    };

    const handleAwardBadge = async (studentId, badge) => {
        await badgeService.awardBadge(selectedClass.id, studentId, badge);
        showToast(`🏆 "${badge.name}" 뱃지 수여 완료!`, "success");
    };

    // Load artworks for slideshow
    const loadSlideshowArtworks = async (sessionId) => {
        if (!selectedClass || !sessionId) return;
        try {
            const queueRef = collection(db, 'classes', selectedClass.id, 'sessions', sessionId, 'generationQueue');
            const q = query(queueRef, where('status', '==', 'published'));
            const snapshot = await getDocs(q);
            const artworks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setClassArtworks(artworks);
            setSlideshowSession(sessions.find(s => s.id === sessionId));
            setSessionOutputs(null); // 활동을 바꾸면 산출물 다시 로드
            setGalleryPick(null);
        } catch (e) {
            console.error("Failed to load artworks", e);
            setClassArtworks([]);
        }
    };

    // 3D 갤러리·PDF 모드에서 산출물이 없으면 자동 로드 (활동을 바꾸면 sessionOutputs가 null로 초기화됨)
    useEffect(() => {
        if (presentMode !== 'gallery3d' && presentMode !== 'pdf') return;
        if (!selectedClass || !slideshowSession || sessionOutputs || isLoadingOutputs) return;
        let cancelled = false;
        (async () => {
            setIsLoadingOutputs(true);
            try {
                const outputs = await loadSessionOutputs(selectedClass.id, slideshowSession.id);
                if (!cancelled) setSessionOutputs(outputs);
            } catch (e) {
                console.error('Failed to load session outputs', e);
                if (!cancelled) showToast('산출물을 불러오지 못했습니다.', 'error');
            } finally {
                if (!cancelled) setIsLoadingOutputs(false);
            }
        })();
        return () => { cancelled = true; };
    }, [presentMode, selectedClass, slideshowSession, sessionOutputs, isLoadingOutputs]);

    const handlePresentMode = (mode) => setPresentMode(mode);

    const handleDownloadPortfolio = async (student) => {
        if (pdfBusyNo) return;
        setPdfBusyNo(student.no);
        try {
            // jspdf도 무거워서 저장 버튼을 눌렀을 때만 내려받는다
            const { generateSessionPortfolioPDF } = await import('../services/pdfService');
            await generateSessionPortfolioPDF({
                className: selectedClass?.name || '',
                sessionTitle: slideshowSession?.title || '',
                studentNo: student.no,
            }, student);
            showToast(`📄 ${student.no}번 포트폴리오 저장 완료`, 'success');
        } catch (e) {
            console.error('PDF 생성 실패', e);
            showToast('PDF 생성에 실패했습니다.', 'error');
        } finally {
            setPdfBusyNo(null);
        }
    };

    return (
        <div className="dashboard-container" style={{ padding: '1rem' }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
                    background: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#6366f1',
                    color: 'white', padding: '1rem 1.5rem', borderRadius: '0.75rem', boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                }}>
                    {toast.msg}
                </div>
            )}

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ color: 'var(--text-main)' }}>🎨 선생님 대시보드</h1>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Theme Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--card-bg)', padding: '0.5rem 1rem', borderRadius: '2rem', boxShadow: 'var(--shadow)' }}>
                        <Palette size={16} color="var(--primary)" />
                        <select
                            value={currentTheme}
                            onChange={(e) => switchTheme(e.target.value)}
                            style={{ border: 'none', background: 'transparent', color: 'var(--text-main)', fontWeight: '500', cursor: 'pointer' }}
                        >
                            {Object.entries(themes).map(([key, theme]) => (
                                <option key={key} value={key}>{theme.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tab Buttons */}
                    <button
                        style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', background: activeTab === 'classes' ? 'var(--primary)' : 'var(--card-bg)', color: activeTab === 'classes' ? 'white' : 'var(--text-main)', cursor: 'pointer', fontWeight: '500' }}
                        onClick={() => setActiveTab('classes')}
                    >📚 학급</button>
                    <button
                        style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', background: activeTab === 'badges' ? 'var(--primary)' : 'var(--card-bg)', color: activeTab === 'badges' ? 'white' : 'var(--text-main)', cursor: 'pointer', fontWeight: '500' }}
                        onClick={() => setActiveTab('badges')}
                    >🏆 뱃지</button>
                    <button
                        style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', background: activeTab === 'slideshow' ? 'var(--primary)' : 'var(--card-bg)', color: activeTab === 'slideshow' ? 'white' : 'var(--text-main)', cursor: 'pointer', fontWeight: '500' }}
                        onClick={() => setActiveTab('slideshow')}
                    ><Monitor size={14} style={{ marginRight: '0.25rem' }} />🎬 발표</button>
                    <button
                        style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', background: activeTab === 'guide' ? 'var(--primary)' : 'var(--card-bg)', color: activeTab === 'guide' ? 'white' : 'var(--text-main)', cursor: 'pointer', fontWeight: '500' }}
                        onClick={() => setActiveTab('guide')}
                    ><BookOpen size={14} style={{ marginRight: '0.25rem' }} />📖 가이드</button>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '2rem', cursor: 'pointer', fontWeight: '600' }}
                    ><Plus size={16} /> 새 학급</button>
                </div>
            </header>

            {/* Create Class Modal */}
            {showCreateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
                    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '1rem', width: '400px', boxShadow: 'var(--shadow)' }}>
                        <h3 style={{ marginBottom: '1rem' }}>📚 새 학급 만들기</h3>
                        <input
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            placeholder="예: 4학년 1반 미술"
                            style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-sub)' }}>
                            학생 수 (출석번호 범위)
                            <input
                                type="number" min="1" max="40"
                                value={newClassStudentCount}
                                onChange={(e) => setNewClassStudentCount(e.target.value)}
                                style={{ width: '80px', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
                            />
                            명
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowCreateModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>취소</button>
                            <button onClick={handleCreateClass} disabled={isCreatingClass || !newClassName.trim()} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'var(--primary)', color: 'white', cursor: isCreatingClass || !newClassName.trim() ? 'not-allowed' : 'pointer', opacity: isCreatingClass || !newClassName.trim() ? 0.6 : 1 }}> {isCreatingClass ? '생성 중...' : '만들기'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Session Modal */}
            {showSessionModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
                    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '1rem', width: '500px', maxHeight: '85vh', overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
                        <h3 style={{ marginBottom: '1rem' }}>📝 새 활동 만들기</h3>

                        {/* Feature Toggles */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', padding: '0.75rem', background: '#f8f8f8', borderRadius: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                                <input type="checkbox" checked={newSessionData.features?.deepAppreciation} onChange={e => setNewSessionData({ ...newSessionData, features: { ...newSessionData.features, deepAppreciation: e.target.checked } })} /> 감상 쓰기(1·2차)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                                <input type="checkbox" checked={newSessionData.features?.vision} onChange={e => setNewSessionData({ ...newSessionData, features: { ...newSessionData.features, vision: e.target.checked } })} /> 작품 분석
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                                <input type="checkbox" checked={newSessionData.features?.imageGen} onChange={e => setNewSessionData({ ...newSessionData, features: { ...newSessionData.features, imageGen: e.target.checked } })} /> AI 그림
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                                <input type="checkbox" checked={newSessionData.features?.chat} onChange={e => setNewSessionData({ ...newSessionData, features: { ...newSessionData.features, chat: e.target.checked } })} /> 챗봇
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                                <input type="checkbox" checked={newSessionData.features?.appreciation} onChange={e => setNewSessionData({ ...newSessionData, features: { ...newSessionData.features, appreciation: e.target.checked } })} /> 복원 챌린지
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                                <input type="checkbox" checked={newSessionData.features?.textHelp} onChange={e => setNewSessionData({ ...newSessionData, features: { ...newSessionData.features, textHelp: e.target.checked } })} /> 표현 도우미
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                                <input type="checkbox" checked={newSessionData.features?.portrait} onChange={e => setNewSessionData({ ...newSessionData, features: { ...newSessionData.features, portrait: e.target.checked } })} /> 인물의 하루(영상)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                                <input type="checkbox" checked={newSessionData.features?.storyboard} onChange={e => setNewSessionData({ ...newSessionData, features: { ...newSessionData.features, storyboard: e.target.checked } })} /> 스토리보드(영상)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                                <input type="checkbox" checked={newSessionData.features?.artReview} onChange={e => setNewSessionData({ ...newSessionData, features: { ...newSessionData.features, artReview: e.target.checked } })} /> 작품 평가
                            </label>
                        </div>

                        <input value={newSessionData.title} onChange={e => setNewSessionData({ ...newSessionData, title: e.target.value })} placeholder="활동 제목 (예: 반 고흐 감상)" style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />

                        {newSessionData.features?.vision && (
                            <textarea value={newSessionData.visionPrompt} onChange={e => setNewSessionData({ ...newSessionData, visionPrompt: e.target.value })} placeholder="작품 분석 AI 프롬프트 (예: 이 그림의 색상과 분위기를 분석해주세요)" style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd', minHeight: '60px' }} />
                        )}

                        {newSessionData.features?.textHelp && (
                            <textarea value={newSessionData.textPrompt} onChange={e => setNewSessionData({ ...newSessionData, textPrompt: e.target.value })} placeholder="표현 도우미 프롬프트 (예: 학생의 감상을 더 문학적으로 다듬어주세요)" style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd', minHeight: '60px' }} />
                        )}

                        {newSessionData.features?.chat && (
                            <textarea value={newSessionData.chatbotInstruction} onChange={e => setNewSessionData({ ...newSessionData, chatbotInstruction: e.target.value })} placeholder="챗봇 성격 설정 (예: 당신은 미술관 큐레이터입니다...)" style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd', minHeight: '60px' }} />
                        )}

                        {(newSessionData.features?.appreciation || newSessionData.features?.deepAppreciation) && (
                            <>
                                <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                                    <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>🖼️ 감상 작품 선택 (명화 16종)</p>
                                    <MasterpiecePicker
                                        value={newSessionData.masterpieceId}
                                        onChange={(m) => setNewSessionData({
                                            ...newSessionData,
                                            masterpieceId: m ? m.id : null,
                                            referenceImageUrl: m ? m.imageUrl : '',
                                        })}
                                    />
                                </div>
                                {!newSessionData.masterpieceId && (
                                    <input value={newSessionData.referenceImageUrl || ''} onChange={e => setNewSessionData({ ...newSessionData, referenceImageUrl: e.target.value })} placeholder="또는 감상 작품 이미지 URL 직접 입력" style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                                )}
                                <input value={newSessionData.referenceVideoUrl || ''} onChange={e => setNewSessionData({ ...newSessionData, referenceVideoUrl: e.target.value })} placeholder="참고 영상 URL (YouTube 등, 선택)" style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                            </>
                        )}

                        {newSessionData.features?.portrait && (
                            <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: '#fdf4ff', borderRadius: '0.5rem' }}>
                                <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>🎬 인물의 하루 — 인물 사진 등록</p>
                                <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--text-sub)' }}>역사 인물 등 공개된 사진의 URL을 넣어 주세요. 학생 사진은 사용할 수 없습니다.</p>
                                <input value={newSessionData.portraitImageUrl} onChange={e => setNewSessionData({ ...newSessionData, portraitImageUrl: e.target.value })} placeholder="인물 사진 URL" style={{ width: '100%', padding: '0.6rem', marginBottom: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                                <input value={newSessionData.portraitName} onChange={e => setNewSessionData({ ...newSessionData, portraitName: e.target.value })} placeholder="인물 이름 (예: 유관순)" style={{ width: '100%', padding: '0.6rem', marginBottom: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                                <input value={newSessionData.portraitDesc} onChange={e => setNewSessionData({ ...newSessionData, portraitDesc: e.target.value })} placeholder="한 줄 소개 (선택)" style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowSessionModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>취소</button>
                            <button onClick={handleCreateSession} disabled={isCreatingSession || !newSessionData.title.trim()} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'var(--primary)', color: 'white', cursor: isCreatingSession || !newSessionData.title.trim() ? 'not-allowed' : 'pointer', opacity: isCreatingSession || !newSessionData.title.trim() ? 0.6 : 1 }}>{isCreatingSession ? '생성 중...' : '만들기'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 감상 루브릭 공동 설정 모달 */}
            {rubricSession && selectedClass && (
                <RubricEditor
                    classId={selectedClass.id}
                    session={rubricSession}
                    onClose={() => setRubricSession(null)}
                    onSaved={async (rubric) => {
                        setRubricSession(null);
                        setSessions(sessions.map(s => (s.id === rubricSession.id ? { ...s, rubric } : s)));
                        showToast('📋 감상 루브릭이 저장되었습니다!', 'success');
                    }}
                />
            )}

            {/* 감상 현황 모니터링 모달 */}
            {monitorSession && selectedClass && (
                <AppreciationMonitor
                    classId={selectedClass.id}
                    session={monitorSession}
                    studentCount={selectedClass.studentCount || 30}
                    onClose={() => setMonitorSession(null)}
                />
            )}

            {/* 영상 오퍼레이터 보드 모달 */}
            {operatorSession && selectedClass && (
                <OperatorBoard
                    classId={selectedClass.id}
                    session={operatorSession}
                    onClose={() => setOperatorSession(null)}
                />
            )}

            {/* 작품 루브릭 편집 모달 (모듈 5) */}
            {artRubricSession && selectedClass && (
                <RubricEditor
                    classId={selectedClass.id}
                    session={artRubricSession}
                    fieldName="artRubric"
                    titleLabel="작품 루브릭"
                    defaultItems={DEFAULT_ART_RUBRIC}
                    onClose={() => setArtRubricSession(null)}
                    onSaved={async (artRubric) => {
                        setArtRubricSession(null);
                        setSessions(sessions.map(s => (s.id === artRubricSession.id ? { ...s, artRubric } : s)));
                        showToast('📋 작품 루브릭이 저장되었습니다!', 'success');
                    }}
                />
            )}

            {/* 작품 평가 확정 보드 모달 (모듈 5) */}
            {artReviewSession && selectedClass && (
                <ArtReviewBoard
                    classId={selectedClass.id}
                    session={artReviewSession}
                    onClose={() => setArtReviewSession(null)}
                />
            )}

            {/* Classes Tab */}
            {activeTab === 'classes' && (
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 300px', minWidth: '280px' }}>
                        <h2 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>📚 내 학급</h2>
                        {isLoadingClasses ? <p style={{ color: 'var(--text-sub)' }}>학급을 불러오는 중...</p> : classes.length === 0 ? <p style={{ color: 'var(--text-sub)' }}>아직 학급이 없습니다. 새 학급을 만들어보세요!</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {classes.map(cls => (
                                    <div key={cls.id} onClick={() => handleSelectClass(cls)} style={{
                                        padding: '1rem', borderRadius: '1rem', cursor: 'pointer',
                                        border: selectedClass?.id === cls.id ? '2px solid var(--primary)' : '1px solid #eee',
                                        background: 'var(--card-bg)', boxShadow: 'var(--shadow)', transition: 'all 0.2s'
                                    }}>
                                        <h3 style={{ margin: 0, color: 'var(--text-main)' }}>{cls.name}</h3>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-sub)', marginTop: '0.5rem' }}>
                                            <span><Users size={14} /> {cls.studentCount || 30}명</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 외부 도구 링크 */}
                        <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '1rem', background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
                            <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text-main)', fontSize: '1rem' }}>🔗 외부 도구</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {Object.values(EXTERNAL_LINKS).map(link => (
                                    <a
                                        key={link.url}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem',
                                            borderRadius: '0.6rem', border: '1px solid #e2e8f0', background: '#f8fafc',
                                            textDecoration: 'none', color: 'var(--text-main)'
                                        }}
                                    >
                                        <span style={{ fontSize: '1.2rem' }}>{link.emoji}</span>
                                        <span style={{ flex: 1 }}>
                                            <strong style={{ fontSize: '0.9rem', display: 'block' }}>{link.label}</strong>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{link.desc}</span>
                                        </span>
                                        {link.audience === 'teacher' && (
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>교사 전용</span>
                                        )}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: '2 1 400px', minWidth: '300px', background: 'var(--card-bg)', borderRadius: '1rem', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
                        {selectedClass ? (
                            <>
                                <h2 style={{ color: 'var(--text-main)', marginBottom: '1.5rem' }}>{selectedClass.name} 관리</h2>

                                {isLoadingClassDetail ? (
                                    <p style={{ color: 'var(--text-sub)' }}>학급 상세 정보를 불러오는 중...</p>
                                ) : (
                                <>
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        <h3 style={{ color: 'var(--text-main)', margin: 0 }}>🔑 학생 비밀번호 관리</h3>
                                        <button onClick={handleLoadRegisteredStudents} style={{ padding: '0.35rem 0.85rem', borderRadius: '999px', border: '1px solid var(--primary)', background: 'white', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
                                            {showPasswordPanel ? '새로고침' : '목록 보기'}
                                        </button>
                                    </div>
                                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                                        학생은 활동코드 + 출석번호 + 비밀번호(4자리)로 입장합니다. 비밀번호를 잊은 학생은 여기서 초기화해주세요.
                                    </p>
                                    {showPasswordPanel && (
                                        registeredStudents.length === 0 ? (
                                            <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem' }}>아직 비밀번호를 만든 학생이 없습니다.</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {registeredStudents.map(s => (
                                                    <button
                                                        key={s.no}
                                                        onClick={() => handleResetPassword(s.no)}
                                                        title="클릭하면 비밀번호 초기화"
                                                        style={{ padding: '0.5rem 0.85rem', borderRadius: '0.6rem', border: '1px solid #ddd', background: '#f8f8f8', cursor: 'pointer', fontWeight: '600' }}
                                                    >
                                                        {s.no}번 ✕
                                                    </button>
                                                ))}
                                            </div>
                                        )
                                    )}
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ color: 'var(--text-main)', margin: 0 }}>📝 활동 목록</h3>
                                        <button onClick={() => setShowSessionModal(true)} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: '500' }}>+ 새 활동</button>
                                    </div>
                                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--text-sub)' }}>보관된 활동은 학생 목록과 세션 접근에서 숨겨집니다.</p>
                                    {sessions.length === 0 ? <p style={{ color: 'var(--text-sub)' }}>아직 활동이 없습니다.</p> : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {sessions.map(sess => (
                                                <div key={sess.id} style={{ padding: '1rem', background: '#f8f8f8', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                                    <div>
                                                        <strong>{sess.title}</strong>
                                                        <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: 'var(--text-sub)' }}>
                                                            {sess.createdAt?.toDate().toLocaleDateString()}
                                                        </p>
                                                        {sess.joinCode ? (
                                                            <p style={{ margin: '0.25rem 0', fontSize: '0.95rem' }}>
                                                                🔑 활동코드: <strong style={{ color: 'var(--primary)', letterSpacing: '0.15em', fontSize: '1.1rem' }}>{sess.joinCode}</strong>
                                                            </p>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleAssignJoinCode(sess.id)}
                                                                style={{ margin: '0.25rem 0', padding: '0.3rem 0.7rem', borderRadius: '999px', border: '1px solid var(--primary)', background: 'white', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                                                            >🔑 활동코드 발급</button>
                                                        )}
                                                        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '600', color: sess.status === 'archived' ? '#b45309' : '#059669' }}>
                                                            {sess.status === 'archived' ? '보관됨' : '활성'}
                                                        </p>
                                                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                            <button
                                                                onClick={() => handleToggleSessionStatus(sess.id, sess.status)}
                                                                style={{ padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid #d1d5db', background: 'white', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}
                                                            >
                                                                {sess.status === 'archived' ? '다시 열기' : '보관'}
                                                            </button>
                                                            {(sess.features?.appreciation || sess.features?.deepAppreciation) && (
                                                                <button
                                                                    onClick={() => setRubricSession(sess)}
                                                                    style={{ padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid var(--accent)', background: 'white', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                                                                >
                                                                    📋 감상 루브릭{sess.rubric?.length ? ` (${sess.rubric.length})` : ''}
                                                                </button>
                                                            )}
                                                            {sess.features?.deepAppreciation && (
                                                                <button
                                                                    onClick={() => setMonitorSession(sess)}
                                                                    style={{ padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid #6366f1', background: 'white', color: '#6366f1', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                                                                >
                                                                    📊 감상 현황
                                                                </button>
                                                            )}
                                                            {(sess.features?.portrait || sess.features?.storyboard) && (
                                                                <button
                                                                    onClick={() => setOperatorSession(sess)}
                                                                    style={{ padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid #0891b2', background: 'white', color: '#0891b2', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                                                                >
                                                                    🎬 영상 보드
                                                                </button>
                                                            )}
                                                            {sess.features?.artReview && (
                                                                <>
                                                                    <button
                                                                        onClick={() => setArtRubricSession(sess)}
                                                                        style={{ padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid #b45309', background: 'white', color: '#b45309', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                                                                    >
                                                                        📋 작품 루브릭{sess.artRubric?.length ? ` (${sess.artRubric.length})` : ''}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setArtReviewSession(sess)}
                                                                        style={{ padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid #059669', background: 'white', color: '#059669', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                                                                    >
                                                                        🖼️ 작품 평가
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Link to={`/class/${selectedClass.id}/session/${sess.id}`} style={{ padding: '0.5rem 1rem', borderRadius: '1rem', background: 'var(--primary)', color: 'white', textDecoration: 'none', fontWeight: '500' }}>입장</Link>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                </>
                                )}
                            </>
                        ) : (
                            <p style={{ color: 'var(--text-sub)', textAlign: 'center', padding: '3rem' }}>👈 학급을 선택해주세요</p>
                        )}
                    </div>
                </div>
            )}

            {/* Badges Tab */}
            {activeTab === 'badges' && (
                <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
                    {!selectedClass ? (
                        <p style={{ color: 'var(--text-sub)', textAlign: 'center', padding: '2rem' }}>👈 먼저 '학급' 탭에서 학급을 선택해주세요.</p>
                    ) : (
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 300px' }}>
                                <h3 style={{ color: 'var(--text-main)' }}>🏆 새 뱃지 만들기</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <input placeholder="뱃지 이름" value={newBadge.name} onChange={e => setNewBadge({ ...newBadge, name: e.target.value })} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                                    <input placeholder="아이콘 URL (선택)" value={newBadge.iconUrl} onChange={e => setNewBadge({ ...newBadge, iconUrl: e.target.value })} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                                    <textarea placeholder="설명" value={newBadge.description} onChange={e => setNewBadge({ ...newBadge, description: e.target.value })} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd', minHeight: '60px' }} />
                                    <button onClick={handleCreateBadge} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: '600' }}>뱃지 만들기</button>
                                </div>

                                <h3 style={{ marginTop: '2rem', color: 'var(--text-main)' }}>📋 학급 뱃지 목록</h3>
                                <button onClick={handleLoadBadges} style={{ marginBottom: '1rem', padding: '0.5rem 1rem', borderRadius: '1rem', border: '1px solid var(--primary)', background: 'white', color: 'var(--primary)', cursor: 'pointer' }}>새로고침</button>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '1rem' }}>
                                    {badges.map(b => (
                                        <div key={b.id} style={{ textAlign: 'center', padding: '0.75rem', border: '1px solid #eee', borderRadius: '0.75rem', background: '#fafafa' }}>
                                            <img src={b.iconUrl || 'https://img.icons8.com/color/48/medal.png'} alt={b.name} style={{ width: '40px', height: '40px' }} />
                                            <p style={{ fontSize: '0.8rem', fontWeight: '600', margin: '0.5rem 0 0' }}>{b.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ flex: '1 1 300px' }}>
                                <h3 style={{ color: 'var(--text-main)' }}>🎁 뱃지 수여하기</h3>
                                <p style={{ color: 'var(--text-sub)', marginBottom: '1rem' }}>학생 옆의 뱃지 아이콘을 클릭하세요.</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {selectedClass.students?.map(sId => (
                                        <div key={sId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8f8f8', borderRadius: '0.5rem' }}>
                                            <span style={{ fontSize: '0.9rem' }}>🧑‍🎓 {sId.substring(0, 8)}...</span>
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                {badges.map(b => (
                                                    <button key={b.id} onClick={() => handleAwardBadge(sId, b)} title={`${b.name} 수여`} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                                                        <img src={b.iconUrl || 'https://img.icons8.com/color/48/medal.png'} style={{ width: '24px', height: '24px' }} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedClass.students || selectedClass.students.length === 0) && (
                                        <p style={{ color: 'var(--text-sub)' }}>아직 승인된 학생이 없습니다.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Slideshow Tab */}
            {activeTab === 'slideshow' && (
                <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
                    {!selectedClass ? (
                        <p style={{ color: 'var(--text-sub)', textAlign: 'center', padding: '2rem' }}>👈 먼저 '학급' 탭에서 학급을 선택해주세요.</p>
                    ) : (
                        <div>
                            <h2 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>🎬 발표 · 갤러리 · 포트폴리오</h2>
                            <p style={{ color: 'var(--text-sub)', marginBottom: '1rem' }}>활동을 선택하면 슬라이드쇼 발표, 3D 갤러리 감상, 학생별 PDF 포트폴리오 내보내기를 할 수 있어요.</p>

                            {/* Session Selector */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                {sessions.map(sess => (
                                    <button
                                        key={sess.id}
                                        onClick={() => loadSlideshowArtworks(sess.id)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderRadius: '2rem',
                                            border: slideshowSession?.id === sess.id ? '2px solid var(--primary)' : '1px solid #ddd',
                                            background: slideshowSession?.id === sess.id ? 'var(--primary)' : 'white',
                                            color: slideshowSession?.id === sess.id ? 'white' : 'var(--text-main)',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <Play size={14} /> {sess.title}
                                    </button>
                                ))}
                            </div>

                            {/* 보기 방식 선택 */}
                            {slideshowSession && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                    {[
                                        { key: 'slideshow', label: '🎬 슬라이드쇼' },
                                        { key: 'gallery3d', label: '🏛️ 3D 갤러리' },
                                        { key: 'pdf', label: '📄 PDF 포트폴리오' },
                                    ].map(m => (
                                        <button
                                            key={m.key}
                                            onClick={() => handlePresentMode(m.key)}
                                            style={{
                                                padding: '0.6rem 1.2rem', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '600',
                                                border: presentMode === m.key ? 'none' : '1px solid #ddd',
                                                background: presentMode === m.key ? 'var(--primary)' : 'white',
                                                color: presentMode === m.key ? 'white' : 'var(--text-main)'
                                            }}
                                        >{m.label}</button>
                                    ))}
                                </div>
                            )}

                            {!slideshowSession ? (
                                <div style={{ textAlign: 'center', padding: '3rem', background: '#f8f8f8', borderRadius: '1rem' }}>
                                    <p style={{ fontSize: '3rem', margin: 0 }}>👆</p>
                                    <p style={{ color: 'var(--text-sub)' }}>위에서 활동을 선택해주세요.</p>
                                </div>
                            ) : presentMode === 'slideshow' ? (
                                classArtworks.length > 0 ? (
                                    <ClassSlideshow artworks={classArtworks} autoPlay={true} interval={5000} />
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '3rem', background: '#f8f8f8', borderRadius: '1rem' }}>
                                        <p style={{ fontSize: '3rem', margin: 0 }}>🖼️</p>
                                        <p style={{ color: 'var(--text-sub)' }}>이 활동에는 아직 공개된 작품이 없습니다.</p>
                                    </div>
                                )
                            ) : isLoadingOutputs || !sessionOutputs ? (
                                <div style={{ textAlign: 'center', padding: '3rem', background: '#f8f8f8', borderRadius: '1rem' }}>
                                    <p style={{ color: 'var(--text-sub)' }}>산출물을 불러오는 중...</p>
                                </div>
                            ) : presentMode === 'gallery3d' ? (
                                sessionOutputs.galleryArtworks.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', background: '#f8f8f8', borderRadius: '1rem' }}>
                                        <p style={{ fontSize: '3rem', margin: 0 }}>🏛️</p>
                                        <p style={{ color: 'var(--text-sub)' }}>아직 전시할 작품이 없습니다. AI 그림을 공개하거나 작품 평가 사진이 올라오면 여기에 전시돼요.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p style={{ color: 'var(--text-sub)', margin: '0 0 0.75rem', fontSize: '0.9rem' }}>
                                            🖱️ 마우스로 돌려 보고, 휠로 확대·축소하세요. 작품을 클릭하면 크게 볼 수 있어요. ({sessionOutputs.galleryArtworks.length}점 전시 중)
                                        </p>
                                        <Suspense fallback={<div style={{ textAlign: 'center', padding: '3rem', background: '#f8f8f8', borderRadius: '1rem', color: 'var(--text-sub)' }}>3D 갤러리를 준비하는 중...</div>}>
                                            <Gallery3D artworks={sessionOutputs.galleryArtworks} onSelectArtwork={setGalleryPick} />
                                        </Suspense>
                                        {galleryPick && (
                                            <div
                                                onClick={() => setGalleryPick(null)}
                                                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                            >
                                                <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto', textAlign: 'center' }}>
                                                    <img src={galleryPick.imageUrl} alt={galleryPick.title} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '0.5rem' }} />
                                                    <h3 style={{ margin: '1rem 0 0.25rem' }}>{galleryPick.title}</h3>
                                                    {galleryPick.prompt && <p style={{ color: 'var(--text-sub)', margin: 0 }}>{galleryPick.prompt}</p>}
                                                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.75rem' }}>화면을 클릭하면 닫혀요</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : (
                                /* PDF 포트폴리오 */
                                sessionOutputs.students.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', background: '#f8f8f8', borderRadius: '1rem' }}>
                                        <p style={{ fontSize: '3rem', margin: 0 }}>📄</p>
                                        <p style={{ color: 'var(--text-sub)' }}>아직 이 활동에 제출된 산출물이 없습니다.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p style={{ color: 'var(--text-sub)', margin: '0 0 1rem', fontSize: '0.9rem' }}>
                                            학생별로 이 활동의 모든 산출물(감상문·복원 챌린지·AI 작품·영상 프롬프트·작품 평가)을 PDF 한 부로 저장합니다.
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                                            {sessionOutputs.students.map(st => {
                                                const parts = [
                                                    st.deep && '감상',
                                                    st.restore && '복원',
                                                    st.artworks.length > 0 && `AI그림 ${st.artworks.length}`,
                                                    st.portrait && '인물영상',
                                                    st.storyboard && '스토리보드',
                                                    st.artReview && '작품평가',
                                                ].filter(Boolean).join(' · ');
                                                return (
                                                    <div key={st.no} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', background: '#f8fafc' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                            <strong style={{ fontSize: '1.1rem' }}>{st.no}번</strong>
                                                            <button
                                                                onClick={() => handleDownloadPortfolio(st)}
                                                                disabled={pdfBusyNo !== null}
                                                                style={{
                                                                    padding: '0.4rem 0.9rem', borderRadius: '999px', border: 'none', cursor: pdfBusyNo ? 'wait' : 'pointer',
                                                                    background: 'var(--primary)', color: 'white', fontWeight: '600', fontSize: '0.85rem',
                                                                    opacity: pdfBusyNo !== null && pdfBusyNo !== st.no ? 0.5 : 1
                                                                }}
                                                            >
                                                                {pdfBusyNo === st.no ? '만드는 중...' : '📄 PDF 저장'}
                                                            </button>
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-sub)' }}>{parts || '산출물 없음'}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Guide Tab */}
            {activeTab === 'guide' && (
                <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', padding: '2rem', boxShadow: 'var(--shadow)', maxWidth: '900px', margin: '0 auto' }}>
                    <h2 style={{ color: 'var(--text-main)', marginBottom: '1.5rem', textAlign: 'center' }}>📖 Total Visual Art 사용 가이드</h2>
                    <p style={{ color: 'var(--text-sub)', textAlign: 'center', marginBottom: '2rem' }}>AI 융합 미술 수업을 위한 완벽 가이드</p>

                    {/* Quick Start */}
                    <GuideSection title="🚀 빠른 시작" defaultOpen={true}>
                        <ol style={{ lineHeight: '2', paddingLeft: '1.5rem' }}>
                            <li><strong>학급 만들기:</strong> 상단의 "+ 새 학급" 버튼 클릭</li>
                            <li><strong>초대 코드 공유:</strong> 생성된 6자리 코드를 학생들에게 공유</li>
                            <li><strong>학생 승인:</strong> 학생이 가입 신청하면 "학급" 탭에서 승인</li>
                            <li><strong>활동 만들기:</strong> 학급 선택 후 "+ 새 활동" 버튼 클릭</li>
                            <li><strong>수업 시작:</strong> 활동의 "입장" 버튼으로 워크스페이스 이동</li>
                        </ol>
                    </GuideSection>

                    {/* Class Management */}
                    <GuideSection title="📚 학급 관리">
                        <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>학급 생성</h4>
                        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                            <li>학급 이름은 자유롭게 설정 (예: "4학년 1반 미술")</li>
                            <li>초대 코드는 자동 생성 (6자리 영문/숫자)</li>
                            <li>여러 학급 동시 관리 가능</li>
                        </ul>
                        <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>학생 관리</h4>
                        <ul style={{ paddingLeft: '1.5rem' }}>
                            <li>학생이 초대 코드로 가입 신청 → 선생님이 승인</li>
                            <li>승인된 학생 수와 대기 중인 학생 수 확인 가능</li>
                        </ul>
                    </GuideSection>

                    {/* Session/Activity */}
                    <GuideSection title="📝 활동(세션) 만들기">
                        <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>활동 기능 선택</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                            <thead>
                                <tr style={{ background: '#f8f8f8' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>기능</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>설명</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>🖌️ AI 그림</td><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>학생이 프롬프트 작성 → 선생님 승인 → AI 이미지 생성</td></tr>
                                <tr><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>👁️ 작품 분석</td><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>학생이 작품 업로드 → AI가 색상, 구도 등 분석</td></tr>
                                <tr><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>💬 챗봇</td><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>AI와 대화하며 미술 학습 (성격 커스터마이징 가능)</td></tr>
                                <tr><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>🔄 감상 루프</td><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>4단계 감상 활동 (관찰→재창조→비교→성찰)</td></tr>
                                <tr><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>✏️ 표현 도우미</td><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>학생 글을 AI가 문학적으로 다듬기</td></tr>
                            </tbody>
                        </table>
                        <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>설정 항목</h4>
                        <ul style={{ paddingLeft: '1.5rem' }}>
                            <li><strong>작품 분석 프롬프트:</strong> AI가 작품을 분석할 때의 지침</li>
                            <li><strong>표현 도우미 프롬프트:</strong> AI가 글을 다듬을 때의 방향</li>
                            <li><strong>챗봇 성격:</strong> AI 챗봇의 페르소나 설정 (예: "미술관 큐레이터")</li>
                            <li><strong>참조 이미지 URL:</strong> 감상 루프에서 사용할 작품 이미지</li>
                            <li><strong>참고 영상 URL:</strong> YouTube 등 영상 임베드 가능</li>
                        </ul>
                    </GuideSection>

                    {/* AI Image Generation */}
                    <GuideSection title="🤖 AI 그림 생성 워크플로우">
                        <div style={{ background: '#f8f8f8', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                            <p style={{ margin: 0, textAlign: 'center' }}>
                                📝 학생 프롬프트 작성 → ⏳ 대기 → ✅ 선생님 승인 → 🤖 AI 생성 → 👀 검토 → 📤 학생에게 공개
                            </p>
                        </div>
                        <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>선생님 역할</h4>
                        <ul style={{ paddingLeft: '1.5rem' }}>
                            <li>부적절한 프롬프트 거절 (사유 입력 가능)</li>
                            <li>"🤖 AI 이미지 생성" 버튼으로 Gemini AI가 자동 생성</li>
                            <li>생성된 이미지 검토 후 학생에게 공개</li>
                            <li>공개 시 <strong>Ground 포인트 50점</strong> 자동 부여</li>
                            <li>작품 수에 따라 <strong>자동 뱃지</strong> 부여</li>
                        </ul>
                    </GuideSection>

                    {/* Badge System */}
                    <GuideSection title="🏆 뱃지 시스템">
                        <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>커스텀 뱃지</h4>
                        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                            <li>"뱃지" 탭에서 학급별 커스텀 뱃지 생성</li>
                            <li>뱃지 이름, 아이콘 URL, 설명 설정</li>
                            <li>학생 목록에서 뱃지 아이콘 클릭으로 수여</li>
                        </ul>
                        <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>자동 뱃지</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8f8f8' }}>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>뱃지</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>조건</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>🎨 Beginner Artist</td><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>첫 작품 공개</td></tr>
                                <tr><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>🖌️ Prolific Painter</td><td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>5개 작품 공개</td></tr>
                            </tbody>
                        </table>
                    </GuideSection>

                    {/* Presentation Mode */}
                    <GuideSection title="🎬 발표 모드">
                        <ul style={{ paddingLeft: '1.5rem' }}>
                            <li>"발표" 탭에서 활동 선택</li>
                            <li>공개된 학생 작품을 슬라이드쇼로 발표</li>
                            <li>자동 재생 / 수동 넘기기 가능</li>
                            <li>전체화면 지원</li>
                            <li>배경 음악 켜기/끄기</li>
                        </ul>
                    </GuideSection>

                    {/* Student Features */}
                    <GuideSection title="👨‍🎓 학생 기능 안내">
                        <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>학생 대시보드</h4>
                        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                            <li>초대 코드로 학급 가입 신청</li>
                            <li>가입한 학급의 활동 목록 확인</li>
                            <li>획득한 뱃지 표시</li>
                        </ul>
                        <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>학생 갤러리</h4>
                        <ul style={{ paddingLeft: '1.5rem' }}>
                            <li>내 작품을 3D 갤러리에서 감상</li>
                            <li>작품 상세 정보 확인</li>
                            <li>📄 PDF 포트폴리오 다운로드</li>
                        </ul>
                    </GuideSection>

                    {/* Tips */}
                    <GuideSection title="💡 활용 팁">
                        <ul style={{ paddingLeft: '1.5rem' }}>
                            <li>🎨 <strong>테마 변경:</strong> 상단 테마 선택으로 분위기 변경</li>
                            <li>📱 <strong>모바일 지원:</strong> 태블릿/스마트폰에서도 사용 가능</li>
                            <li>🔗 <strong>참고 영상:</strong> YouTube URL을 활동에 추가하면 자동 임베드</li>
                            <li>📊 <strong>Ground 연동:</strong> .env에 API 키 설정 시 포인트 자동 부여</li>
                        </ul>
                    </GuideSection>

                    <div style={{ textAlign: 'center', marginTop: '2rem', padding: '1.5rem', background: '#f8f8f8', borderRadius: '1rem' }}>
                        <p style={{ margin: 0, color: 'var(--text-sub)' }}>© 2025 서울신답초등학교 정용석 · Total Visual Art</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
