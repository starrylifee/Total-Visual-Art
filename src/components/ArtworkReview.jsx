import React, { useState, useEffect } from 'react';
import { geminiService, fileToResizedBase64 } from '../services/gemini.js';
import { studentAuthService } from '../services/studentAuthService';
import { Loader, CheckCircle, Upload, RefreshCw } from 'lucide-react';

const POLL_MS = 15000;

/**
 * 모듈 5: 내 작품 평가 (학생)
 * 작품 사진 업로드 → AI 루브릭 초벌 채점(즉석 비계) → 교사 확정 대기 → 확정 후 성장 다짐
 */
const ArtworkReview = ({ session, showToast }) => {
    const artRubric = session.artRubric || [];
    const [data, setData] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [pledgeDraft, setPledgeDraft] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const saved = await studentAuthService.getArtwork();
                setData(saved || {});
                if (saved?.pledge) setPledgeDraft(saved.pledge);
            } catch (e) {
                console.error('작품 평가 로드 실패:', e);
                setData({});
            } finally {
                setLoaded(true);
            }
        })();
        // 교사 확정을 기다리는 동안 폴링
        const timer = setInterval(async () => {
            try {
                const saved = await studentAuthService.getArtwork();
                if (saved) setData(prev => (prev?.teacherConfirmed !== saved.teacherConfirmed || prev?.teacherComment !== saved.teacherComment ? { ...prev, ...saved } : prev));
            } catch { /* 폴링 실패는 무시 */ }
        }, POLL_MS);
        return () => clearInterval(timer);
    }, []);

    if (!loaded || data === null) {
        return <p style={{ color: 'var(--text-sub)' }}><Loader size={16} style={{ animation: 'spin 1s linear infinite', verticalAlign: '-3px' }} /> 불러오는 중...</p>;
    }

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const image = await fileToResizedBase64(file);
            const imageDataUrl = `data:${image.mimeType};base64,${image.data}`;
            await studentAuthService.saveArtwork({ imageDataUrl });
            const review = await geminiService.reviewArtwork(image, artRubric);
            await studentAuthService.saveArtwork({ aiReview: review });
            setData({ ...data, imageDataUrl, aiReview: review, status: 'ai_done', teacherConfirmed: false });
            showToast('🤖 AI가 초벌 평가를 마쳤어요! 선생님 확정을 기다려요.', 'success');
        } catch (err) {
            showToast('업로드 오류: ' + err.message, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handlePledge = async () => {
        if (pledgeDraft.trim().length < 10) {
            showToast('다짐을 조금 더 자세히 적어 주세요! (10자 이상)', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await studentAuthService.saveArtwork({ pledge: pledgeDraft.trim() });
            setData({ ...data, pledge: pledgeDraft.trim(), status: 'pledged' });
            showToast('🌱 성장 다짐 저장 완료! 멋져요!', 'success');
        } catch (e) {
            showToast('저장 오류: ' + e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {/* 왼쪽: 작품 업로드 */}
            <div style={{ flex: '1 1 280px', minWidth: '250px' }}>
                <h3 style={{ margin: '0 0 0.5rem' }}>📷 내 작품 사진</h3>
                {data.imageDataUrl ? (
                    <img src={data.imageDataUrl} alt="내 작품" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '1rem', boxShadow: 'var(--shadow)', background: '#f1f5f9' }} />
                ) : (
                    <div style={{ padding: '3rem 1rem', background: '#f8fafc', borderRadius: '1rem', textAlign: 'center', color: 'var(--text-sub)', border: '2px dashed #cbd5e1' }}>
                        <Upload size={32} style={{ opacity: 0.5 }} />
                        <p>완성한 작품을 사진으로 찍어 올려 주세요.</p>
                    </div>
                )}
                {!data.teacherConfirmed && (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', padding: '0.7rem 1.4rem', borderRadius: '2rem', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                        {isUploading ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> AI가 살펴보는 중...</> : <>{data.imageDataUrl ? <><RefreshCw size={15} /> 다시 올리기</> : <><Upload size={15} /> 사진 올리기</>}</>}
                        <input type="file" accept="image/*" onChange={handleUpload} disabled={isUploading} style={{ display: 'none' }} />
                    </label>
                )}
                {artRubric.length > 0 && (
                    <div style={{ background: '#eef2ff', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginTop: '0.9rem', fontSize: '0.92rem' }}>
                        <strong>📋 작품 약속</strong>
                        <ol style={{ margin: '0.3rem 0 0', paddingLeft: '1.2rem' }}>
                            {artRubric.map((r, i) => <li key={i}>{r}</li>)}
                        </ol>
                    </div>
                )}
            </div>

            {/* 오른쪽: AI 초벌 + 교사 확정 + 다짐 */}
            <div style={{ flex: '1.4 1 380px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.aiReview && (
                    <div>
                        <h3 style={{ margin: '0 0 0.5rem' }}>🤖 AI 초벌 평가 <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: 400 }}>(최종 평가는 선생님이 해요)</span></h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {data.aiReview.items.map((it, i) => (
                                <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', background: it.met ? '#ecfdf5' : '#fffbeb', borderRadius: '0.6rem', padding: '0.6rem 0.9rem' }}>
                                    <span style={{ fontSize: '1.1rem' }}>{it.met ? '✅' : '🌱'}</span>
                                    <div>
                                        <strong style={{ fontSize: '0.95rem' }}>{it.criterion}</strong>
                                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.95rem' }}>{it.comment}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {data.aiReview.overall && (
                            <p style={{ margin: '0.6rem 0 0', background: '#f8fafc', borderRadius: '0.6rem', padding: '0.6rem 0.9rem' }}>💬 {data.aiReview.overall}</p>
                        )}
                    </div>
                )}

                {data.aiReview && !data.teacherConfirmed && (
                    <div style={{ background: '#fef3c7', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>⏳ 선생님이 확인하는 중이에요. 확정되면 여기에 나타나요.</p>
                    </div>
                )}

                {data.teacherConfirmed && (
                    <div style={{ background: '#ecfdf5', border: '2px solid #10b981', borderRadius: '0.75rem', padding: '1rem' }}>
                        <h3 style={{ margin: '0 0 0.4rem' }}><CheckCircle size={18} style={{ verticalAlign: '-3px', color: '#059669' }} /> 선생님 확정 완료!</h3>
                        {data.teacherComment && <p style={{ margin: 0 }}>👩‍🏫 {data.teacherComment}</p>}
                    </div>
                )}

                {data.teacherConfirmed && (
                    data.status === 'pledged' ? (
                        <div style={{ background: '#eef2ff', borderRadius: '0.75rem', padding: '1rem' }}>
                            <strong>🌱 나의 성장 다짐</strong>
                            <p style={{ margin: '0.4rem 0 0', whiteSpace: 'pre-wrap' }}>{data.pledge}</p>
                        </div>
                    ) : (
                        <div>
                            <h3 style={{ margin: '0 0 0.4rem' }}>🌱 마지막: 성장 다짐 쓰기</h3>
                            <p style={{ color: 'var(--text-sub)', margin: '0 0 0.5rem' }}>평가를 읽고, 다음 작품에서 더 해 보고 싶은 것을 적어 보세요.</p>
                            <textarea
                                value={pledgeDraft}
                                onChange={e => setPledgeDraft(e.target.value)}
                                autoFocus
                                placeholder="다음에는 ...을 더 해 보고 싶다. 왜냐하면..."
                                style={{ width: '100%', height: '130px', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd', fontSize: '1.05rem' }}
                            />
                            <button onClick={handlePledge} disabled={isSaving} className="btn-primary" style={{ marginTop: '0.5rem', padding: '0.8rem 1.8rem', fontSize: '1.02rem', opacity: isSaving ? 0.7 : 1 }}>
                                🌱 다짐 저장하기
                            </button>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default ArtworkReview;
