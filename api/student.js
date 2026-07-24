/**
 * 학생 접속 API (Vercel Serverless Function)
 * 학생은 Firebase 계정 없이 활동코드 + 출석번호 + 비밀번호(4자리)로 입장한다.
 *
 * POST /api/student
 *  { action: "lookup", code }                       -> 활동 정보 + 등록된 번호 목록
 *  { action: "join",   code, studentNo, password }  -> 최초 입장 시 비밀번호 설정, 재입장 시 확인 -> 세션 토큰 발급
 *  { action: "me",     token }                      -> 토큰 유효성 확인 + 활동 정보 (새로고침 복원용)
 *
 * 활동 데이터 (토큰 필요):
 *  { action: "queue-submit",        token, prompt }                 -> 이미지 생성 승인 요청
 *  { action: "queue-list",          token }                         -> 내 생성 요청 목록
 *  { action: "appreciation-submit", token, observation, reflection } -> 감상 저장
 *  { action: "deep-save", token, stage, firstText, questions, secondText } -> 1·2차 감상 저장(모듈1)
 *  { action: "deep-get",  token }                                    -> 내 1·2차 감상 불러오기(재입장 복원)
 *  { action: "restore-save", token, patch }                          -> 복원 챌린지 진행 저장(모듈2, 화이트리스트 merge)
 *  { action: "restore-get",  token }                                 -> 내 복원 챌린지 불러오기
 *  { action: "portrait-save", token, patch }                         -> 인물의 하루 진행 저장(모듈3)
 *  { action: "portrait-get",  token }                                -> 내 인물의 하루 불러오기(영상 URL 포함)
 *  { action: "gallery-list", token }                                 -> 이 활동의 공개 작품 갤러리(모듈4, 최신 30개)
 *  { action: "storyboard-save", token, patch }                       -> 스토리보드 진행 저장(모듈4)
 *  { action: "storyboard-get",  token }                              -> 내 스토리보드 불러오기
 */
import { adminDb, signStudentToken, verifyStudentToken, hashPassword, makeSalt } from "./_lib.js";
import { FieldValue } from "firebase-admin/firestore";

const MAX_STUDENT_NO = 40;

// 활동코드 -> {classDoc, sessionDoc} 조회. 문제 있으면 {error} 반환
async function resolveCode(db, rawCode) {
    const code = String(rawCode || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(code)) return { error: "활동 코드를 다시 확인해 주세요." };

    const mapSnap = await db.doc(`joinCodes/${code}`).get();
    if (!mapSnap.exists) return { error: "활동 코드를 찾을 수 없어요. 선생님께 확인해 주세요." };
    const { classId, sessionId } = mapSnap.data();

    const [classSnap, sessionSnap] = await Promise.all([
        db.doc(`classes/${classId}`).get(),
        db.doc(`classes/${classId}/sessions/${sessionId}`).get(),
    ]);
    if (!classSnap.exists || !sessionSnap.exists) {
        return { error: "활동을 찾을 수 없어요. 선생님께 확인해 주세요." };
    }
    const session = sessionSnap.data();
    if (session.isActive === false || session.status === "archived") {
        return { error: "지금은 닫혀 있는 활동이에요. 선생님께 확인해 주세요." };
    }
    return { code, classId, sessionId, classData: classSnap.data(), sessionData: session };
}

function sessionInfo(r) {
    const s = r.sessionData;
    return {
        classId: r.classId,
        sessionId: r.sessionId,
        className: r.classData.name || "",
        sessionTitle: s.title || "",
        features: s.features || null,
        studentCount: r.classData.studentCount || 30,
        visionPrompt: s.visionPrompt || "",
        textPrompt: s.textPrompt || "",
        chatbotInstruction: s.chatbotInstruction || "",
        referenceImageUrl: s.referenceImageUrl || "",
        referenceVideoUrl: s.referenceVideoUrl || "",
        masterpieceId: s.masterpieceId || null,
        rubric: Array.isArray(s.rubric) ? s.rubric : [],
        portraitImageUrl: s.portraitImageUrl || "",
        portraitName: s.portraitName || "",
        portraitDesc: s.portraitDesc || "",
    };
}

