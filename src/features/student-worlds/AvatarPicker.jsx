import React, { Suspense, useEffect, useRef } from 'react';
import { avatarOptions } from './avatarCatalog.js';
import AvatarPreview from './AvatarPreview';

// Full-screen chooser. With no current avatar it is the first-visit gate and cannot be closed;
// afterwards it opens from the "아바타 바꾸기" buttons with the current choice highlighted.
export default function AvatarPicker({ current, onChoose, onClose }) {
  const firstTime = !current;
  const firstButton = useRef();
  useEffect(() => { firstButton.current?.focus(); }, []);
  useEffect(() => {
    if (firstTime) return undefined;
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [firstTime, onClose]);
  return <div className="sw-avatar-modal" role="dialog" aria-modal="true" aria-labelledby="sw-avatar-title">
    <div className="sw-avatar-card">
      <header>
        <div><span className="sw-eyebrow">MY AVATAR</span><h2 id="sw-avatar-title">{firstTime ? '함께 탐험할 아바타를 골라요' : '아바타 바꾸기'}</h2></div>
        {!firstTime && <button type="button" className="sw-avatar-close" onClick={onClose}>닫기 ×</button>}
      </header>
      <div className="sw-avatar-grid">
        {avatarOptions.map((option, index) => {
          const active = option.id === current;
          return <button key={option.id} type="button" ref={index === 0 ? firstButton : undefined} className={`sw-avatar-option ${active ? 'sw-avatar-active' : ''}`} aria-pressed={active} onClick={() => onChoose(option.id)}>
            <Suspense fallback={<div className="sw-avatar-preview" />}><AvatarPreview avatar={option.id} /></Suspense>
            <strong>{option.name}</strong>
            <span>{option.description}</span>
            <em>{active ? '지금 쓰는 중' : '이 친구로 탐험'}</em>
          </button>;
        })}
      </div>
      <p>고른 아바타는 이 기기에 저장돼 다음에 와도 그대로 이어져요. 언제든 '아바타 바꾸기'로 다시 고를 수 있어요.</p>
    </div>
  </div>;
}
