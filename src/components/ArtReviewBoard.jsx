import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { X, RefreshCw, CheckCircle } from 'lucide-react';

const POLL_MS = 30000;

/**
 * 모듈 5: 작품 평가 확정 보드 (교사)
 * 학생 작품 + AI 초벌 채점을 보고 코멘트와 함께 확정한다. 확정하면 학생이 성장 다짐을 쓸 수 있다.
 */
const ArtReviewBoard = ({ classId, session, onClose }) => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [commentDrafts, setCommentDrafts] = useState({});
    const [savingId, setSavingId] = useState(null);

    const load = useCallback(async () => {
        try {
            const snap = await getDocs(collection(db, 'classes', classId, 'sessions', session.id, 'artworkReviews'));
            const list = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (parseInt(a.studentName) || 0) - (parseInt(b.studentName) || 0));
            setItems(list);
        } catch (e) {
            console.error('평가 보드 로드 실패:', e);
            alert('작품 평가를 불러오지 못했습니다. Firestore 규칙이 최신인지 확인해 주세요.\n' + e.message);
        } finally {
            setIsLoading(false);
        }
    }, [classId, session.id]);

    useEffect(() => {
        load();
        const t = setInterval(load, POLL_MS);
        return () => clearInterval(t);
    }, [load]);

    const handleConfirm = async (item) => {
        setSavingId(item.id);
        try {
            const comment = (commentDrafts[item.id] !== undefined ? commentDrafts[item.id] : item.teacherComment || '').trim();
            await updateDoc(doc(db, 'classes', classId, 'sessions', session.id, 'artworkReviews', item.id), {
                teacherComment: comment,
                teacherConfirmed: true,
                confirmedAt: serverTimestamp(),
            });
            setItems(items.map(x => (x.id === item.id ? { ...x, teacherComment: comment, teacherConfirmed: true } : x)));
        } catch (e) {
            alert('확정 저장 실패: ' + e.message);
        } finally {
            setSavingId(null);
        }
    };

    const confirmed = items.filter(x => x.teacherConfirmed);
    const pledged = items.filter(x => x.pledge);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 150 }}>
            <div style={{ background: 'var(--card-bg)', padding: '1.75rem', borderRadius: '1rem', width: '1040px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>🖼️ 작품 평가 확정 — {session.title}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={load} style={{ padding: '0.45rem 0.9rem', borderRadius: '2rem', border: '1px solid #ddd', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <RefreshCw size={14} /> 새로고침
                        </button>
                        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-sub)' }}><X size={22} /></button>
                    </div>
                </div>
                <p style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: 'var(--text-sub)' }}>
                    업로드 <strong>{items.length}</strong>명 · 확정 <strong style={{ color: '#059669' }}>{confirmed.length}</strong>명 · 다짐 완료 <strong>{pledged.length}</strong>명 —
                    AI 초벌을 참고해 코멘트를 쓰고 확정하면, 학생이 성장 다짐을 쓸 수 있어요.
                </p>

                {isLoading ? <p style={{ color: 'var(--text-sub)' }}>불러오는 중...</p>
                : items.length === 0 ? <p style={{ color: 'var(--text-sub)' }}>아직 작품을 올린 학생이 없습니다.</p>
                : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {items.map(item => (
                            <div key={item.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', borderRadius: '0.75rem', background: '#f8fafc', border: item.teacherConfirmed ? '2px solid #10b981' : '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                                <div style={{ flex: '0 0 160px' }}>
                                    {item.imageDataUrl && <img src={item.imageDataUrl} alt={`${item.studentName} 작품`} style={{ width: '160px', height: '160px', objectFit: 'cover', borderRadius: '0.6rem' }} />}
                                    <p style={{ margin: '0.3rem 0 0', fontWeight: 700, textAlign: 'center' }}>{item.studentName}
                                        {item.teacherConfirmed && <CheckCircle size={15} color="#10b981" style={{ verticalAlign: '-2px', marginLeft: '0.3rem' }} />}
                                    </p>
                                </div>
                                <div style={{ flex: '1 1 300px', minWidth: '260px' }}>
                                    {item.aiReview?.items ? (
                                        <div style={{ fontSize: '0.92rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            {item.aiReview.items.map((it, i) => (
                                                <p key={i} style={{ margin: 0 }}>{it.met ? '✅' : '🌱'} <strong>{it.criterion}</strong> — {it.comment}</p>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ color: 'var(--text-sub)', margin: 0 }}>AI 초벌 평가가 아직 없어요.</p>
                                    )}
                                    {item.pledge && (
                                        <p style={{ margin: '0.5rem 0 0', background: '#eef2ff', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.92rem' }}>🌱 <strong>다짐:</strong> {item.pledge}</p>
                                    )}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                                        <input
                                            value={commentDrafts[item.id] !== undefined ? commentDrafts[item.id] : (item.teacherComment || '')}
                                            onChange={e => setCommentDrafts({ ...commentDrafts, [item.id]: e.target.value })}
                                            onKeyDown={e => e.key === 'Enter' && handleConfirm(item)}
                                            placeholder="선생님 코멘트 (학생에게 보여요)"
                                            style={{ flex: '1 1 240px', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
                                        />
                                        <button onClick={() => handleConfirm(item)} disabled={savingId === item.id}
                                            style={{ padding: '0.5rem 1.1rem', borderRadius: '0.5rem', border: 'none', background: item.teacherConfirmed ? '#059669' : 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 600, opacity: savingId === item.id ? 0.7 : 1 }}>
                                            {savingId === item.id ? '저장 중...' : item.teacherConfirmed ? '다시 확정' : '확정'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArtReviewBoard;
