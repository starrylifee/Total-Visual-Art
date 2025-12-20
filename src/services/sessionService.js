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
    // Note: Simplified query to avoid complex index requirements
    getActiveSessions: async (classId) => {
        try {
            // First try with isActive filter
            const sessionsRef = collection(db, "classes", classId, "sessions");
            const querySnapshot = await getDocs(sessionsRef);

            // Filter client-side to avoid index issues
            const sessions = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(session => session.isActive !== false) // Include if isActive is true or undefined
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
    }
};
