import { isAvatarId } from './avatarCatalog.js';

export const AVATAR_STORAGE_KEY = 'student-worlds-avatar';

// Returns a known avatar id, or null when nothing valid is stored.
export function readStoredAvatar(storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem(AVATAR_STORAGE_KEY);
    return value && isAvatarId(value) ? value : null;
  } catch { return null; }
}

export function storeAvatar(id, storage = globalThis.localStorage) {
  try { if (isAvatarId(id)) storage?.setItem(AVATAR_STORAGE_KEY, id); } catch { /* private mode or blocked storage */ }
}

export const VIEW_STORAGE_KEY = 'student-worlds-view';
export const VIEW_MODES = ['third', 'first'];

// Camera mode persists per device; third person is the default.
export function readStoredView(storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem(VIEW_STORAGE_KEY);
    return VIEW_MODES.includes(value) ? value : 'third';
  } catch { return 'third'; }
}

export function storeView(mode, storage = globalThis.localStorage) {
  try { if (VIEW_MODES.includes(mode)) storage?.setItem(VIEW_STORAGE_KEY, mode); } catch { /* blocked storage */ }
}
