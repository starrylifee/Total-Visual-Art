// 학생 접속: 활동코드 + 출석번호 + 비밀번호 -> 서버가 발급한 세션 토큰을 보관·복원한다.
const API = "/api/student";
const TOKEN_KEY = "tva_student_token";
const INFO_KEY = "tva_student_info";

async function call(payload) {
    const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data.error || "요청에 실패했어요.");
        err.status = res.status;
        throw err;
    }
    return data;
}

export const studentAuthService = {
    // 활동코드 확인 -> 활동 정보 + 이미 비밀번호를 만든 번호 목록
    lookup: (code) => call({ action: "lookup", code }),

    // 입장 (최초면 비밀번호 설정, 재입장이면 확인). 성공 시 토큰 저장
    join: async (code, studentNo, password) => {
        const data = await call({ action: "join", code, studentNo, password });
        localStorage.setItem(TOKEN_KEY, data.token);
        const { token, ...info } = data;
        localStorage.setItem(INFO_KEY, JSON.stringify(info));
        return data;
    },

    // 저장된 토큰으로 세션 복원 (새로고침 대응). 실패하면 null
    restore: async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return null;
        try {
            const info = await call({ action: "me", token });
            localStorage.setItem(INFO_KEY, JSON.stringify(info));
            return { token, ...info };
        } catch {
            studentAuthService.clear();
            return null;
        }
    },

    getToken: () => localStorage.getItem(TOKEN_KEY),

    getInfo: () => {
        try {
            return JSON.parse(localStorage.getItem(INFO_KEY));
        } catch {
            return null;
        }
    },

    clear: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(INFO_KEY);
    },
};
