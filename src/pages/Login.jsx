import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { School, GraduationCap } from 'lucide-react';

// 교사 전용 로그인. 학생은 /join에서 활동코드로 입장한다.
const Login = () => {
    const { loginWithGoogle, currentUser } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (currentUser) {
            navigate('/dashboard');
        }
    }, [currentUser, navigate]);

    const handleLogin = async () => {
        try {
            setError('');
            await loginWithGoogle('teacher');
            navigate('/dashboard');
        } catch (err) {
            setError('로그인에 실패했습니다. 다시 시도해주세요.');
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '80vh', gap: '2rem', padding: '1rem'
        }}>
            <h1 style={{ color: 'var(--text-main)' }}>🎨 어떻게 오셨나요?</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link to="/join" style={{ textDecoration: 'none' }}>
                    <div style={{
                        padding: '2rem', border: '2px solid var(--primary)', borderRadius: '1.5rem', cursor: 'pointer',
                        textAlign: 'center', width: '220px', background: 'var(--card-bg)', boxShadow: 'var(--shadow)'
                    }}>
                        <GraduationCap size={48} color="var(--primary)" />
                        <h2 style={{ color: 'var(--text-main)' }}>학생</h2>
                        <p style={{ color: 'var(--text-sub)' }}>활동 코드로 입장해요<br />(로그인 필요 없음)</p>
                    </div>
                </Link>

                <div onClick={handleLogin} style={{
                    padding: '2rem', border: '2px solid var(--accent)', borderRadius: '1.5rem', cursor: 'pointer',
                    textAlign: 'center', width: '220px', background: 'var(--card-bg)', boxShadow: 'var(--shadow)'
                }}>
                    <School size={48} color="var(--accent)" />
                    <h2 style={{ color: 'var(--text-main)' }}>선생님</h2>
                    <p style={{ color: 'var(--text-sub)' }}>구글 계정으로 로그인</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
