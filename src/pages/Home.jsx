import React from 'react';
import { Link } from 'react-router-dom';
import { Palette, Sparkles } from 'lucide-react';

const Home = () => {
    return (
        <div className="home-page" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
            textAlign: 'center',
            gap: '2rem'
        }}>
            <div className="hero-icon" style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                borderRadius: '50%',
                padding: '2rem',
                boxShadow: '0 20px 40px rgba(244, 114, 182, 0.3)'
            }}>
                <Palette size={64} color="#fff" />
            </div>

            <header className="hero">
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎨 우리 반 미술 교실</h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-sub)' }}>
                    AI와 함께 감상하고, 창작하고, 나누어요!
                </p>
            </header>

            <div className="hero-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link to="/join" className="btn-primary" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'var(--primary)',
                    color: 'white',
                    padding: '1rem 2.5rem',
                    borderRadius: '2rem',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '1.2rem',
                    boxShadow: '0 4px 15px rgba(244, 114, 182, 0.4)'
                }}>
                    <Sparkles size={20} />
                    학생 입장 (활동 코드)
                </Link>
                <Link to="/login" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    border: '2px solid var(--accent)',
                    padding: '1rem 2rem',
                    borderRadius: '2rem',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '1.1rem'
                }}>
                    👩‍🏫 선생님 로그인
                </Link>
            </div>

            <div className="feature-cards" style={{
                display: 'flex',
                gap: '1.5rem',
                marginTop: '2rem',
                flexWrap: 'wrap',
                justifyContent: 'center'
            }}>
                {[
                    { emoji: '👁️', title: '감상하기', desc: 'AI가 작품 분석을 도와줘요' },
                    { emoji: '🖌️', title: '창작하기', desc: '안전하게 AI 그림을 만들어요' },
                    { emoji: '🏆', title: '성장하기', desc: '뱃지와 갤러리로 성과를 쌓아요' }
                ].map((f, i) => (
                    <div key={i} style={{
                        background: 'var(--card-bg)',
                        padding: '1.5rem',
                        borderRadius: '1rem',
                        boxShadow: 'var(--shadow)',
                        width: '180px',
                        textAlign: 'center'
                    }}>
                        <span style={{ fontSize: '2rem' }}>{f.emoji}</span>
                        <h3 style={{ margin: '0.5rem 0' }}>{f.title}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)' }}>{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Home;
