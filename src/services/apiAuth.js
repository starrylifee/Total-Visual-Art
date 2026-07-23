// 서버리스 API 호출용 인증 헤더 (교사 = Firebase ID 토큰, 학생 = 활동 세션 토큰)
import { auth } from './firebase';
import { studentAuthService } from './studentAuthService';

export async function authHeaders() {
    if (auth.currentUser) {
        return { 'x-teacher-token': await auth.currentUser.getIdToken() };
    }
    const studentToken = studentAuthService.getToken();
    if (studentToken) {
        return { 'x-student-token': studentToken };
    }
    return {};
}
