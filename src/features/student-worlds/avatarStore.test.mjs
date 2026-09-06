import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readStoredAvatar, storeAvatar, readStoredView, storeView, AVATAR_STORAGE_KEY } from './avatarStore.js';

const memory = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), map }; };

test('첫 방문에는 저장된 아바타가 없다', () => {
  assert.equal(readStoredAvatar(memory()), null);
});
test('아바타 선택은 저장되고 다시 읽힌다', () => {
  const storage = memory();
  storeAvatar('sindap', storage);
  assert.equal(readStoredAvatar(storage), 'sindap');
});
test('모르는 아바타 값은 무시된다', () => {
  const storage = memory();
  storeAvatar('dragon', storage);
  assert.equal(storage.map.has(AVATAR_STORAGE_KEY), false);
  storage.setItem(AVATAR_STORAGE_KEY, 'dragon');
  assert.equal(readStoredAvatar(storage), null);
});
test('시점 기본값은 3인칭이고 1인칭 저장이 유지된다', () => {
  const storage = memory();
  assert.equal(readStoredView(storage), 'third');
  storeView('first', storage);
  assert.equal(readStoredView(storage), 'first');
  storeView('drone', storage);
  assert.equal(readStoredView(storage), 'first');
});
test('저장소가 막혀 있어도 오류 없이 기본값을 준다', () => {
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.equal(readStoredAvatar(broken), null);
  assert.equal(readStoredView(broken), 'third');
  assert.doesNotThrow(() => storeAvatar('singom', broken));
});
