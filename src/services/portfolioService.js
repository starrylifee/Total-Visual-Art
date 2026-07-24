import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

// 세션의 모든 모듈 산출물을 교사 권한으로 읽어 학생(출석번호)별로 묶는다.
// 학생 이름은 저장돼 있지 않음 — studentName은 항상 "N번" 형태.
const col = (classId, sessionId, name) =>
    collection(db, 'classes', classId, 'sessions', sessionId, name);

const readAll = async (classId, sessionId, name) => {
    const snap = await getDocs(col(classId, sessionId, name));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// 문서 id(sno_N 또는 sno_N_sb)에서 출석번호 추출
const noFromId = (id) => {
    const m = /^sno_(\d+)/.exec(id || '');
    return m ? Number(m[1]) : null;
};

export async function loadSessionOutputs(classId, sessionId) {
    const [deep, restore, video, artReview, queueSnap] = await Promise.all([
        readAll(classId, sessionId, 'deepAppreciations'),
        readAll(classId, sessionId, 'restoreChallenges'),
        readAll(classId, sessionId, 'videoPrompts'),
        readAll(classId, sessionId, 'artworkReviews'),
        getDocs(query(col(classId, sessionId, 'generationQueue'), where('status', '==', 'published'))),
    ]);
    const published = queueSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const byStudent = new Map();
    const entry = (no) => {
        if (!byStudent.has(no)) {
            byStudent.set(no, { no, deep: null, restore: null, portrait: null, storyboard: null, artReview: null, artworks: [] });
        }
        return byStudent.get(no);
    };

    deep.forEach(d => { const no = noFromId(d.id); if (no) entry(no).deep = d; });
    restore.forEach(d => { const no = noFromId(d.id); if (no) entry(no).restore = d; });
    video.forEach(d => {
        const no = noFromId(d.id);
        if (!no) return;
        if (d.kind === 'storyboard' || d.id.endsWith('_sb')) entry(no).storyboard = d;
        else entry(no).portrait = d;
    });
    artReview.forEach(d => { const no = noFromId(d.id); if (no) entry(no).artReview = d; });
    published.forEach(d => {
        const no = noFromId(d.studentId);
        if (no) entry(no).artworks.push(d);
    });

    // 복원 챌린지의 queueId를 실제 이미지로 연결 (published가 아니어도 본인 큐 문서에서 찾도록 전체 큐가 아닌 published만 — 공개된 것만 포트폴리오에 싣는다)
    const queueById = new Map(published.map(d => [d.id, d]));
    byStudent.forEach(s => {
        if (s.restore) {
            s.restore.image1 = queueById.get(s.restore.queueId1)?.imageUrl || null;
            s.restore.image2 = queueById.get(s.restore.queueId2)?.imageUrl || null;
        }
    });

    const students = Array.from(byStudent.values()).sort((a, b) => a.no - b.no);

    // 3D 갤러리용: AI 생성 작품(published) + 작품 평가 업로드 사진
    const galleryArtworks = [
        ...published
            .filter(d => d.imageUrl)
            .map(d => ({
                id: d.id,
                imageUrl: d.imageUrl,
                title: d.studentName || (noFromId(d.studentId) ? `${noFromId(d.studentId)}번` : '작품'),
                prompt: d.prompt || '',
            })),
        ...artReview
            .filter(d => d.imageDataUrl)
            .map(d => ({
                id: `ar_${d.id}`,
                imageUrl: d.imageDataUrl,
                title: `${d.studentName || `${noFromId(d.id)}번`} 작품`,
                prompt: d.pledge ? `성장 다짐: ${d.pledge}` : '',
            })),
    ];

    return { students, galleryArtworks };
}

export default { loadSessionOutputs };
