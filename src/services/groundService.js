/**
 * Ground API Service for Gamification (클라이언트)
 * 실제 호출은 서버(/api/ground)에서 수행 — sk_live API 키는 클라이언트에 존재하지 않는다.
 */

async function callGround(payload) {
    try {
        const response = await fetch("/api/ground", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return await response.json();
    } catch (error) {
        console.error("Ground API Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Award points to a student
 * @param {string} studentIdentifier - Student email or ID in Ground system
 * @param {number} points - Number of points to award
 * @param {string} reason - Reason for awarding points
 */
export async function awardPoints(studentIdentifier, points, reason = 'Mission Completed') {
    return callGround({ action: "award", studentId: studentIdentifier, points, reason });
}

/**
 * Get student's current points
 * @param {string} studentIdentifier
 */
export async function getStudentPoints(studentIdentifier) {
    const result = await callGround({ action: "points", studentId: studentIdentifier });
    if (!result.success) {
        return { success: false, points: 0, error: result.error };
    }
    return result;
}

/**
 * Award points for specific achievements
 */
export const ACHIEVEMENT_POINTS = {
    FIRST_ARTWORK: 100,
    ARTWORK_COMPLETED: 50,
    LONG_CRITIQUE: 30,
    PERFECT_PASS: 75,
    DAILY_LOGIN: 10,
    BADGE_EARNED: 25
};

/**
 * Award points for a specific achievement type
 * @param {string} studentEmail
 * @param {keyof ACHIEVEMENT_POINTS} achievementType
 */
export async function awardAchievement(studentEmail, achievementType) {
    const points = ACHIEVEMENT_POINTS[achievementType];
    if (!points) {
        console.warn(`Unknown achievement type: ${achievementType}`);
        return { success: false, error: '알 수 없는 업적 유형' };
    }

    const reasons = {
        FIRST_ARTWORK: '첫 번째 작품 완성!',
        ARTWORK_COMPLETED: '작품 완성',
        LONG_CRITIQUE: '상세한 비평 작성',
        PERFECT_PASS: '한 번에 통과!',
        DAILY_LOGIN: '오늘의 출석',
        BADGE_EARNED: '뱃지 획득'
    };

    return awardPoints(studentEmail, points, reasons[achievementType]);
}

export default {
    awardPoints,
    getStudentPoints,
    awardAchievement,
    ACHIEVEMENT_POINTS
};
