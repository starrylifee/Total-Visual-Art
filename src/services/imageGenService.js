import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp,
    orderBy,
    onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

export const imageGenService = {
    // STUDENT: Submit Prompt
    submitPrompt: async (sessionId, studentId, promptText) => {
        try {
            // Create request in sub-collection
            const docRef = await addDoc(collection(db, "sessions", sessionId, "generations"), {
                studentId,
                prompt: promptText,
                status: "pending_approval", // pending_approval -> approved -> generated -> published
                createdAt: serverTimestamp(),
                imageUrl: null,
                rejectionReason: null
            });
            return docRef.id;
        } catch (error) {
            console.error("Error submitting prompt:", error);
            throw error;
        }
    },

    // TEACHER/SYSTEM: Subscribe to queue
    subscribeToQueue: (sessionId, callback) => {
        const q = query(collection(db, "sessions", sessionId, "generations"), orderBy("createdAt", "desc"));
        return onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(items);
        });
    },

    // TEACHER: Approve Prompt
    approvePrompt: async (sessionId, genId) => {
        const ref = doc(db, "sessions", sessionId, "generations", genId);
        await updateDoc(ref, { status: "approved" });
    },

    // TEACHER: Reject
    rejectPrompt: async (sessionId, genId, reason) => {
        const ref = doc(db, "sessions", sessionId, "generations", genId);
        await updateDoc(ref, { status: "rejected", rejectionReason: reason });
    },

    // SYSTEM (Simulated by Teacher): Mark as Generated (Upload URL)
    completeGeneration: async (sessionId, genId, imageUrl) => {
        const ref = doc(db, "sessions", sessionId, "generations", genId);
        await updateDoc(ref, { status: "generated", imageUrl });
    },

    // TEACHER: Publish (Show to Student)
    publishImage: async (sessionId, genId) => {
        const ref = doc(db, "sessions", sessionId, "generations", genId);
        await updateDoc(ref, { status: "published" });
    }
};
