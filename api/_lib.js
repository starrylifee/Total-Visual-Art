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
