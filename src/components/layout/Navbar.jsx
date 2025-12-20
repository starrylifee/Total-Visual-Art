import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Paintbrush, LogIn, LogOut, Home, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

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
                    <span>우리 반 미술 교실</span>
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
                    ) : (
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
