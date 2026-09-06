import React, { Component, lazy, Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DrawingProjectContext, drawingProjects, getDrawingProject } from './projectRegistry';
import { DEFAULT_PITCH } from './movement';
import { readStoredAvatar, readStoredView, storeAvatar, storeView } from './avatarStore';
import { isAvatarId } from './avatarCatalog';
import './student-worlds.css';

const ExploreScene = lazy(() => import('./ExploreScene'));
const AvatarPreview = lazy(() => import('./AvatarPreview'));
const AvatarPicker = lazy(() => import('./AvatarPicker'));
const keys = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyQ: 'turnLeft', KeyE: 'turnRight', KeyI: 'lookUp', KeyK: 'lookDown' };

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('그림 탐험 렌더링 오류:', error); }
  render() { return this.state.failed ? <div className="sw-render-failure" role="alert">3D 화면을 불러오지 못했어요.<br />목록으로 돌아갔다가 다시 입장해 주세요.</div> : this.props.children; }
}

function ControlButton({ action, label, children, controls, className = '' }) {
  const pointer = useRef(null);
  const release = () => { if (pointer.current != null) controls.current.touch.delete(pointer.current); pointer.current = null; };
  return <button className={`sw-control ${className}`} aria-label={label}
    onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); pointer.current = e.pointerId; controls.current.touch.set(e.pointerId, action); }}
    onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
    onClick={e => { if (e.detail !== 0) return; controls.current.touch.set(label, action); setTimeout(() => controls.current.touch.delete(label), 180); }}>
    {children}
  </button>;
}

function MiniMap({ position, config }) {
  const { minX, maxX, minZ, maxZ } = config.bounds;
  const at = p => ({ left: `${(p.x - minX) / (maxX - minX) * 100}%`, top: `${(p.z - minZ) / (maxZ - minZ) * 100}%` });
  return <div className="sw-map" aria-label="현재 작품 지도">
    <span className="sw-map-sea" style={config.waterRect ? { ...at(config.waterRect), width: `${config.waterRect.width / (maxX - minX) * 100}%`, height: `${config.waterRect.depth / (maxZ - minZ) * 100}%` } : { height: `${config.seaPercent}%` }}>{config.waterLabel || (config.seaPercent ? '바다' : '탐험 공간')}</span>
    {config.map.map(item => <span key={item.label} style={{ ...at(item), position: 'absolute', fontSize: 9, background: '#fff8df', color: '#36534d', transform: 'translate(-50%, -50%)' }}>{item.label}</span>)}
    <span className="sw-map-player" style={at(position)} />
    <span className="sw-map-label">나의 위치</span>
  </div>;
}

function ThemeNavigation({ world, choose, leave }) {
  const { worlds: worldCatalog, title } = useContext(DrawingProjectContext);
  const index = worldCatalog.findIndex(item => item.id === world.id);
  return <nav className="sw-theme-nav" aria-label="테마 안 작품 이동">
    <button onClick={leave} className="sw-theme-home">← 테마 목록</button>
    <label><span>{title} · {index + 1} / {worldCatalog.length}</span>
      <select aria-label="테마 작품 선택" value={world.id} onChange={e => choose(worldCatalog.find(item => item.id === e.target.value))}>
        {worldCatalog.map(item => <option key={item.id} value={item.id}>{String(item.order).padStart(2, '0')} · {item.title}{item.scene ? ' · 탐험 가능' : ' · 준비 중'}</option>)}
      </select>
    </label>
    <div className="sw-theme-arrows"><button disabled={index === 0} onClick={() => choose(worldCatalog[index - 1])}>← 이전</button><button disabled={index === worldCatalog.length - 1} onClick={() => choose(worldCatalog[index + 1])}>다음 →</button></div>
  </nav>;
}

