import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAuthService } from '../services/studentAuthService';
import { LogOut, CheckCircle } from 'lucide-react';

// 학생 활동 화면 (토큰 기반). 다음 단계에서 기존 활동 기능(감상 루프·이미지 생성·챗봇)이 여기에 연결된다.
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '1rem' }}>
            <div style={{ background: 'var(--card-bg)', borderRadius: '1.5rem', boxShadow: 'var(--shadow)', padding: '2.5rem', width: '100%', maxWidth: '640px', textAlign: 'center' }}>
                <CheckCircle size={52} color="#10b981" />
                <h1 style={{ margin: '1rem 0 0.5rem', color: 'var(--text-main)' }}>입장 완료!</h1>
                <p style={{ fontSize: '1.3rem', color: 'var(--text-main)', margin: '0.25rem 0' }}>
                    {info.className} · <strong>{info.studentNo}번</strong>
                </p>
                <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary)', margin: '0.75rem 0 1.5rem' }}>
                    {info.sessionTitle}
                </p>
                <p style={{ color: 'var(--text-sub)', marginBottom: '2rem' }}>
                    활동 화면을 준비하고 있어요. 선생님 안내를 기다려 주세요.
                </p>
                <button onClick={handleLeave} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', border: '1px solid #ddd', background: 'white', color: 'var(--text-main)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    <LogOut size={18} /> 나가기
                </button>
            </div>
        </div>
    );
};

export default StudentSession;
