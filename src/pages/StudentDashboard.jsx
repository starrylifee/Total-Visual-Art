import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { classService } from '../services/classService';
import { sessionService } from '../services/sessionService';
import { badgeService } from '../services/badgeService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const StudentDashboard = () => {
    const { currentUser } = useAuth();
    const [inviteCode, setInviteCode] = useState('');
    const [message, setMessage] = useState('');
    const [enrolledClasses, setEnrolledClasses] = useState([]);
    const [activeSessions, setActiveSessions] = useState({});
    const [badges, setBadges] = useState([]);

    useEffect(() => {
        if (currentUser) {
            fetchEnrolledClasses();
        }
    }, [currentUser]);

    const fetchEnrolledClasses = async () => {
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();

                // Load Badges
                const myBadges = await badgeService.getStudentBadges(currentUser.uid);
                setBadges(myBadges);

                if (userData.enrolledClasses && userData.enrolledClasses.length > 0) {
                    const classes = await classService.getEnrolledClasses(userData.enrolledClasses);
                    setEnrolledClasses(classes);

                    // Fetch active sessions for each class
                    const sessionsMap = {};
                    for (const cls of classes) {
                        const sess = await sessionService.getActiveSessions(cls.id);
                        sessionsMap[cls.id] = sess;
                    }
                    setActiveSessions(sessionsMap);
                }
            }
        } catch (e) {
            console.error("Error loading classes", e);
        }
    };

    const handleJoin = async () => {
        try {
            const result = await classService.joinClassRequest(currentUser.uid, inviteCode.trim().toUpperCase());
            setMessage(`✅ ${result.className} 학급에 가입 신청했어요! 선생님의 승인을 기다려주세요.`);
            setInviteCode('');
        } catch (e) {
            setMessage(`❌ 오류: ${e.message}`);
        }
    };

    return (
        <div className="dashboard-container" style={{ padding: '1rem' }}>
            {/* Header with Badges */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ color: 'var(--text-main)', margin: 0 }}>🎨 내 미술 교실</h1>
                    <p style={{ color: 'var(--text-sub)', margin: '0.5rem 0' }}>안녕, {currentUser?.displayName || '친구'}! 👋</p>
                </div>

                {/* Badge Display */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    background: 'var(--card-bg)',
                    padding: '0.75rem 1rem',
                    borderRadius: '2rem',
                    boxShadow: 'var(--shadow)',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-sub)' }}>🏆 내 뱃지:</span>
                    {badges.map((b, i) => (
                        <div key={i} title={b.name} style={{ textAlign: 'center' }}>
                            <img src={b.iconUrl || 'https://img.icons8.com/color/48/medal.png'} alt={b.name} style={{ width: '28px', height: '28px' }} />
                        </div>
                    ))}
                    {badges.length === 0 && <span style={{ color: 'var(--text-sub)', fontSize: '0.8rem' }}>아직 없어요!</span>}
                </div>
            </header>

            {/* Join Class Section */}
            <div style={{
                background: 'var(--card-bg)',
                padding: '1.5rem',
                borderRadius: '1rem',
                boxShadow: 'var(--shadow)',
                marginBottom: '2rem'
            }}>
                <h2 style={{ color: 'var(--text-main)', marginTop: 0 }}>📚 학급 가입하기</h2>
                <p style={{ color: 'var(--text-sub)' }}>선생님이 알려준 초대 코드를 입력하세요.</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <input
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="예: ABC123"
                        style={{
                            padding: '0.75rem 1rem',
                            fontSize: '1.1rem',
                            textTransform: 'uppercase',
                            borderRadius: '0.5rem',
                            border: '2px solid var(--primary)',
                            outline: 'none',
                            flex: '1',
                            minWidth: '150px'
                        }}
                    />
                    <button
                        onClick={handleJoin}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        가입 신청
                    </button>
                </div>
                {message && <p style={{ marginTop: '1rem', fontWeight: '500', color: message.includes('오류') ? '#ef4444' : 'var(--accent)' }}>{message}</p>}
            </div>

            {/* My Classes */}
            <div>
                <h2 style={{ color: 'var(--text-main)' }}>🏫 내가 들어간 학급</h2>
                {enrolledClasses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--card-bg)', borderRadius: '1rem', boxShadow: 'var(--shadow)' }}>
                        <p style={{ fontSize: '3rem', margin: 0 }}>📭</p>
                        <p style={{ color: 'var(--text-sub)' }}>아직 들어간 학급이 없어요.<br />위에서 초대 코드로 가입해보세요!</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {enrolledClasses.map(cls => (
                            <div key={cls.id} style={{
                                background: 'var(--card-bg)',
                                borderRadius: '1rem',
                                padding: '1.5rem',
                                boxShadow: 'var(--shadow)',
                                border: '2px solid var(--primary)'
                            }}>
                                <h3 style={{ color: 'var(--text-main)', marginTop: 0 }}>{cls.name}</h3>

                                <div style={{ marginTop: '1rem' }}>
                                    <h4 style={{ color: 'var(--text-sub)', marginBottom: '0.5rem' }}>📝 진행 중인 활동</h4>
                                    {activeSessions[cls.id]?.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {activeSessions[cls.id].map(sess => (
                                                <a
                                                    key={sess.id}
                                                    href={`/class/${cls.id}/session/${sess.id}`}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.75rem 1rem',
                                                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                                                        color: 'white',
                                                        textDecoration: 'none',
                                                        borderRadius: '0.5rem',
                                                        fontWeight: '600',
                                                        transition: 'transform 0.2s'
                                                    }}
                                                >
                                                    🚀 {sess.title} 참여하기
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem' }}>지금은 진행 중인 활동이 없어요.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;
