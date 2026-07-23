import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp,
    deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

export const classService = {
    // TEACHER: Create a new class (학생은 활동코드로 입장하므로 명단·초대코드 없음)
    createClass: async (teacherId, className, studentCount = 30) => {
        try {
            const classRef = await addDoc(collection(db, "classes"), {
                name: className,
                teacherId: teacherId,
                studentCount: studentCount,
                createdAt: serverTimestamp()
            });
            return { id: classRef.id };
        } catch (error) {
            console.error("Error creating class:", error);
            throw error;
        }
    },

    // TEACHER: 학생 수(출석번호 범위) 변경
    updateStudentCount: async (classId, studentCount) => {
        await updateDoc(doc(db, "classes", classId), { studentCount });
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

    // TEACHER: 비밀번호를 등록한 학생 번호 목록 (활동코드 접속 체계)
    getRegisteredStudents: async (classId) => {
        const snapshot = await getDocs(collection(db, "classes", classId, "students"));
        return snapshot.docs
            .map(d => ({ no: Number(d.id), ...d.data() }))
            .filter(s => Number.isInteger(s.no))
            .sort((a, b) => a.no - b.no);
    },

    // TEACHER: 학생 비밀번호 초기화 (문서 삭제 -> 다음 입장 때 새로 설정)
    resetStudentPassword: async (classId, studentNo) => {
        await deleteDoc(doc(db, "classes", classId, "students", String(studentNo)));
    }
};
