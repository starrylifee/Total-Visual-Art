import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAuthService } from '../services/studentAuthService';
import StudentWorkspace from '../components/StudentWorkspace';
import { EXTERNAL_LINKS } from '../data/externalLinks';
import { LogOut } from 'lucide-react';

// 학생 활동 화면 (토큰 기반)
const StudentSession = () => {
    const navigate = useNavigate();
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        studentAuthService.restore().then((restored) => {
            if (!restored) {
                navigate('/join', { replace: true });
                return;
            }
            setInfo(restored);
            setLoading(false);
        });
    }, [navigate]);

    const handleLeave = () => {
        studentAuthService.clear();
        navigate('/join', { replace: true });
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '4rem', fontSize: '1.3rem', color: 'var(--text-sub)' }}>입장 확인 중...</div>;
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', minHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                padding: '1.25rem 2rem', borderRadius: '1rem', marginBottom: '1.5rem', color: 'white',
                boxShadow: 'var(--shadow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.6rem' }}>📚 {info.sessionTitle}</h1>
                    <p style={{ margin: '0.4rem 0 0', opacity: 0.9 }}>{info.className} · {info.studentNo}번</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <a
                        href={EXTERNAL_LINKS.unicorn.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '2rem', background: 'rgba(255,255,255,0.25)', color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                    >
                        {EXTERNAL_LINKS.unicorn.emoji} {EXTERNAL_LINKS.unicorn.label}
                    </a>
                    <button onClick={handleLeave} style={{ padding: '0.6rem 1.2rem', borderRadius: '2rem', border: 'none', background: 'rgba(255,255,255,0.25)', color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                        <LogOut size={16} /> 나가기
                    </button>
                </div>
            </header>
            <StudentWorkspace session={info} />
        </div>
    );
};

export default StudentSession;
