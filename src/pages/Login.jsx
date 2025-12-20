import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, School } from 'lucide-react';

const Login = () => {
    const { loginWithGoogle, currentUser } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    // Auto-redirect if already logged in
    React.useEffect(() => {
        if (currentUser) {
            navigate('/dashboard');
        }
    }, [currentUser, navigate]);

    const handleLogin = async (role) => {
        try {
            setError('');
            await loginWithGoogle(role);
            navigate('/dashboard');
        } catch (err) {
            setError('로그인에 실패했습니다. 다시 시도해주세요.');
        }
    };

    return (
        <div className="login-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            gap: '2rem'
        }}>
            <h1 style={{ color: 'var(--text-main)' }}>🎨 역할을 선택하세요</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <div className="role-cards" style={{ display: 'flex', gap: '2rem' }}>
                {/* 학생 카드 */}
                <div className="card" onClick={() => handleLogin('student')} style={{
                    padding: '2rem',
                    border: '2px solid var(--primary)',
                    borderRadius: '1.5rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s',
                    width: '200px',
                    background: 'var(--card-bg)',
                    boxShadow: 'var(--shadow)'
                }}>
                    <GraduationCap size={48} color="var(--primary)" />
                    <h2 style={{ color: 'var(--text-main)' }}>학생</h2>
                    <p style={{ color: 'var(--text-sub)' }}>수업에 참여하고 배워요</p>
                </div>

                {/* 선생님 카드 */}
                <div className="card" onClick={() => handleLogin('teacher')} style={{
                    padding: '2rem',
                    border: '2px solid var(--accent)',
                    borderRadius: '1.5rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s',
                    width: '200px',
                    background: 'var(--card-bg)',
                    boxShadow: 'var(--shadow)'
                }}>
                    <School size={48} color="var(--accent)" />
                    <h2 style={{ color: 'var(--text-main)' }}>선생님</h2>
                    <p style={{ color: 'var(--text-sub)' }}>학급과 수업을 관리해요</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
