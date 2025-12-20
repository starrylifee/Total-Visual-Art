import {
    collection,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp,
    orderBy,
    onSnapshot,
    query
} from 'firebase/firestore';
import { db } from './firebase';

export const imageGenService = {
    // STUDENT: Submit Prompt (requires classId and sessionId)
    submitPrompt: async (classId, sessionId, studentId, promptText, studentName = '') => {
        try {
            // Correct path: classes/{classId}/sessions/{sessionId}/generationQueue
            const queueRef = collection(db, "classes", classId, "sessions", sessionId, "generationQueue");
            const docRef = await addDoc(queueRef, {
                studentId,
                studentName,
                prompt: promptText,
                status: "pending_approval", // pending_approval -> approved -> generated -> published
                createdAt: serverTimestamp(),
                imageUrl: null,
                rejectionReason: null
            });
            console.log("Prompt submitted:", docRef.id);
            return docRef.id;
        } catch (error) {
            console.error("Error submitting prompt:", error);
            throw error;
        }
    },

    // TEACHER/SYSTEM: Subscribe to queue (real-time updates)
    subscribeToQueue: (classId, sessionId, callback) => {
        if (!classId || !sessionId) {
            console.warn("Missing classId or sessionId for queue subscription");
            callback([]);
            return () => { }; // Return empty unsubscribe function
        }

        const queueRef = collection(db, "classes", classId, "sessions", sessionId, "generationQueue");
        const q = query(queueRef, orderBy("createdAt", "desc"));

        return onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(`Queue update: ${items.length} items`);
            callback(items);
        }, (error) => {
            console.error("Queue subscription error:", error);
            callback([]);
        });
    },

    // TEACHER: Approve Prompt
    approvePrompt: async (classId, sessionId, genId) => {
        const ref = doc(db, "classes", classId, "sessions", sessionId, "generationQueue", genId);
        await updateDoc(ref, { status: "approved", approvedAt: serverTimestamp() });
    },

    // TEACHER: Reject
    rejectPrompt: async (classId, sessionId, genId, reason = '적절하지 않음') => {
        const ref = doc(db, "classes", classId, "sessions", sessionId, "generationQueue", genId);
        await updateDoc(ref, { status: "rejected", rejectionReason: reason });
    },

    // SYSTEM (Simulated): Mark as Generated with image URL
    completeGeneration: async (classId, sessionId, genId, imageUrl) => {
        const ref = doc(db, "classes", classId, "sessions", sessionId, "generationQueue", genId);
        await updateDoc(ref, { status: "generated", imageUrl, generatedAt: serverTimestamp() });
    },

    // TEACHER: Publish (Show to Student)
    publishImage: async (classId, sessionId, genId) => {
        const ref = doc(db, "classes", classId, "sessions", sessionId, "generationQueue", genId);
        await updateDoc(ref, { status: "published", publishedAt: serverTimestamp() });
    },

    // TEACHER ONLY: Delete a generation item
    deleteGeneration: async (classId, sessionId, genId) => {
        const { deleteDoc } = await import('firebase/firestore');
        const ref = doc(db, "classes", classId, "sessions", sessionId, "generationQueue", genId);
        await deleteDoc(ref);
        console.log("Deleted generation:", genId);
    }
};
