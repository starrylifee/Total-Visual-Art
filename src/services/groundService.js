/**
 * Ground API Service for Gamification
 * Uses the Ground API to award points to students
 * 
 * SECURITY NOTE: In production, this should be proxied through Firebase Cloud Functions
 * to hide the API key from client-side code.
 */

const GROUND_API_BASE = 'https://api.ground.dev/v1';

/**
 * Get Ground API credentials from environment or teacher config
 */
function getCredentials() {
    return {
        apiKey: import.meta.env.VITE_GROUND_API_KEY || '',
        classId: import.meta.env.VITE_GROUND_CLASS_ID || ''
    };
}

/**
 * Award points to a student
 * @param {string} studentIdentifier - Student email or ID in Ground system
 * @param {number} points - Number of points to award
 * @param {string} reason - Reason for awarding points
 * @returns {Promise<Object>} - Response from Ground API
 */
export async function awardPoints(studentIdentifier, points, reason = 'Mission Completed') {
    const { apiKey, classId } = getCredentials();

    if (!apiKey || !classId) {
        console.warn('Ground API credentials not configured');
        return { success: false, error: 'API 키가 설정되지 않았습니다' };
    }

    try {
        const response = await fetch(`${GROUND_API_BASE}/classes/${classId}/points`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentId: studentIdentifier,
                points: points,
                reason: reason,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`Ground API error: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('Ground API Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get student's current points
 * @param {string} studentIdentifier 
 * @returns {Promise<Object>}
 */
export async function getStudentPoints(studentIdentifier) {
    const { apiKey, classId } = getCredentials();

    if (!apiKey || !classId) {
        return { success: false, points: 0, error: 'API 키가 설정되지 않았습니다' };
    }

    try {
        const response = await fetch(`${GROUND_API_BASE}/classes/${classId}/students/${studentIdentifier}/points`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`Ground API error: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, points: data.points || 0 };
    } catch (error) {
        console.error('Ground API Error:', error);
        return { success: false, points: 0, error: error.message };
    }
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
