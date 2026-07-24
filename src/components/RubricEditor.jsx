import React, { useState } from 'react';
import { sessionService } from '../services/sessionService';
import { DEFAULT_RUBRIC, getMasterpiece } from '../data/masterpieces';
import { X, Plus, Trash2, Monitor, Save } from 'lucide-react';

/**
 * 루브릭 공동 설정 모달 (모듈 1: 감상 rubric / 모듈 5: 작품 평가 artRubric)
 * - 교사가 초안을 만들고, 수업 중 전자칠판 모드로 띄워 학생 의견을 반영해 고친다
 * - fieldName으로 세션의 어느 루브릭 필드를 편집할지 지정한다
 */
const RubricEditor = ({ classId, session, onSaved, onClose, fieldName = 'rubric', titleLabel = '감상 루브릭', defaultItems = DEFAULT_RUBRIC }) => {
    const [items, setItems] = useState(
        session[fieldName]?.length ? [...session[fieldName]] : [...defaultItems]
    );
    const [isSaving, setIsSaving] = useState(false);
    const [boardMode, setBoardMode] = useState(false);
    const masterpiece = getMasterpiece(session.masterpieceId);

    const setItem = (i, text) => setItems(items.map((it, idx) => (idx === i ? text : it)));
    const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
    const addItem = () => setItems([...items, '']);

    const handleSave = async () => {
        const cleaned = items.map(t => t.trim()).filter(Boolean);
        if (cleaned.length === 0) {
            alert('루브릭 항목을 1개 이상 입력해 주세요.');
            return;
        }
        setIsSaving(true);
        try {
            await sessionService.updateSession(classId, session.id, { [fieldName]: cleaned });
            onSaved(cleaned);
        } catch (e) {
            console.error('루브릭 저장 실패:', e);
            alert('저장에 실패했습니다: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    // 전자칠판 모드: 학생과 함께 보며 다듬는 큰 화면 (스크롤 최소화, 글씨 크게)
    if (boardMode) {
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 200, display: 'flex', flexDirection: 'column', padding: '2rem 3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h1 style={{ margin: 0, fontSize: '2.2rem' }}>
                        📋 우리 반 {fieldName === 'artRubric' ? '작품 약속' : '감상 약속'}
                        {masterpiece && <span style={{ fontSize: '1.4rem', color: 'var(--text-sub)', marginLeft: '1rem' }}>{masterpiece.title} · {masterpiece.artist}</span>}
                    </h1>
                    <button onClick={() => setBoardMode(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', border: '1px solid #ddd', background: '#f8f8f8', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 600 }}>
                        편집 화면으로
                    </button>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
                    {items.map((it, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', minWidth: '3rem', textAlign: 'center' }}>{i + 1}</span>
                            <input
                                value={it}
                                onChange={e => setItem(i, e.target.value)}
                                style={{ flex: 1, fontSize: '1.9rem', padding: '0.9rem 1.2rem', borderRadius: '1rem', border: '2px solid #e2e8f0', fontWeight: 500 }}
                            />
                            <button onClick={() => removeItem(i)} title="삭제" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                <Trash2 size={28} />
                            </button>
                        </div>
                    ))}
                    <button onClick={addItem} style={{ alignSelf: 'center', marginTop: '0.5rem', padding: '0.75rem 2rem', borderRadius: '2rem', border: '2px dashed var(--primary)', background: 'white', color: 'var(--primary)', cursor: 'pointer', fontSize: '1.3rem', fontWeight: 600 }}>
                        <Plus size={20} style={{ verticalAlign: '-3px' }} /> 항목 추가
                    </button>
                </div>
                <button onClick={handleSave} disabled={isSaving} style={{ marginTop: '1rem', padding: '1.1rem', borderRadius: '1rem', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '1.4rem', fontWeight: 700, opacity: isSaving ? 0.7 : 1 }}>
                    {isSaving ? '저장 중...' : '💾 이대로 확정하기'}
                </button>
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 150 }}>
            <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '1rem', width: '600px', maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>📋 {titleLabel} — {session.title}</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-sub)' }}><X size={20} /></button>
                </div>
                <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                    교사가 초안을 만들고, 수업 시간에 <strong>칠판 모드</strong>로 띄워 학생 의견을 반영해 함께 완성하세요.
                    저장하면 학생 감상 화면에 '우리 반 감상 약속'으로 보입니다.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {items.map((it, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: '1.5rem', textAlign: 'center' }}>{i + 1}</span>
                            <input
                                value={it}
                                onChange={e => setItem(i, e.target.value)}
                                placeholder="감상 기준을 입력하세요"
                                style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '0.5rem', border: '1px solid #ddd' }}
                            />
                            <button onClick={() => removeItem(i)} title="삭제" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <button onClick={addItem} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px dashed var(--primary)', background: 'white', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                        <Plus size={14} style={{ verticalAlign: '-2px' }} /> 항목 추가
                    </button>
                    <button onClick={() => setItems([...defaultItems])} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid #ddd', background: 'white', color: 'var(--text-main)', cursor: 'pointer' }}>
                        기본 템플릿으로
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                    <button onClick={() => setBoardMode(true)} style={{ padding: '0.6rem 1.2rem', borderRadius: '0.5rem', border: '1px solid var(--accent)', background: 'white', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Monitor size={16} /> 칠판 모드 (학생과 함께)
                    </button>
                    <button onClick={handleSave} disabled={isSaving} style={{ padding: '0.6rem 1.2rem', borderRadius: '0.5rem', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: isSaving ? 0.7 : 1 }}>
                        <Save size={16} /> {isSaving ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RubricEditor;
