/**
 * 학생 접속 API (Vercel Serverless Function)
 * 학생은 Firebase 계정 없이 활동코드 + 출석번호 + 비밀번호(4자리)로 입장한다.
 *
 * POST /api/student
 *  { action: "lookup", code }                       -> 활동 정보 + 등록된 번호 목록
 *  { action: "join",   code, studentNo, password }  -> 최초 입장 시 비밀번호 설정, 재입장 시 확인 -> 세션 토큰 발급
 *  { action: "me",     token }                      -> 토큰 유효성 확인 + 활동 정보 (새로고침 복원용)
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
    return {
        classId: r.classId,
        sessionId: r.sessionId,
        className: r.classData.name || "",
        sessionTitle: r.sessionData.title || "",
        features: r.sessionData.features || null,
        studentCount: r.classData.studentCount || 30,
    };
}

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

            default:
                return res.status(400).json({ error: `알 수 없는 action: ${body.action}` });
        }
    } catch (error) {
        console.error("student API Error:", error);
        return res.status(500).json({ error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." });
    }
}
