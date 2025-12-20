import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
    updateDoc,
    increment
} from 'firebase/firestore';
import { db } from './firebase';

export const badgeService = {
    // TEACHER: Create a custom badge for a class
    createCustomBadge: async (classId, name, iconUrl, description) => {
        try {
            const badgeRef = await addDoc(collection(db, "classes", classId, "badges"), {
                name,
                iconUrl: iconUrl || "https://img.icons8.com/color/96/medal.png", // Default icon
                description,
                type: "teacher_custom",
                createdAt: serverTimestamp()
            });
            return badgeRef.id;
        } catch (error) {
            console.error("Error creating badge:", error);
            throw error;
        }
    },

    // TEACHER/STUDENT: Get all available badges for a class
    getClassBadges: async (classId) => {
        try {
            const q = query(collection(db, "classes", classId, "badges"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching badges:", error);
            return [];
        }
    },

    // TEACHER: Award a badge to a student
    awardBadge: async (classId, studentId, badge) => {
        try {
            const userBadgeRef = doc(db, "users", studentId, "badges", badge.id);
            await setDoc(userBadgeRef, {
                badgeId: badge.id,
                name: badge.name,
                iconUrl: badge.iconUrl,
                description: badge.description,
                classId,
                awardedAt: serverTimestamp(),
                isNew: true
            });
            return true;
        } catch (error) {
            console.error("Error awarding badge:", error);
            throw error;
        }
    },

    // STUDENT: Get my badges
    getStudentBadges: async (studentId) => {
        try {
            const q = collection(db, "users", studentId, "badges");
            const snapshot = await getDocs(q);

            // We need to fetch badge details (name, icon) which are stored in class subcollection.
            // Ideally, we copy name/icon to user's subcollection to save reads, OR we fetch details.
            // Optimization: Copy details on award. 
            // BUT for prototype, let's just return IDs and fetch details in component or assume details copied.
            // Let's Fix awardBadge to copy details for simplicity.
            return snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error("Error getting student badges:", error);
            return [];
        }
    },

    // SYSTEM: Auto-Check Badges (Called after an action)
    // Actions: 'submit_artwork', 'write_critique'
    checkAutoBadges: async (studentId, classId, actionType) => {
        // Logic: Increment counters in user stats, then check thresholds.
        const userRef = doc(db, "users", studentId);

        // 1. Update Stats
        if (actionType === 'submit_artwork') {
            await updateDoc(userRef, { 'stats.artworksCount': increment(1) });
        }

        // 2. Read new Stats
        const userSnap = await getDoc(userRef);
        const stats = userSnap.data().stats || {};

        // 3. Define System Badges (Could be in DB, hardcoded for now)
        const systemBadges = [
            { id: 'sys_artist_1', name: 'Beginner Artist', criteria: { artworksCount: 1 }, icon: '🎨' },
            { id: 'sys_artist_5', name: 'Prolific Painter', criteria: { artworksCount: 5 }, icon: '🖌️' }
        ];

        // 4. Check & Award
        for (const badge of systemBadges) {
            if (stats.artworksCount >= badge.criteria.artworksCount) {
                // Check if already has
                const badgeRef = doc(db, "users", studentId, "badges", badge.id);
                const badgeSnap = await getDoc(badgeRef);
                if (!badgeSnap.exists()) {
                    await setDoc(badgeRef, {
                        badgeId: badge.id,
                        name: badge.name,
                        iconUrl: `https://ui-avatars.com/api/?name=${badge.icon}&background=random`, // Mock Icon
                        classId: 'system',
                        awardedAt: serverTimestamp(),
                        isNew: true
                    });
                    console.log(`Auto-awarded badge: ${badge.name}`);
                }
            }
        }
    }
};
