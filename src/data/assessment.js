/**
 * 연구 평가 모듈 (모듈 6) — 사전·사후 서술형 검사
 * - 문항은 교사가 활동별로 편집 가능. 아래는 기본 템플릿
 * - 채점은 문항당 0~3점 4단계, 총점 15점 (AI 초벌 → 교사 확정)
 */

// 펠드만 4단계(서술·분석·해석·판단) + AI 융합 태도를 고루 재도록 구성
export const DEFAULT_ASSESSMENT_QUESTIONS = [
    '그림을 감상할 때 무엇을 가장 먼저 살펴보나요? 그렇게 하는 까닭도 함께 써 보세요.',
    '마음에 드는 그림을 하나 떠올려, 그 그림의 색과 모양이 서로 어떻게 어울리는지 설명해 보세요.',
    '그림을 그린 화가가 어떤 마음이었을지 짐작해 쓰고, 그렇게 생각한 까닭을 그림에서 찾아 써 보세요.',
    '좋은 미술 작품이란 어떤 작품이라고 생각하나요? 내 생각과 그 까닭을 써 보세요.',
    '미술 시간에 인공지능(AI)을 어떻게 쓰면 좋을까요? 좋은 점과 조심할 점을 함께 써 보세요.',
];

// 0~3점 채점 기준 (AI 프롬프트와 교사 화면이 같은 기준을 쓴다)
export const SCORE_LEVELS = [
    { score: 0, label: '미응답', desc: '답을 쓰지 않았거나 질문과 관련이 없음' },
    { score: 1, label: '단순', desc: '한두 낱말 수준으로만 답하고 까닭이 없음' },
    { score: 2, label: '구체', desc: '내용을 구체적으로 썼으나 까닭·근거가 약함' },
    { score: 3, label: '근거', desc: '구체적으로 쓰고 작품이나 경험에서 까닭을 들어 설명함' },
];

export const MAX_SCORE_PER_ITEM = 3;

export const PHASE_LABELS = { pre: '사전 검사', post: '사후 검사' };

export default { DEFAULT_ASSESSMENT_QUESTIONS, SCORE_LEVELS, MAX_SCORE_PER_ITEM, PHASE_LABELS };
