/**
 * 서버 전용 공용 모듈 (Vercel은 _로 시작하는 파일을 엔드포인트로 노출하지 않음)
 * - Firebase Admin 초기화 (서비스 계정: FIREBASE_SERVICE_ACCOUNT_B64)
 * - 학생 세션 토큰 서명/검증 (HMAC-SHA256, STUDENT_TOKEN_SECRET)
 * - 비밀번호 해시 (scrypt + 랜덤 솔트)
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import crypto from "node:crypto";

const clean = (v) => (v || "").replace(/^﻿/, "").trim();

let _db = null;
export function adminDb() {
    if (_db) return _db;
    if (!getApps().length) {
        const b64 = clean(process.env.FIREBASE_SERVICE_ACCOUNT_B64);
        if (!b64) throw new Error("FIREBASE_SERVICE_ACCOUNT_B64가 설정되지 않았습니다.");
        const serviceAccount = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
        initializeApp({ credential: cert(serviceAccount) });
    }
    _db = getFirestore();
    try {
        _db.settings({ preferRest: true }); // 콜드스타트 단축
    } catch { /* settings는 첫 사용 전 1회만 가능 */ }
    return _db;
}

/**
 * 요청 인증: 학생 토큰(x-student-token) 또는 교사 Firebase ID 토큰(x-teacher-token)
 * 반환: { role: 'student', ...페이로드 } | { role: 'teacher', uid } | null
 */
export async function authenticateRequest(req) {
    const studentToken = req.headers["x-student-token"];
    if (studentToken) {
        const payload = verifyStudentToken(studentToken);
        return payload ? { role: "student", ...payload } : null;
    }
    const teacherToken = req.headers["x-teacher-token"];
    if (teacherToken) {
        // firebase-admin/auth 대신 Identity Toolkit REST로 검증
        // (admin/auth가 끌고 오는 jwks-rsa가 Vercel 런타임에서 ESM jose를 require 하다 크래시)
        try {
            const apiKey = clean(process.env.VITE_FIREBASE_API_KEY);
            if (!apiKey) return null;
            const resp = await fetch(
                `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idToken: teacherToken }),
                }
            );
            if (!resp.ok) return null;
            const data = await resp.json();
            const uid = data.users?.[0]?.localId;
            return uid ? { role: "teacher", uid } : null;
        } catch {
            return null;
        }
    }
    return null;
}

// ---------- 학생 세션 토큰 ----------
const b64url = (buf) => Buffer.from(buf).toString("base64url");

function tokenSecret() {
    const s = clean(process.env.STUDENT_TOKEN_SECRET);
    if (!s) throw new Error("STUDENT_TOKEN_SECRET이 설정되지 않았습니다.");
    return s;
}

const TOKEN_TTL_MS = 10 * 60 * 60 * 1000; // 10시간 (수업일 하루)

export function signStudentToken({ classId, sessionId, studentNo }) {
    const payload = { c: classId, s: sessionId, n: studentNo, exp: Date.now() + TOKEN_TTL_MS, v: 1 };
    const body = b64url(JSON.stringify(payload));
    const sig = crypto.createHmac("sha256", tokenSecret()).update(body).digest("base64url");
    return `${body}.${sig}`;
}

export function verifyStudentToken(token) {
    if (typeof token !== "string" || !token.includes(".")) return null;
    const [body, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", tokenSecret()).update(body).digest("base64url");
    const a = Buffer.from(sig || "");
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
        const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
        if (!payload.exp || Date.now() > payload.exp) return null;
        return { classId: payload.c, sessionId: payload.s, studentNo: payload.n };
    } catch {
        return null;
    }
}

// ---------- 비밀번호 해시 ----------
export function hashPassword(password, salt) {
    return crypto.scryptSync(String(password), salt, 32).toString("hex");
}

export function makeSalt() {
    return crypto.randomBytes(16).toString("hex");
}
