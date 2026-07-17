/**
 * 그라운드(게이미피케이션) API 프록시 (Vercel Serverless Function)
 * sk_live API 키를 서버에만 둔다.
 *
 * POST /api/ground
 *  { action: "award",  studentId, points, reason }  -> { success, data | error }
 *  { action: "points", studentId }                  -> { success, points | error }
 */
const GROUND_API_BASE = "https://api.ground.dev/v1";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "POST만 허용됩니다." });
    }

    // BOM·공백 제거 (환경변수 등록 과정에서 섞일 수 있음)
    const apiKey = (process.env.GROUND_API_KEY || "").replace(/^\uFEFF/, "").trim();
    const classId = (process.env.GROUND_CLASS_ID || "").replace(/^\uFEFF/, "").trim();
    if (!apiKey || !classId) {
        return res.status(200).json({ success: false, error: "그라운드 API 키가 서버에 설정되지 않았습니다." });
    }

    const { action, studentId, points, reason } = req.body || {};
    if (!studentId) return res.status(400).json({ error: "studentId가 필요합니다." });

    try {
        if (action === "award") {
            const response = await fetch(`${GROUND_API_BASE}/classes/${classId}/points`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    studentId,
                    points,
                    reason: reason || "Mission Completed",
                    timestamp: new Date().toISOString(),
                }),
            });
            if (!response.ok) throw new Error(`Ground API error: ${response.status}`);
            const data = await response.json();
            return res.status(200).json({ success: true, data });
        }

        if (action === "points") {
            const response = await fetch(`${GROUND_API_BASE}/classes/${classId}/students/${studentId}/points`, {
                headers: { "Authorization": `Bearer ${apiKey}` },
            });
            if (!response.ok) throw new Error(`Ground API error: ${response.status}`);
            const data = await response.json();
            return res.status(200).json({ success: true, points: data.points || 0 });
        }

        return res.status(400).json({ error: `알 수 없는 action: ${action}` });
    } catch (error) {
        console.error("Ground API Error:", error);
        return res.status(200).json({ success: false, error: error.message });
    }
}
