import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Paintbrush, LogIn, LogOut, Home, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    // 학생 화면(/join, /student/*)에서는 교사용 로그인 버튼을 숨긴다
    const isStudentRoute = location.pathname.startsWith('/join') || location.pathname.startsWith('/student');

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <nav className="navbar">
            <div className="nav-container">
                <Link to="/" className="nav-logo">
                    <Paintbrush size={24} />
                    <span>봄·봄·봄 스튜디오</span>
                </Link>
                <div className="nav-links">
                    <Link to="/" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Home size={16} /> 홈
                    </Link>

                    {currentUser ? (
                        <>
                            <Link to="/dashboard" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <BookOpen size={16} /> 내 수업
                            </Link>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                                    {currentUser.displayName || currentUser.email}
                                </span>
                                <button onClick={handleLogout} className="btn-login" style={{ background: 'var(--text-sub)' }}>
                                    <LogOut size={16} />
                                    <span>로그아웃</span>
                                </button>
                            </div>
                        </>
                    ) : !isStudentRoute && (
                        <Link to="/login" className="btn-login" style={{ textDecoration: 'none' }}>
                            <LogIn size={18} />
                            <span>로그인</span>
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
