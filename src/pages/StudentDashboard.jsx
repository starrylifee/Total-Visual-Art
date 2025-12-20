import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { classService } from '../services/classService';
import { sessionService } from '../services/sessionService';
import { badgeService } from '../services/badgeService';
import { generatePortfolioPDF } from '../services/pdfService';
import { doc, getDoc, collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Download } from 'lucide-react';

// Lazy load 3D Gallery for performance
const Gallery3D = React.lazy(() => import('../components/Gallery3D'));

const StudentDashboard = () => {
    const { currentUser } = useAuth();
    const [inviteCode, setInviteCode] = useState('');
    const [message, setMessage] = useState('');
    const [enrolledClasses, setEnrolledClasses] = useState([]);
    const [activeSessions, setActiveSessions] = useState({});
    const [badges, setBadges] = useState([]);
    const [activeTab, setActiveTab] = useState('classes'); // 'classes' or 'gallery'
    const [myArtworks, setMyArtworks] = useState([]);
    const [selectedArtwork, setSelectedArtwork] = useState(null);

    useEffect(() => {
        if (currentUser) {
            fetchEnrolledClasses();
            fetchMyArtworks();
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

    const fetchMyArtworks = async () => {
        try {
            // Query all published generations by this student
            const q = query(
                collectionGroup(db, 'generationQueue'),
                where('studentId', '==', currentUser.uid),
                where('status', '==', 'published')
            );
            const snapshot = await getDocs(q);
            const artworks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMyArtworks(artworks);
        } catch (e) {
            console.error("Error fetching artworks", e);
        }
    };

    const handleExportPDF = async () => {
        try {
            const fileName = await generatePortfolioPDF(
                { displayName: currentUser?.displayName, email: currentUser?.email },
                myArtworks,
                badges
            );
            alert(`📄 포트폴리오가 다운로드되었습니다: ${fileName}`);
        } catch (e) {
            console.error("PDF 생성 오류:", e);
            alert("PDF 생성 중 오류가 발생했습니다.");
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

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => setActiveTab('classes')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '2rem',
                        border: 'none',
                        background: activeTab === 'classes' ? 'var(--primary)' : 'var(--card-bg)',
                        color: activeTab === 'classes' ? 'white' : 'var(--text-main)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        boxShadow: 'var(--shadow)'
                    }}
                >
                    🏫 내 학급
                </button>
                <button
                    onClick={() => setActiveTab('gallery')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '2rem',
                        border: 'none',
                        background: activeTab === 'gallery' ? 'var(--primary)' : 'var(--card-bg)',
                        color: activeTab === 'gallery' ? 'white' : 'var(--text-main)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        boxShadow: 'var(--shadow)'
                    }}
                >
                    🖼️ 내 갤러리 ({myArtworks.length})
                </button>
            </div>

            {/* Classes Tab */}
            {activeTab === 'classes' && (
                <>
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
                </>
            )}

            {/* Gallery Tab */}
            {activeTab === 'gallery' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h2 style={{ color: 'var(--text-main)', margin: 0 }}>🖼️ 나의 3D 갤러리</h2>
                        {myArtworks.length > 0 && (
                            <button
                                onClick={handleExportPDF}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.5rem',
                                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '2rem',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    boxShadow: 'var(--shadow)'
                                }}
                            >
                                <Download size={18} />
                                📄 포트폴리오 PDF 다운로드
                            </button>
                        )}
                    </div>

                    {myArtworks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--card-bg)', borderRadius: '1rem', boxShadow: 'var(--shadow)' }}>
                            <p style={{ fontSize: '3rem', margin: 0 }}>🎨</p>
                            <p style={{ color: 'var(--text-sub)' }}>아직 완성된 작품이 없어요.<br />수업에 참여해서 첫 작품을 만들어보세요!</p>
                        </div>
                    ) : (
                        <>
                            {/* 3D Gallery */}
                            <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
                                <Suspense fallback={
                                    <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <p>🎨 갤러리 로딩 중...</p>
                                    </div>
                                }>
                                    <Gallery3D
                                        artworks={myArtworks}
                                        onSelectArtwork={(art) => setSelectedArtwork(art)}
                                    />
                                </Suspense>
                            </div>

                            <p style={{ color: 'var(--text-sub)', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                💡 마우스로 드래그해서 둘러보고, 스크롤로 확대/축소하세요!
                            </p>

                            {/* Selected Artwork Detail */}
                            {selectedArtwork && (
                                <div style={{
                                    marginTop: '1.5rem',
                                    background: 'var(--card-bg)',
                                    borderRadius: '1rem',
                                    padding: '1.5rem',
                                    boxShadow: 'var(--shadow)',
                                    display: 'flex',
                                    gap: '1.5rem',
                                    flexWrap: 'wrap'
                                }}>
                                    <img
                                        src={selectedArtwork.imageUrl}
                                        alt={selectedArtwork.prompt}
                                        style={{ flex: '1 1 200px', maxWidth: '300px', borderRadius: '0.5rem' }}
                                    />
                                    <div style={{ flex: '2 1 300px' }}>
                                        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)' }}>✨ 작품 상세</h3>
                                        <p><strong>프롬프트:</strong> {selectedArtwork.prompt}</p>
                                        <p><strong>생성일:</strong> {selectedArtwork.createdAt?.toDate?.()?.toLocaleDateString() || '알 수 없음'}</p>
                                        <button
                                            onClick={() => setSelectedArtwork(null)}
                                            style={{ marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--primary)', background: 'white', color: 'var(--primary)', cursor: 'pointer' }}
                                        >
                                            닫기
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Artwork Grid (2D fallback) */}
                            <h3 style={{ marginTop: '2rem', color: 'var(--text-main)' }}>📋 모든 작품 ({myArtworks.length}개)</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                {myArtworks.map(art => (
                                    <div
                                        key={art.id}
                                        onClick={() => setSelectedArtwork(art)}
                                        style={{
                                            background: 'var(--card-bg)',
                                            borderRadius: '0.5rem',
                                            overflow: 'hidden',
                                            boxShadow: 'var(--shadow)',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s'
                                        }}
                                    >
                                        <img src={art.imageUrl} alt={art.prompt} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                                        <p style={{ padding: '0.5rem', margin: 0, fontSize: '0.75rem', color: 'var(--text-sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {art.prompt?.substring(0, 30)}...
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
