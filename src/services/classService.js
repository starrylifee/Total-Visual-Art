import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    arrayUnion,
    serverTimestamp,
    getDoc
} from 'firebase/firestore';
import { db } from './firebase';

// Helper to generate a random 6-character code
const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const classService = {
    // TEACHER: Create a new class
    createClass: async (teacherId, className) => {
        try {
            const inviteCode = generateInviteCode();
            const classRef = await addDoc(collection(db, "classes"), {
                name: className,
                teacherId: teacherId,
                inviteCode: inviteCode,
                students: [], // Array of student UIDs
                pendingStudents: [], // Array of pending student UIDs
                createdAt: serverTimestamp()
            });
            return { id: classRef.id, inviteCode };
        } catch (error) {
            console.error("Error creating class:", error);
            throw error;
        }
    },

    // TEACHER: Get classes for a teacher
    getTeacherClasses: async (teacherId) => {
        try {
            const q = query(collection(db, "classes"), where("teacherId", "==", teacherId));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching classes:", error);
            throw error;
        }
    },

    // STUDENT: Request to join a class
    joinClassRequest: async (studentId, inviteCode) => {
        try {
            // Find class by invite code
            const q = query(collection(db, "classes"), where("inviteCode", "==", inviteCode));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("Invalid Invite Code");
            }

            const classDoc = querySnapshot.docs[0];
            const classData = classDoc.data();

            // Check if already joined or pending
            if (classData.students.includes(studentId)) {
                throw new Error("Already a member of this class");
            }
            if (classData.pendingStudents.includes(studentId)) {
                throw new Error("Join request already pending");
            }

            // Add to pending
            await updateDoc(doc(db, "classes", classDoc.id), {
                pendingStudents: arrayUnion(studentId)
            });

            return { success: true, className: classData.name };
        } catch (error) {
            console.error("Error joining class:", error);
            throw error;
        }
    },

    // TEACHER: Approve a student
    approveStudent: async (classId, studentId) => {
        try {
            const classRef = doc(db, "classes", classId);
            const classSnap = await getDoc(classRef);
            const classData = classSnap.data();

            const newPending = classData.pendingStudents.filter(id => id !== studentId);
            const newStudents = [...classData.students, studentId];

            await updateDoc(classRef, {
                pendingStudents: newPending,
                students: newStudents
            });

            // Update User profile with enrolledClassId (Optional, for easy access)
            const userRef = doc(db, "users", studentId);
            await updateDoc(userRef, {
                enrolledClasses: arrayUnion(classId)
            });

            return true;
        } catch (error) {
            console.error("Error approving student:", error);
            throw error;
        }
    },

    // Fetch pending students details (Mock or Real)
    getPendingStudents: async (studentIds) => {
        // In a real app, you'd fetch user docs where ID is in studentIds
        // For simplicity standard query "in" limit is 10.
        if (!studentIds || studentIds.length === 0) return [];

        const students = [];
        // Manual fetch loop for simplicity in prototype (or use 'in' query)
        for (const id of studentIds) {
            const u = await getDoc(doc(db, "users", id));
            if (u.exists()) students.push({ id: u.id, ...u.data() });
        }
        return students;
    },

    // STUDENT: Get enrolled classes
    getEnrolledClasses: async (classIds) => {
        if (!classIds || classIds.length === 0) return [];
        const classes = [];
        for (const id of classIds) {
            const c = await getDoc(doc(db, "classes", id));
            if (c.exists()) classes.push({ id: c.id, ...c.data() });
        }
        return classes;
    }
};
