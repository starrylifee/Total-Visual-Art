import React from 'react';
import { MASTERPIECES, thumbUrl } from '../data/masterpieces';

// 명화 16종 선택 그리드. value = masterpieceId(또는 null), onChange(masterpiece|null)
const MasterpiecePicker = ({ value, onChange }) => {
    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.5rem' }}>
                {MASTERPIECES.map(m => {
                    const selected = value === m.id;
                    return (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => onChange(selected ? null : m)}
                            title={`${m.title} — ${m.artist}`}
                            style={{
                                padding: 0, border: selected ? '3px solid var(--primary)' : '1px solid #ddd',
                                borderRadius: '0.5rem', overflow: 'hidden', cursor: 'pointer', background: 'white',
                                textAlign: 'center', opacity: value && !selected ? 0.55 : 1
                            }}
                        >
                            <img src={thumbUrl(m, 220)} alt={m.title} loading="lazy"
                                style={{ width: '100%', height: '80px', objectFit: 'cover', display: 'block' }} />
                            <div style={{ padding: '0.3rem 0.2rem', fontSize: '0.72rem', lineHeight: 1.25 }}>
                                <strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</strong>
                                <span style={{ color: 'var(--text-sub)' }}>{m.artist}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-sub)' }}>
                {value ? '선택한 작품을 다시 누르면 해제됩니다.' : '작품을 고르면 감상 루프에 자동으로 연결됩니다. (직접 이미지 URL을 넣어도 돼요)'}
            </p>
        </div>
    );
};

export default MasterpiecePicker;
