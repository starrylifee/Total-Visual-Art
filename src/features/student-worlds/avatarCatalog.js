// Plain data about the selectable avatars; the meshes live in avatarSkins.jsx.
export const avatarOptions = [
  { id: 'singom', name: '신곰이', description: '초록 모자를 쓴 친절한 곰' },
  { id: 'sindap', name: '신답이', description: '잎사귀 두 장이 자라는 새싹' },
  { id: 'yongseokping', name: '용석핑', description: '별 왕관과 무지개 머리의 안경 친구' },
];
export const avatarIds = avatarOptions.map(option => option.id);
export const isAvatarId = id => avatarIds.includes(id);
