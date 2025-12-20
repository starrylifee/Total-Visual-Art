import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
    orderBy
} from 'firebase/firestore';
import { db } from './firebase';

export const sessionService = {
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
            const sessionRef = await addDoc(collection(db, "classes", classId, "sessions"), {
                ...sessionData,
                createdAt: serverTimestamp(),
                isActive: true
            });
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
    getActiveSessions: async (classId) => {
        try {
            const q = query(
                collection(db, "classes", classId, "sessions"),
                where("isActive", "==", true),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching active sessions:", error);
            throw error;
        }
    }
};