// 토큰 검증 + 세션이 아직 열려 있는지 확인. 실패 시 {error, status}
async function requireStudent(db, token) {
    const auth = verifyStudentToken(token);
    if (!auth) return { error: "세션이 만료되었어요. 다시 입장해 주세요.", status: 401 };
    const sessionSnap = await db.doc(`classes/${auth.classId}/sessions/${auth.sessionId}`).get();
    if (!sessionSnap.exists) return { error: "활동을 찾을 수 없어요.", status: 404 };
    const session = sessionSnap.data();
    if (session.isActive === false || session.status === "archived") {
        return { error: "지금은 닫혀 있는 활동이에요.", status: 403 };
    }
    return { auth, sessionData: session };
}

// 토큰 학생의 Firestore 식별자 (기존 uid 기반 데이터와 구분됨)
const studentIdOf = (no) => `sno_${no}`;
const millis = (ts) => (ts && typeof ts.toMillis === "function" ? ts.toMillis() : null);

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "POST만 허용됩니다." });
    }
    const body = req.body || {};
    const db = adminDb();

    try {
        switch (body.action) {
            case "lookup": {
                const r = await resolveCode(db, body.code);
                if (r.error) return res.status(404).json({ error: r.error });

                const studentsSnap = await db.collection(`classes/${r.classId}/students`).get();
                const registered = studentsSnap.docs
                    .filter((d) => d.data().passwordHash)
                    .map((d) => Number(d.id))
                    .filter((n) => Number.isInteger(n));
                return res.status(200).json({ ...sessionInfo(r), code: r.code, registered });
            }

            case "join": {
                const r = await resolveCode(db, body.code);
                if (r.error) return res.status(404).json({ error: r.error });

                const studentNo = Number(body.studentNo);
                if (!Number.isInteger(studentNo) || studentNo < 1 || studentNo > MAX_STUDENT_NO) {
                    return res.status(400).json({ error: "출석번호를 다시 확인해 주세요." });
                }
                const password = String(body.password || "");
                if (!/^\d{4}$/.test(password)) {
                    return res.status(400).json({ error: "비밀번호는 숫자 4자리로 해 주세요." });
                }

                const studentRef = db.doc(`classes/${r.classId}/students/${studentNo}`);
                // 트랜잭션: 같은 번호로 동시에 최초 입장해도 한 명만 비밀번호를 설정하게
                const result = await db.runTransaction(async (tx) => {
                    const snap = await tx.get(studentRef);
                    const data = snap.exists ? snap.data() : null;

                    if (!data || !data.passwordHash) {
                        const salt = makeSalt();
                        tx.set(studentRef, {
                            passwordSalt: salt,
                            passwordHash: hashPassword(password, salt),
                            firstJoinedAt: data?.firstJoinedAt || FieldValue.serverTimestamp(),
                            lastJoinedAt: FieldValue.serverTimestamp(),
                        }, { merge: true });
                        return { ok: true, isNew: true };
                    }
                    if (hashPassword(password, data.passwordSalt) !== data.passwordHash) {
                        return { ok: false };
                    }
                    tx.update(studentRef, { lastJoinedAt: FieldValue.serverTimestamp() });
                    return { ok: true, isNew: false };
                });

                if (!result.ok) {
                    return res.status(401).json({ error: "비밀번호가 맞지 않아요. 기억나지 않으면 선생님께 초기화를 요청하세요." });
                }
                const token = signStudentToken({ classId: r.classId, sessionId: r.sessionId, studentNo });
                return res.status(200).json({ token, studentNo, isNew: result.isNew, ...sessionInfo(r) });
            }

            case "me": {
                const auth = verifyStudentToken(body.token);
                if (!auth) return res.status(401).json({ error: "세션이 만료되었어요. 다시 입장해 주세요." });

                const [classSnap, sessionSnap] = await Promise.all([
                    db.doc(`classes/${auth.classId}`).get(),
                    db.doc(`classes/${auth.classId}/sessions/${auth.sessionId}`).get(),
                ]);
                if (!classSnap.exists || !sessionSnap.exists) {
                    return res.status(404).json({ error: "활동을 찾을 수 없어요." });
                }
                const session = sessionSnap.data();
                if (session.isActive === false || session.status === "archived") {
                    return res.status(403).json({ error: "지금은 닫혀 있는 활동이에요." });
                }
                return res.status(200).json({
                    studentNo: auth.studentNo,
                    ...sessionInfo({ classId: auth.classId, sessionId: auth.sessionId, classData: classSnap.data(), sessionData: session }),
                });
            }

            case "queue-submit": {
                const r = await requireStudent(db, body.token);
                if (r.error) return res.status(r.status).json({ error: r.error });

                const prompt = String(body.prompt || "").trim();
                if (!prompt) return res.status(400).json({ error: "그리고 싶은 내용을 적어 주세요." });
                if (prompt.length > 1000) return res.status(400).json({ error: "설명이 너무 길어요. 조금 줄여 주세요." });

                // 모듈2 복원 챌린지 제출이면 회차를 함께 기록 (교사 큐에서 구분)
                const kind = body.kind === "restore" ? "restore" : "free";
                const round = kind === "restore" ? (Number(body.round) === 2 ? 2 : 1) : null;

                const { classId, sessionId, studentNo } = r.auth;
                const docRef = await db.collection(`classes/${classId}/sessions/${sessionId}/generationQueue`).add({
                    studentId: studentIdOf(studentNo),
                    studentName: `${studentNo}번`,
                    prompt: kind === "restore" ? `[복원 ${round}차] ${prompt}` : prompt,
                    kind,
                    round,
                    status: "pending_approval",
                    createdAt: FieldValue.serverTimestamp(),
                    imageUrl: null,
                    rejectionReason: null,
                });
                return res.status(200).json({ id: docRef.id });
            }

            case "queue-list": {
                const r = await requireStudent(db, body.token);
                if (r.error) return res.status(r.status).json({ error: r.error });

                const { classId, sessionId, studentNo } = r.auth;
                const snap = await db.collection(`classes/${classId}/sessions/${sessionId}/generationQueue`)
                    .where("studentId", "==", studentIdOf(studentNo))
                    .get();
                const items = snap.docs
                    .map((d) => {
                        const x = d.data();
                        return {
                            id: d.id,
                            prompt: x.prompt,
                            status: x.status,
                            imageUrl: x.status === "published" ? x.imageUrl : null,
                            rejectionReason: x.rejectionReason || null,
                            createdAt: millis(x.createdAt),
                        };
                    })
                    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                return res.status(200).json({ items });
            }

            case "appreciation-submit": {
                const r = await requireStudent(db, body.token);
                if (r.error) return res.status(r.status).json({ error: r.error });

                const observation = String(body.observation || "").trim();
                const reflection = String(body.reflection || "").trim();
                if (!reflection) return res.status(400).json({ error: "성찰 내용을 적어 주세요." });
                if (observation.length > 5000 || reflection.length > 5000) {
                    return res.status(400).json({ error: "글이 너무 길어요. 조금 줄여 주세요." });
                }

                const { classId, sessionId, studentNo } = r.auth;
                const docRef = await db.collection(`classes/${classId}/sessions/${sessionId}/appreciations`).add({
                    studentId: studentIdOf(studentNo),
                    studentName: `${studentNo}번`,
                    observation,
                    reflection,
                    createdAt: FieldValue.serverTimestamp(),
                });
                return res.status(200).json({ id: docRef.id });
            }

            // 모듈 1: 1차 감상 → AI 비계 질문 → 2차 감상. 학생당 문서 1개(재입장 복원 가능)
            case "deep-save": {
                const r = await requireStudent(db, body.token);
                if (r.error) return res.status(r.status).json({ error: r.error });

                const { classId, sessionId, studentNo } = r.auth;
                const stage = body.stage;
                const docRef = db.doc(`classes/${classId}/sessions/${sessionId}/deepAppreciations/${studentIdOf(studentNo)}`);

                if (stage === "first") {
                    const firstText = String(body.firstText || "").trim();
                    const questions = (Array.isArray(body.questions) ? body.questions : [])
                        .map((q) => String(q).slice(0, 300)).slice(0, 5);
                    if (!firstText) return res.status(400).json({ error: "1차 감상을 적어 주세요." });
                    if (firstText.length > 5000) return res.status(400).json({ error: "글이 너무 길어요. 조금 줄여 주세요." });
                    await docRef.set({
                        studentId: studentIdOf(studentNo),
                        studentName: `${studentNo}번`,
                        firstText,
                        questions,
                        status: "first_done",
                        updatedAt: FieldValue.serverTimestamp(),
                    }, { merge: true });
                    return res.status(200).json({ ok: true });
                }
                if (stage === "second") {
                    const secondText = String(body.secondText || "").trim();
                    if (!secondText) return res.status(400).json({ error: "2차 감상을 적어 주세요." });
                    if (secondText.length > 5000) return res.status(400).json({ error: "글이 너무 길어요. 조금 줄여 주세요." });
                    await docRef.set({
                        secondText,
                        status: "second_done",
                        updatedAt: FieldValue.serverTimestamp(),
                    }, { merge: true });
                    return res.status(200).json({ ok: true });
                }
                return res.status(400).json({ error: "stage는 first 또는 second여야 합니다." });
            }

            case "deep-get": {
                const r = await requireStudent(db, body.token);
                if (r.error) return res.status(r.status).json({ error: r.error });

                const { classId, sessionId, studentNo } = r.auth;
                const snap = await db.doc(`classes/${classId}/sessions/${sessionId}/deepAppreciations/${studentIdOf(studentNo)}`).get();
                if (!snap.exists) return res.status(200).json({ data: null });
                const x = snap.data();
                return res.status(200).json({
                    data: {
                        firstText: x.firstText || "",
                        questions: x.questions || [],
                        secondText: x.secondText || "",
                        status: x.status || "",
                    },
                });
            }

            // 모듈 2: 복원 챌린지 진행 상태. 학생당 문서 1개, 허용 필드만 merge
            case "restore-save": {
                const r = await requireStudent(db, body.token);
                if (r.error) return res.status(r.status).json({ error: r.error });

                const src = body.patch || {};
                const patch = {};
                for (const key of ["observation1", "prompt1", "queueId1", "observation2", "prompt2", "queueId2", "reflection", "praise"]) {
                    if (src[key] !== undefined) {
                        const v = String(src[key]).trim();
                        if (v.length > 5000) return res.status(400).json({ error: "글이 너무 길어요. 조금 줄여 주세요." });
                        patch[key] = v;
                    }
                }
                for (const key of ["diff1", "diff2"]) {
                    if (src[key] !== undefined) {
                        if (!Array.isArray(src[key])) return res.status(400).json({ error: `${key}는 배열이어야 합니다.` });
                        patch[key] = src[key].map((d) => String(d).slice(0, 300)).slice(0, 2);
                    }
                }
                if (!Object.keys(patch).length) return res.status(400).json({ error: "저장할 내용이 없습니다." });

                const { classId, sessionId, studentNo } = r.auth;
                await db.doc(`classes/${classId}/sessions/${sessionId}/restoreChallenges/${studentIdOf(studentNo)}`).set({
                    studentId: studentIdOf(studentNo),
                    studentName: `${studentNo}번`,
                    ...patch,
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
                return res.status(200).json({ ok: true });
            }

            case "restore-get": {
                const r = await requireStudent(db, body.token);
                if (r.error) return res.status(r.status).json({ error: r.error });

                const { classId, sessionId, studentNo } = r.auth;
                const snap = await db.doc(`classes/${classId}/sessions/${sessionId}/restoreChallenges/${studentIdOf(studentNo)}`).get();
                if (!snap.exists) return res.status(200).json({ data: null });
                const x = snap.data();
                delete x.updatedAt;
                return res.status(200).json({ data: x });
            }

            // 모듈 3: 인물의 하루 (감정·상황·의상 관찰 → 영상 프롬프트). 학생당 문서 1개
            // 영상 URL(videoUrl)은 교사가 오퍼레이터 보드에서 직접 기록 — 학생은 저장 불가
            case "portrait-save": {
                const r = await requireStudent(db, body.token);
                if (r.error) return res.status(r.status).json({ error: r.error });

                const src = body.patch || {};
                const patch = {};
                for (const key of ["feelings", "situation", "clothes", "prompt", "aiComment"]) {
                    if (src[key] !== undefined) {
                        const v = String(src[key]).trim();
                        if (v.length > 3000) return res.status(400).json({ error: "글이 너무 길어요. 조금 줄여 주세요." });
                        patch[key] = v;
                    }
                }
                if (src.submitted === true) patch.status = "submitted";
                if (!Object.keys(patch).length) return res.status(400).json({ error: "저장할 내용이 없습니다." });

                const { classId, sessionId, studentNo } = r.auth;
                await db.doc(`classes/${classId}/sessions/${sessionId}/videoPrompts/${studentIdOf(studentNo)}`).set({
                    studentId: studentIdOf(studentNo),
                    studentName: `${studentNo}번`,
                    ...patch,
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
                return res.status(200).json({ ok: true });
            }

            case "portrait-get": {
                const r = await requireStudent(db, body.token);
                if (r.error) return res.status(r.status).json({ error: r.error });

                const { classId, sessionId, studentNo } = r.auth;
                const snap = await db.doc(`classes/${classId}/sessions/${sessionId}/videoPrompts/${studentIdOf(studentNo)}`).get();
                if (!snap.exists) return res.status(200).json({ data: null });
                const x = snap.data();
                return res.status(200).json({
                    data: {
                        feelings: x.feelings || "",
                        situation: x.situation || "",
                        clothes: x.clothes || "",
                        prompt: x.prompt || "",
                        aiComment: x.aiComment || "",
                        status: x.status || "",
                        videoUrl: x.videoUrl || "",
                    },
                });
            }

            // 모듈 4: 이 활동에서 공개된 작품 갤러리 (친구 작품 선택용). 이름 대신 출석번호만 노출
            case "gallery-list": {
                const r = await requireStudent(db, body.token);
                if (r.error) return res.status(r.status).json({ error: r.error });

                const { classId, sessionId } = r.auth;
                const snap = await db.collection(`classes/${classId}/sessions/${sessionId}/generationQueue`)
                    .where("status", "==", "published")
                    .get();
                const items = snap.docs
                    .map((d) => {
                        const x = d.data();
                        return {
                            id: d.id,
                            studentName: x.studentName || "",
                            imageUrl: x.imageUrl || null,
                            createdAt: millis(x.createdAt),
                        };
                    })
                    .filter((x) => x.imageUrl)
                    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                    .slice(0, 30);
                return res.status(200).json({ items });
            }

            // 모듈 4: 스토리보드 (친구 작품 감상 → 3~4컷 → 영상 프롬프트).
            // 문서 id는 {sno}_sb — 오퍼레이터 보드(videoPrompts 컬렉션)가 그대로 읽는다
            case "storyboard-save": {
                const r = await requireStudent(db, body.token);
                if (r.error) return res.status(r.status).json({ error: r.error });

                const src = body.patch || {};
                const patch = {};
                for (const key of ["chosenQueueId", "appreciation", "prompt"]) {
                    if (src[key] !== undefined) {
                        const v = String(src[key]).trim();
                        if (v.length > 3000) return res.status(400).json({ error: "글이 너무 길어요. 조금 줄여 주세요." });
                        patch[key] = v;
                    }
                }
                if (src.cuts !== undefined) {
                    if (!Array.isArray(src.cuts) || src.cuts.length < 3 || src.cuts.length > 4) {
                        return res.status(400).json({ error: "스토리보드는 3~4컷이어야 해요." });
                    }
                    patch.cuts = src.cuts.map((c) => String(c).slice(0, 500));
                }
                if (src.submitted === true) patch.status = "submitted";
                if (!Object.keys(patch).length) return res.status(400).json({ error: "저장할 내용이 없습니다." });

                const { classId, sessionId, studentNo } = r.auth;
                await db.doc(`classes/${classId}/sessions/${sessionId}/videoPrompts/${studentIdOf(studentNo)}_sb`).set({
                    studentId: studentIdOf(studentNo),
                    studentName: `${studentNo}번`,
                    kind: "storyboard",
                    ...patch,
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
                return res.status(200).json({ ok: true });
            }

            case "storyboard-get": {
                const r = await requireStudent(db, body.token);
                if (r.error) return res.status(r.status).json({ error: r.error });

                const { classId, sessionId, studentNo } = r.auth;
                const snap = await db.doc(`classes/${classId}/sessions/${sessionId}/videoPrompts/${studentIdOf(studentNo)}_sb`).get();
                if (!snap.exists) return res.status(200).json({ data: null });
                const x = snap.data();
                return res.status(200).json({
                    data: {
                        chosenQueueId: x.chosenQueueId || "",
                        appreciation: x.appreciation || "",
                        cuts: x.cuts || [],
                        prompt: x.prompt || "",
                        status: x.status || "",
                        videoUrl: x.videoUrl || "",
                    },
                });
            }

            default:
                return res.status(400).json({ error: `알 수 없는 action: ${body.action}` });
        }
    } catch (error) {
        console.error("student API Error:", error);
        return res.status(500).json({ error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." });
    }
}
