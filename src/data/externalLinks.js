// 외부 도구 링크 (PLAN 결정사항: 유니콘 = 공용, 유니콘 이미지 생성 = 교사 전용)
export const EXTERNAL_LINKS = {
    unicorn: {
        label: '메타인지 유니콘',
        emoji: '🦄',
        url: 'https://metacog-unicorn.vercel.app/',
        desc: '명화 감상 대화 (AI 도슨트)',
        audience: 'all', // 학생·교사 공용
    },
    unicornImageGen: {
        label: '유니콘 이미지 생성',
        emoji: '🎨',
        url: 'https://metacog-unicorn-imagegen.vercel.app/',
        desc: '교사용 이미지 생성 도구',
        audience: 'teacher', // 교사 화면에만
    },
};

export default EXTERNAL_LINKS;