function Exploration({ world, leave, choose, avatar, pickerOpen, openPicker }) {
  const project = useContext(DrawingProjectContext);
  const config = project.configs[world.scene];
  const controls = useRef({ keys: new Set(), touch: new Map(), yaw: 0, pitch: DEFAULT_PITCH, jumpQueued: false, reset: 0, view: readStoredView() });
  const [view, setView] = useState(controls.current.view);
  const toggleView = useCallback(() => setView(current => { const next = current === 'first' ? 'third' : 'first'; controls.current.view = next; storeView(next); return next; }), []);
  const [position, setPosition] = useState(config.spawn);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [compare, setCompare] = useState(false);
  const [imageError, setImageError] = useState(false);
  const closeRef = useRef();
  const compareTrigger = useRef();
  const clear = useCallback(() => { controls.current.keys.clear(); controls.current.touch.clear(); controls.current.jumpQueued = false; }, []);
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => { clear(); setFailed(true); }, [clear]);
  useEffect(() => {
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; clear(); };
  }, [clear]);
  useEffect(() => {
    clear();
    if (compare) closeRef.current?.focus();
    const down = e => {
      if (e.code === 'Escape' && compare) { setCompare(false); compareTrigger.current?.focus(); return; }
      if (compare || pickerOpen || e.target.closest?.('input, textarea, select, .sw-theme-nav')) return;
      if (e.code === 'Space' && !e.target.closest?.('button, a, input, textarea, select')) {
        e.preventDefault();
        if (!e.repeat) controls.current.jumpQueued = true;
      }
      if (keys[e.code]) { e.preventDefault(); controls.current.keys.add(keys[e.code]); }
      if (e.code === 'KeyR') { clear(); controls.current.reset++; }
      if (e.code === 'KeyV' && !e.repeat) toggleView();
    };
    const up = e => { if (keys[e.code]) controls.current.keys.delete(keys[e.code]); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); };
  }, [compare, pickerOpen, clear, toggleView]);
  return <section className="sw-exploration" aria-label={`${world.title} 탐험`}>
    <div className="sw-canvas" aria-label={`3D ${world.title}`} role="img">
      {failed ? <div className="sw-render-failure" role="alert">3D 연결이 끊겼어요. 목록에서 다시 입장해 주세요.</div> :
        <SceneBoundary><Suspense fallback={<div className="sw-render-failure" role="status">그림 속으로 들어가는 중…</div>}>
          <ExploreScene config={config} Scene={project.scenes[world.scene]} controls={controls} onPosition={setPosition} onReady={onReady} onFailure={onFailure} paused={compare || pickerOpen} avatar={avatar} />
        </Suspense></SceneBoundary>}
    </div>
    <ThemeNavigation world={world} choose={choose} leave={leave} />
    <aside className="sw-guide" style={{ maxWidth: 285, wordBreak: 'keep-all' }}><span className="sw-eyebrow">오늘의 탐험</span><h2>{config.heading}</h2>
      <p>{config.guide}</p>
      <span className="sw-note">그림에 없는 뒷면과 길은 상상으로 채웠어요.</span>
    </aside>
    <div className="sw-toolbar">
      <button ref={compareTrigger} onClick={() => setCompare(true)}>원본 그림 보기</button>
      <button onClick={() => { clear(); controls.current.reset++; }}>처음 위치로</button>
      <button onClick={toggleView} aria-pressed={view === 'first'}>{view === 'first' ? '시점 · 1인칭' : '시점 · 3인칭'}</button>
      <button onClick={() => { clear(); openPicker(); }}>아바타 바꾸기</button>
      <details className="sw-mobile-guide">
        <summary>탐험 안내</summary>
        <div><h3>{config.heading}</h3><p>{config.guide}</p><small>그림에 없는 뒷면과 길은 상상으로 채웠어요.</small></div>
      </details>
    </div>
    <div className="sw-map-panel"><MiniMap position={position} config={config} /><output className="sw-coordinate sw-sr-only" aria-label="현재 위치" data-height={position.height?.toFixed(2)} data-swimming={position.swimming ? 'true' : 'false'}>{position.x.toFixed(1)} / {position.z.toFixed(1)}</output></div>
    <div className="sw-bottom">
      <div className="sw-dpad" aria-label="이동 조작">
        <ControlButton action="forward" label="앞으로 이동" controls={controls} className="sw-up">↑</ControlButton>
        <ControlButton action="left" label="왼쪽으로 이동" controls={controls}>←</ControlButton>
        <ControlButton action="back" label="뒤로 이동" controls={controls}>↓</ControlButton>
        <ControlButton action="right" label="오른쪽으로 이동" controls={controls}>→</ControlButton>
      </div>
      <p className="sw-key-help"><b>W A S D</b> / 방향키 · 이동　<b>Space</b> · 2단 점프<br /><b>Q E</b> · 좌우　<b>I K</b> · 위아래　<b>V</b> · 시점 <span>점프를 두 번 눌러 물체 위로!　R · 처음 위치</span></p>
      <div className="sw-turn">
        <button className="sw-control sw-jump" aria-label={position.swimming ? '수면 도약' : '점프'} onClick={() => { controls.current.jumpQueued = true; }}>{position.swimming ? '수면 도약 ↑' : '2단 점프 ↑'}</button>
        <ControlButton action="lookUp" label="위 보기" controls={controls}>⌃</ControlButton><ControlButton action="lookDown" label="아래 보기" controls={controls}>⌄</ControlButton>
        <ControlButton action="turnLeft" label="시점 왼쪽 회전" controls={controls}>↶</ControlButton><ControlButton action="turnRight" label="시점 오른쪽 회전" controls={controls}>↷</ControlButton><small>둘러보기</small>
      </div>
    </div>
    <span className="sw-ready" role="status">{failed ? '다시 입장해 주세요' : ready ? position.swimming ? '수영 중 · Space 두 번으로 참치처럼 도약' : (config.readyText || '탐험 중 · 바다에 들어가면 수영해요') : '준비 중'}</span>
    {compare && <div className="sw-modal" role="dialog" aria-modal="true" aria-label="학생 원본 그림" onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); closeRef.current?.focus(); } }}>
      <div className="sw-modal-card"><header><div><span className="sw-eyebrow">이 세계가 시작된 한 장</span><h2>{world.title}</h2></div>
        <button ref={closeRef} onClick={() => { setCompare(false); compareTrigger.current?.focus(); }}>닫기 ×</button></header>
        {imageError ? <p role="alert">원본 그림을 불러오지 못했어요.</p> : <img src={world.sourceImage} alt={config.alt} onError={() => setImageError(true)} />}
        <p>학생이 직접 그린 start.jpg입니다. 색과 주요 사물의 배치를 3D 공간에 옮겼어요.</p>
      </div>
    </div>}
  </section>;
}

