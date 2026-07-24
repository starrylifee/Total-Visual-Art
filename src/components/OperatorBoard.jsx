import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { X, RefreshCw, Copy, Check, Film, ExternalLink } from 'lucide-react';

const POLL_MS = 30000;

/**
 * 모듈 3: 교사 오퍼레이터 보드 (AI 오퍼레이터 방식)
 * 학생이 제출한 영상 프롬프트를 복사해 KLING/FLOW에서 영상을 만들고, URL을 등록해 학생과 공유한다.
 * (영상 생성 API는 비용 문제로 쓰지 않는다 — 프롬프트까지만 앱, 생성은 교사가 대리)
 */
const OperatorBoard = ({ classId, session, onClose }) => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedId, setCopiedId] = useState(null);
    const [urlDrafts, setUrlDrafts] = useState({});
    const [savingId, setSavingId] = useState(null);

    const load = useCallback(async () => {
        try {
            const snap = await getDocs(collection(db, 'classes', classId, 'sessions', session.id, 'videoPrompts'));
            const list = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (parseInt(a.studentName) || 0) - (parseInt(b.studentName) || 0));
            setItems(list);
        } catch (e) {
            console.error('영상 보드 로드 실패:', e);
            alert('영상 프롬프트를 불러오지 못했습니다. Firestore 규칙이 최신인지 확인해 주세요.\n' + e.message);
        } finally {
            setIsLoading(false);
        }
    }, [classId, session.id]);

    useEffect(() => {
        load();
        const t = setInterval(load, POLL_MS);
        return () => clearInterval(t);
    }, [load]);

    const handleCopy = async (item) => {
        try {
            await navigator.clipboard.writeText(item.prompt || '');
            setCopiedId(item.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            alert('복사에 실패했어요. 프롬프트를 직접 드래그해 복사해 주세요.');
        }
    };

    const handleSaveUrl = async (item) => {
        const url = (urlDrafts[item.id] || '').trim();
        if (!/^https?:\/\//.test(url)) {
            alert('영상 URL은 https:// 로 시작해야 합니다.');
            return;
        }
        setSavingId(item.id);
        try {
            await updateDoc(doc(db, 'classes', classId, 'sessions', session.id, 'videoPrompts', item.id), {
                videoUrl: url, videoAddedAt: serverTimestamp(),
            });
            setItems(items.map(x => (x.id === item.id ? { ...x, videoUrl: url } : x)));
            setUrlDrafts({ ...urlDrafts, [item.id]: '' });
        } catch (e) {
            alert('URL 저장 실패: ' + e.message);
        } finally {
            setSavingId(null);
        }
    };

    const submitted = items.filter(x => x.status === 'submitted');
    const withVideo = submitted.filter(x => x.videoUrl);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 150 }}>
            <div style={{ background: 'var(--card-bg)', padding: '1.75rem', borderRadius: '1rem', width: '980px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}><Film size={18} style={{ verticalAlign: '-3px' }} /> 영상 오퍼레이터 보드 — {session.title}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={load} style={{ padding: '0.45rem 0.9rem', borderRadius: '2rem', border: '1px solid #ddd', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <RefreshCw size={14} /> 새로고침
                        </button>
                        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-sub)' }}><X size={22} /></button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.95rem' }}>
                    <span>제출 <strong>{submitted.length}</strong>명 · 영상 등록 <strong style={{ color: '#059669' }}>{withVideo.length}</strong>명</span>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
                        <a href="https://klingai.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>KLING <ExternalLink size={12} /></a>
                        <a href="https://labs.google/flow" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>FLOW <ExternalLink size={12} /></a>
                    </span>
                </div>
                <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                    사용법: ① 프롬프트 복사 → ② KLING/FLOW에서 영상 생성 → ③ 영상 링크를 붙여넣고 등록 → 학생 화면에 자동으로 나타납니다.
                </p>

                {isLoading ? <p style={{ color: 'var(--text-sub)' }}>불러오는 중...</p>
                : items.length === 0 ? <p style={{ color: 'var(--text-sub)' }}>아직 작성한 학생이 없습니다.</p>
                : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {items.map(item => (
                            <div key={item.id} style={{
                                padding: '1rem', borderRadius: '0.75rem', background: '#f8fafc',
                                border: item.videoUrl ? '2px solid #10b981' : item.status === 'submitted' ? '2px solid var(--accent)' : '1px solid #e2e8f0'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                                    <strong style={{ fontSize: '1.05rem' }}>{item.studentName}</strong>
                                    <span style={{ fontSize: '0.78rem', padding: '0.12rem 0.55rem', borderRadius: '1rem', background: '#e0e7ff', color: '#4338ca', fontWeight: 600 }}>
                                        {item.kind === 'storyboard' ? '🎞️ 스토리보드' : '🎬 인물의 하루'}
                                    </span>
                                    <span style={{
                                        fontSize: '0.8rem', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: '1rem',
                                        background: item.videoUrl ? '#d1fae5' : item.status === 'submitted' ? '#fef3c7' : '#e2e8f0',
                                        color: item.videoUrl ? '#059669' : item.status === 'submitted' ? '#d97706' : 'var(--text-sub)'
                                    }}>
                                        {item.videoUrl ? '✅ 영상 등록됨' : item.status === 'submitted' ? '📨 제출됨' : '✏️ 작성 중'}
                                    </span>
                                    {(item.feelings || item.situation || item.clothes) && (
                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-sub)' }}>
                                            관찰: {[item.feelings, item.situation, item.clothes].filter(Boolean).join(' · ').slice(0, 80)}
                                        </span>
                                    )}
                                </div>
                                {item.prompt ? (
                                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                                        <p style={{ flex: 1, margin: 0, whiteSpace: 'pre-wrap', background: 'white', borderRadius: '0.5rem', padding: '0.6rem 0.8rem', border: '1px solid #e2e8f0' }}>{item.prompt}</p>
                                        <button onClick={() => handleCopy(item)} title="프롬프트 복사"
                                            style={{ padding: '0.55rem 0.9rem', borderRadius: '0.6rem', border: 'none', background: copiedId === item.id ? '#10b981' : 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                                            {copiedId === item.id ? <><Check size={14} /> 복사됨</> : <><Copy size={14} /> 복사</>}
                                        </button>
                                    </div>
                                ) : (
                                    <p style={{ margin: 0, color: 'var(--text-sub)', fontSize: '0.9rem' }}>아직 영상 설명을 쓰지 않았어요.</p>
                                )}
                                {item.status === 'submitted' && (
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {item.videoUrl && (
                                            <a href={item.videoUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.9rem', color: '#059669', fontWeight: 600 }}>등록된 영상 보기 <ExternalLink size={12} /></a>
                                        )}
                                        <input
                                            value={urlDrafts[item.id] || ''}
                                            onChange={e => setUrlDrafts({ ...urlDrafts, [item.id]: e.target.value })}
                                            onKeyDown={e => e.key === 'Enter' && handleSaveUrl(item)}
                                            placeholder={item.videoUrl ? '다른 URL로 바꾸기' : '완성된 영상 URL 붙여넣기 (YouTube 등)'}
                                            style={{ flex: '1 1 260px', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
                                        />
                                        <button onClick={() => handleSaveUrl(item)} disabled={savingId === item.id}
                                            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontWeight: 600, opacity: savingId === item.id ? 0.7 : 1 }}>
                                            {savingId === item.id ? '저장 중...' : '영상 등록'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OperatorBoard;
