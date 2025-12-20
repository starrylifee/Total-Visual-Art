import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme, themes } from '../context/ThemeContext';
import { classService } from '../services/classService';
import { sessionService } from '../services/sessionService';
import { badgeService } from '../services/badgeService';
import { Plus, Users, Settings, Award, Palette } from 'lucide-react';

const TeacherDashboard = () => {
    const { currentUser } = useAuth();
    const { currentTheme, switchTheme } = useTheme();

    const [classes, setClasses] = useState([]);
    const [newClassName, setNewClassName] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [pendingStudents, setPendingStudents] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [newSessionData, setNewSessionData] = useState({
        title: '', visionPrompt: '', textPrompt: '', chatbotInstruction: '', referenceImageUrl: '',
        features: { vision: true, imageGen: true, chat: true, appreciation: true }
    });

    // Badge State
    const [activeTab, setActiveTab] = useState('classes');
    const [badges, setBadges] = useState([]);
    const [newBadge, setNewBadge] = useState({ name: '', iconUrl: '', description: '' });

    useEffect(() => {
        fetchClasses();
    }, [currentUser]);

    const fetchClasses = async () => {
        if (currentUser) {
            const data = await classService.getTeacherClasses(currentUser.uid);
            setClasses(data);
        }
    };

    const handleCreateClass = async () => {
        if (!newClassName) return;
        try {
            await classService.createClass(currentUser.uid, newClassName);
            setShowCreateModal(false);
            setNewClassName('');
            fetchClasses();
        } catch (error) {
            alert("학급 생성에 실패했습니다.");
        }
    };

    const handleSelectClass = async (cls) => {
        setSelectedClass(cls);
        if (cls.pendingStudents && cls.pendingStudents.length > 0) {
            const students = await classService.getPendingStudents(cls.pendingStudents);
            setPendingStudents(students);
        } else {
            setPendingStudents([]);
        }
        const classSessions = await sessionService.getClassSessions(cls.id);
        setSessions(classSessions);
    };

    const handleApprove = async (studentId) => {
        if (!selectedClass) return;
        await classService.approveStudent(selectedClass.id, studentId);
        const updatedClasses = await classService.getTeacherClasses(currentUser.uid);
        const updatedSelected = updatedClasses.find(c => c.id === selectedClass.id);
        setClasses(updatedClasses);
        handleSelectClass(updatedSelected);
    };

    const handleCreateSession = async () => {
        if (!selectedClass || !newSessionData.title) return;
        await sessionService.createSession(selectedClass.id, newSessionData);
        setShowSessionModal(false);
        setNewSessionData({ title: '', visionPrompt: '', textPrompt: '', chatbotInstruction: '', referenceImageUrl: '', features: { vision: true, imageGen: true, chat: true, appreciation: true } });
        const classSessions = await sessionService.getClassSessions(selectedClass.id);
        setSessions(classSessions);
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
    };

    const handleAwardBadge = async (studentId, badge) => {
        if (confirm(`"${badge.name}" 뱃지를 이 학생에게 수여할까요?`)) {
            await badgeService.awardBadge(selectedClass.id, studentId, badge);
            alert("뱃지가 수여되었습니다!");
        }
    };

    return (
        <div className="dashboard-container" style={{ padding: '1rem' }}>
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
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '2rem',
                            border: 'none',
                            background: activeTab === 'classes' ? 'var(--primary)' : 'var(--card-bg)',
                            color: activeTab === 'classes' ? 'white' : 'var(--text-main)',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                        onClick={() => setActiveTab('classes')}
                    >
                        📚 학급 관리
                    </button>
                    <button
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '2rem',
                            border: 'none',
                            background: activeTab === 'badges' ? 'var(--primary)' : 'var(--card-bg)',
                            color: activeTab === 'badges' ? 'white' : 'var(--text-main)',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                        onClick={() => setActiveTab('badges')}
                    >
                        🏆 뱃지 관리
                    </button>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'var(--primary)', color: 'white', border: 'none',
                            padding: '0.5rem 1rem', borderRadius: '2rem', cursor: 'pointer', fontWeight: '600'
                        }}
                    >
                        <Plus size={16} /> 새 학급
                    </button>
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
                            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowCreateModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>취소</button>
                            <button onClick={handleCreateClass} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer' }}>만들기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Session Modal */}
            {showSessionModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
                    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '1rem', width: '450px', maxHeight: '80vh', overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
                        <h3 style={{ marginBottom: '1rem' }}>📝 새 활동 만들기</h3>

                        {/* Feature Toggles */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', padding: '0.75rem', background: '#f8f8f8', borderRadius: '0.5rem' }}>
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
                                <input type="checkbox" checked={newSessionData.features?.appreciation} onChange={e => setNewSessionData({ ...newSessionData, features: { ...newSessionData.features, appreciation: e.target.checked } })} /> 감상 루프
                            </label>
                        </div>

                        <input value={newSessionData.title} onChange={e => setNewSessionData({ ...newSessionData, title: e.target.value })} placeholder="활동 제목 (예: 반 고흐 감상)" style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />

                        {newSessionData.features?.vision && (
                            <textarea value={newSessionData.visionPrompt} onChange={e => setNewSessionData({ ...newSessionData, visionPrompt: e.target.value })} placeholder="작품 분석 AI 프롬프트" style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd', minHeight: '60px' }} />
                        )}

                        {newSessionData.features?.appreciation && (
                            <input value={newSessionData.referenceImageUrl || ''} onChange={e => setNewSessionData({ ...newSessionData, referenceImageUrl: e.target.value })} placeholder="감상 작품 이미지 URL (선택)" style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }} />
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowSessionModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>취소</button>
                            <button onClick={handleCreateSession} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer' }}>만들기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Classes Tab */}
            {activeTab === 'classes' && (
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    {/* Class List */}
                    <div style={{ flex: '1 1 300px', minWidth: '280px' }}>
                        <h2 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>📚 내 학급</h2>
                        {classes.length === 0 ? <p style={{ color: 'var(--text-sub)' }}>아직 학급이 없습니다. 새 학급을 만들어보세요!</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {classes.map(cls => (
                                    <div key={cls.id} onClick={() => handleSelectClass(cls)} style={{
                                        padding: '1rem', borderRadius: '1rem', cursor: 'pointer',
                                        border: selectedClass?.id === cls.id ? '2px solid var(--primary)' : '1px solid #eee',
                                        background: 'var(--card-bg)', boxShadow: 'var(--shadow)',
                                        transition: 'all 0.2s'
                                    }}>
                                        <h3 style={{ margin: 0, color: 'var(--text-main)' }}>{cls.name}</h3>
                                        <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: 'var(--text-sub)' }}>
                                            초대 코드: <strong style={{ color: 'var(--primary)' }}>{cls.inviteCode}</strong>
                                        </p>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                                            <span><Users size={14} /> {cls.students?.length || 0}명</span>
                                            {cls.pendingStudents?.length > 0 && <span style={{ color: 'var(--accent)' }}>⏳ {cls.pendingStudents.length}명 대기</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Class Detail */}
                    <div style={{ flex: '2 1 400px', minWidth: '300px', background: 'var(--card-bg)', borderRadius: '1rem', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
                        {selectedClass ? (
                            <>
                                <h2 style={{ color: 'var(--text-main)', marginBottom: '1.5rem' }}>{selectedClass.name} 관리</h2>

                                {/* Pending Students */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ color: 'var(--text-main)' }}>⏳ 승인 대기</h3>
                                    {pendingStudents.length === 0 ? <p style={{ color: 'var(--text-sub)' }}>대기 중인 학생이 없습니다.</p> : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {pendingStudents.map(s => (
                                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#fff9f0', borderRadius: '0.5rem' }}>
                                                    <span>{s.displayName || s.email}</span>
                                                    <button onClick={() => handleApprove(s.id)} style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontWeight: '500' }}>승인</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Sessions */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ color: 'var(--text-main)', margin: 0 }}>📝 활동 목록</h3>
                                        <button onClick={() => setShowSessionModal(true)} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: '500' }}>+ 새 활동</button>
                                    </div>
                                    {sessions.length === 0 ? <p style={{ color: 'var(--text-sub)' }}>아직 활동이 없습니다.</p> : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {sessions.map(sess => (
                                                <div key={sess.id} style={{ padding: '1rem', background: '#f8f8f8', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <strong>{sess.title}</strong>
                                                        <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: 'var(--text-sub)' }}>
                                                            {sess.createdAt?.toDate().toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <a href={`/class/${selectedClass.id}/session/${sess.id}`} style={{ padding: '0.5rem 1rem', borderRadius: '1rem', background: 'var(--primary)', color: 'white', textDecoration: 'none', fontWeight: '500' }}>입장</a>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
                        <p style={{ color: 'var(--text-sub)', textAlign: 'center', padding: '2rem' }}>👈 먼저 '학급 관리' 탭에서 학급을 선택해주세요.</p>
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
                                <p style={{ color: 'var(--text-sub)', marginBottom: '1rem' }}>학생을 선택하고 뱃지 아이콘을 클릭하세요.</p>
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
        </div>
    );
};

export default TeacherDashboard;