export default function StudentWorlds() {
  const [params] = useSearchParams();
  const project = getDrawingProject(params.get('project'));
  return <DrawingProjectContext.Provider value={project}><ProjectWorlds key={project.id} /></DrawingProjectContext.Provider>;
}

function ProjectWorlds() {
  const project = useContext(DrawingProjectContext);
  const { worlds: worldCatalog } = project;
  const [params, setParams] = useSearchParams();
  const selected = worldCatalog.find(world => world.id === params.get('world'));
  const setSelected = world => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (world) next.set('world', world.id); else next.delete('world');
    return next;
  });
  const first = worldCatalog[0];
  const [avatar, setAvatar] = useState(() => (isAvatarId(params.get('avatar')) ? params.get('avatar') : readStoredAvatar()));
  const [picking, setPicking] = useState(false);
  const chooseAvatar = id => { storeAvatar(id); setAvatar(id); setPicking(false); };
  const picker = (picking || !avatar) && <Suspense fallback={<div className="sw-avatar-modal" />}><AvatarPicker current={avatar} onChoose={chooseAvatar} onClose={() => setPicking(false)} /></Suspense>;
  if (params.get('avatarPreview')) return <div style={{ height: '100vh', background: '#eef2ee' }}><Suspense fallback={null}><AvatarPreview avatar={params.get('avatarPreview')} spin={params.get('spin') !== '0'} behavior={params.get('behavior') || 'idle'} yaw={Number(params.get('yaw') || 0) * Math.PI / 180} zoom={Number(params.get('zoom') || 1)} walking={params.get('walk') === '1'} className="sw-avatar-preview-page" /></Suspense></div>;
  const available = worldCatalog.filter(world => world.scene).length;
  if (selected?.scene) return <><Exploration key={selected.id} world={selected} choose={setSelected} leave={() => setSelected(null)} avatar={avatar} pickerOpen={!!picker} openPicker={() => setPicking(true)} />{picker}</>;
  if (selected) return <div className="sw-library sw-pending">
    <ThemeNavigation world={selected} choose={setSelected} leave={() => setSelected(null)} />
    <section className="sw-pending-copy"><span className="sw-eyebrow">{String(selected.order).padStart(2, '0')} / {worldCatalog.length} · {selected.category}</span><h1>{selected.title}</h1>
      <p role="status">이 그림의 3D 세계는 준비 중이에요.</p><p>학생의 원본 그림을 살려 차례로 만들고 있어요.<br />위 메뉴로 다른 작품을 고르거나, 열린 세계를 먼저 탐험해 보세요.</p>
      <button onClick={() => setSelected(first)}>{first.title} 탐험하기 →</button>
    </section>
  </div>;
  return <div className="sw-library">
    {picker}
    <div className="sw-library-top"><Link to="/">← 스튜디오</Link><span>학생 그림 탐험실</span><button type="button" className="sw-avatar-change" onClick={() => setPicking(true)}>아바타 바꾸기</button></div>
    {drawingProjects.length > 1 && <label>프로젝트 선택 <select aria-label="프로젝트 선택" value={project.id} onChange={e => setParams({ project: e.target.value })}>{drawingProjects.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
    <header className="sw-library-heading"><span className="sw-eyebrow">OUR LITTLE WORLDS</span><h1>내가 그린 곳으로,<br />한 걸음.</h1><p>{project.description || '종이 위의 그림이 걸어 들어갈 수 있는 세계가 됩니다.'}<br />친구의 그림 속에서 나만의 산책을 시작해 보세요.</p></header>
    <section className="sw-feature"><img src={first.sourceImage} alt={`${first.title} 원본 그림`} />
      <div className="sw-feature-copy"><span className="sw-eyebrow">01 / 첫 번째 탐험</span><h2>{first.title}</h2><p>{project.featuredDescription || '학생의 그림 속을 아바타로 탐험해 보세요.'}</p><button onClick={() => setSelected(first)}>이 그림 속으로 →</button><small>키보드 · 화면 터치 지원 / {worldCatalog.length}개 월드</small></div>
    </section>
    <div className="sw-collection-title"><h2>{project.title}</h2><span>전체 {worldCatalog.length} · 탐험 가능 {available} · 준비 중 {worldCatalog.length - available}</span></div>
    <div className="sw-grid">{worldCatalog.map(world => <button key={world.id} onClick={() => setSelected(world)} className={`sw-world-card ${world.scene ? 'sw-open' : ''}`}>
      <span className="sw-card-index">{String(world.order).padStart(2, '0')}</span><span className="sw-card-category">{world.category}</span><h3>{world.title}</h3><span className="sw-card-status">{world.scene ? '탐험하기 ↗' : '준비 중'}</span>
    </button>)}</div>
    <p className="sw-library-footnote">학생의 선과 색에서 시작한 {available}개의 세계가 열렸습니다.</p>
  </div>;
}
