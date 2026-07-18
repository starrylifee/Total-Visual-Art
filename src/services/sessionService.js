import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
    orderBy,
    doc,
    updateDoc,
    runTransaction
} from 'firebase/firestore';
import { db } from './firebase';

// 혼동되는 글자(0/O, 1/I) 제외한 6자리 활동코드
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const generateJoinCode = () =>
    Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');

// joinCodes/{code} 매핑을 충돌 없이 만들고 세션 문서에 코드를 기록
const assignJoinCode = async (classId, sessionId, teacherId) => {
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateJoinCode();
        const codeRef = doc(db, 'joinCodes', code);
        try {
            await runTransaction(db, async (tx) => {
                const snap = await tx.get(codeRef);
                if (snap.exists()) throw new Error('CODE_TAKEN');
                tx.set(codeRef, { classId, sessionId, teacherId, createdAt: serverTimestamp() });
                tx.update(doc(db, 'classes', classId, 'sessions', sessionId), { joinCode: code });
            });
            return code;
        } catch (e) {
            if (e.message !== 'CODE_TAKEN') throw e;
        }
    }
    throw new Error('활동코드 발급에 실패했습니다. 다시 시도해주세요.');
};

export const sessionService = {
    assignJoinCode,

    // TEACHER: Create a new session in a class
    createSession: async (classId, sessionData) => {
        try {
            /* sessionData structure:
               {
                 title: "Impressionism Study",
                 description: "...",
                 visionPrompt: "...",
                 textPrompt: "...",
                 chatbotInstruction: "...",
                 status: "active" | "archived"
               }
            */
            const status = sessionData.status || "active";
            const sessionRef = await addDoc(collection(db, "classes", classId, "sessions"), {
                ...sessionData,
                status,
                createdAt: serverTimestamp(),
                isActive: status !== "archived"
            });
            // 학생 입장용 활동코드 발급 (실패해도 세션 생성은 유지 — 대시보드에서 재발급 가능)
            if (sessionData.teacherId) {
                try {
                    await assignJoinCode(classId, sessionRef.id, sessionData.teacherId);
                } catch (e) {
                    console.error("활동코드 발급 실패:", e);
                }
            }
            return sessionRef.id;
        } catch (error) {
            console.error("Error creating session:", error);
            throw error;
        }
    },

    // GET: Fetch all sessions for a class
    getClassSessions: async (classId) => {
        try {
            const q = query(
                collection(db, "classes", classId, "sessions"),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching sessions:", error);
            throw error;
        }
    },

    // GET: Fetch active sessions only (for students)
    // Note: Simplified query to avoid complex index requirements
    getActiveSessions: async (classId) => {
        try {
            // First try with isActive filter
            const sessionsRef = collection(db, "classes", classId, "sessions");
            const querySnapshot = await getDocs(sessionsRef);

            // Filter client-side to avoid index issues
            const sessions = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(session => session.isActive !== false && session.status !== 'archived')
                .sort((a, b) => {
                    // Sort by createdAt descending
                    const timeA = a.createdAt?.toMillis?.() || 0;
                    const timeB = b.createdAt?.toMillis?.() || 0;
                    return timeB - timeA;
                });

            console.log(`Found ${sessions.length} active sessions for class ${classId}`);
            return sessions;
        } catch (error) {
            console.error("Error fetching active sessions:", error);
            return []; // Return empty array instead of throwing
        }
    },

    updateSessionStatus: async (classId, sessionId, status) => {
        try {
            const sessionRef = doc(db, "classes", classId, "sessions", sessionId);
            await updateDoc(sessionRef, {
                status,
                isActive: status !== 'archived',
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error updating session status:", error);
            throw error;
        }
    }
};
