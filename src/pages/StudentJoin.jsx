import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAuthService } from '../services/studentAuthService';
import { KeyRound, Hash, Lock, ArrowLeft } from 'lucide-react';

// 학생 입장: 활동코드 -> 출석번호 -> 비밀번호(최초 설정 / 재입장 확인)
const StudentJoin = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('code'); // code | number | password
    const [code, setCode] = useState('');
    const [activity, setActivity] = useState(null); // lookup 결과
    const [studentNo, setStudentNo] = useState(null);
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const codeRef = useRef(null);
    const pwRef = useRef(null);
    const pw2Ref = useRef(null);

    useEffect(() => {
        // 이미 유효한 토큰이 있으면 바로 세션으로
        studentAuthService.restore().then((restored) => {
            if (restored) navigate('/student/session', { replace: true });
        });
    }, [navigate]);

    useEffect(() => {
        if (step === 'code') codeRef.current?.focus();
        if (step === 'password') pwRef.current?.focus();
    }, [step]);

    const isNewStudent = activity && studentNo != null && !activity.registered?.includes(studentNo);

    const handleLookup = async () => {
        if (!code.trim() || busy) return;
        setBusy(true);
        setError('');
        try {
            const data = await studentAuthService.lookup(code);
            setActivity(data);
            setStep('number');
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const handlePickNumber = (no) => {
        setStudentNo(no);
        setPassword('');
        setPasswordConfirm('');
        setError('');
        setStep('password');
    };

    const handleJoin = async () => {
        if (busy) return;
        if (!/^\d{4}$/.test(password)) {
            setError('비밀번호는 숫자 4자리예요.');
            return;
        }
        if (isNewStudent && password !== passwordConfirm) {
            setError('두 번 입력한 비밀번호가 서로 달라요.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            await studentAuthService.join(activity.code, studentNo, password);
            navigate('/student/session', { replace: true });
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const card = {
        background: 'var(--card-bg)', borderRadius: '1.5rem', boxShadow: 'var(--shadow)',
        padding: '2.5rem', width: '100%', maxWidth: '640px', textAlign: 'center'
    };
    const bigInput = {
        width: '100%', padding: '1rem', fontSize: '2rem', textAlign: 'center',
        borderRadius: '0.75rem', border: '2px solid #ddd', letterSpacing: '0.3em'
    };
    const primaryBtn = (disabled) => ({
        marginTop: '1.25rem', width: '100%', padding: '1rem', fontSize: '1.3rem', fontWeight: 700,
        borderRadius: '0.75rem', border: 'none', background: 'var(--primary)', color: 'white',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1
    });

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '1rem' }}>
            <div style={card}>
                {step === 'code' && (
                    <>
                        <KeyRound size={44} color="var(--primary)" />
                        <h1 style={{ margin: '1rem 0 0.5rem', color: 'var(--text-main)' }}>활동 코드를 입력하세요</h1>
                        <p style={{ color: 'var(--text-sub)', marginBottom: '1.5rem' }}>선생님이 알려준 6자리 코드예요</p>
                        <input
                            ref={codeRef}
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                            placeholder="ABC123"
                            style={bigInput}
                        />
                        <button onClick={handleLookup} disabled={busy || !code.trim()} style={primaryBtn(busy || !code.trim())}>
                            {busy ? '확인 중...' : '다음'}
                        </button>
                    </>
                )}

                {step === 'number' && activity && (
                    <>
                        <Hash size={44} color="var(--primary)" />
                        <h1 style={{ margin: '1rem 0 0.25rem', color: 'var(--text-main)' }}>{activity.sessionTitle}</h1>
                        <p style={{ color: 'var(--text-sub)', marginBottom: '1.5rem' }}>{activity.className} · 자기 출석번호를 고르세요</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '0.6rem' }}>
                            {Array.from({ length: activity.studentCount }, (_, i) => i + 1).map((no) => (
                                <button
                                    key={no}
                                    onClick={() => handlePickNumber(no)}
                                    style={{
                                        padding: '0.9rem 0', fontSize: '1.4rem', fontWeight: 700, borderRadius: '0.75rem',
                                        border: '2px solid var(--primary)', cursor: 'pointer',
                                        background: activity.registered?.includes(no) ? 'var(--primary)' : 'white',
                                        color: activity.registered?.includes(no) ? 'white' : 'var(--primary)'
                                    }}
                                    title={activity.registered?.includes(no) ? '비밀번호 입력하고 입장' : '처음 입장 (비밀번호 만들기)'}
                                >
                                    {no}
                                </button>
                            ))}
                        </div>
                        <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem', marginTop: '1rem' }}>
                            색칠된 번호 = 이미 비밀번호를 만든 친구
                        </p>
                        <button onClick={() => { setStep('code'); setError(''); }} style={{ marginTop: '0.5rem', border: 'none', background: 'none', color: 'var(--text-sub)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ArrowLeft size={16} /> 코드 다시 입력
                        </button>
                    </>
                )}

                {step === 'password' && activity && (
                    <>
                        <Lock size={44} color="var(--primary)" />
                        <h1 style={{ margin: '1rem 0 0.25rem', color: 'var(--text-main)' }}>{studentNo}번</h1>
                        <p style={{ color: 'var(--text-sub)', marginBottom: '1.5rem' }}>
                            {isNewStudent
                                ? '처음이네요! 비밀번호(숫자 4자리)를 만들어 주세요. 다음에 또 쓰니까 꼭 기억해요.'
                                : '비밀번호(숫자 4자리)를 입력하세요.'}
                        </p>
                        <input
                            ref={pwRef}
                            type="password"
                            inputMode="numeric"
                            value={password}
                            onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            onKeyDown={(e) => {
                                if (e.key !== 'Enter') return;
                                if (isNewStudent) pw2Ref.current?.focus();
                                else handleJoin();
                            }}
                            placeholder="● ● ● ●"
                            style={bigInput}
                        />
                        {isNewStudent && (
                            <input
                                ref={pw2Ref}
                                type="password"
                                inputMode="numeric"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                                placeholder="한 번 더 입력"
                                style={{ ...bigInput, marginTop: '0.75rem', fontSize: '1.5rem' }}
                            />
                        )}
                        <button onClick={handleJoin} disabled={busy} style={primaryBtn(busy)}>
                            {busy ? '입장 중...' : '입장하기'}
                        </button>
                        <button onClick={() => { setStep('number'); setError(''); }} style={{ marginTop: '0.75rem', border: 'none', background: 'none', color: 'var(--text-sub)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ArrowLeft size={16} /> 번호 다시 고르기
                        </button>
                    </>
                )}

                {error && <p style={{ color: '#ef4444', marginTop: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>{error}</p>}
            </div>
        </div>
    );
};

export default StudentJoin;
