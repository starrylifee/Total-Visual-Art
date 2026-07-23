/**
 * Gemini AI 프록시 (Vercel Serverless Function)
 * API 키를 서버에만 두고, 클라이언트는 이 엔드포인트만 호출한다.
 *
 * POST /api/ai
 *  { action: "analyze", image: { data, mimeType }, prompt }        -> { text }
 *  { action: "refine",  text, systemPrompt }                        -> { text }
 *  { action: "chat",    history, message, systemInstruction }       -> { text }
 *  { action: "image",   prompt }                                    -> { success, imageDataUrl | error }
 *  { action: "scaffold", firstText, rubric, masterpiece }           -> { questions: [...] }  (모듈1 감상 비계)
 */
import { GoogleGenAI } from "@google/genai";
import { authenticateRequest } from "./_lib.js";

const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "POST만 허용됩니다." });
    }

    // 학생 토큰 또는 교사 로그인 필수 (무단 호출로 API 한도가 소모되는 것 방지)
    const requester = await authenticateRequest(req);
    if (!requester) {
        return res.status(401).json({ error: "인증이 필요합니다. 다시 입장(로그인)해 주세요." });
    }
    // 이미지 생성은 교사만 (승인 큐를 거쳐 교사 화면에서 실행됨)
    if (req.body?.action === "image" && requester.role !== "teacher") {
        return res.status(403).json({ error: "이미지 생성은 선생님만 실행할 수 있어요." });
    }

    // BOM·공백 제거 (환경변수 등록 과정에서 섞일 수 있음)
    const apiKey = (process.env.GEMINI_API_KEY || "").replace(/^\uFEFF/, "").trim();
    if (!apiKey) {
        return res.status(500).json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았습니다." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const body = req.body || {};

    try {
        switch (body.action) {
            case "analyze": {
                const { image, prompt } = body;
                if (!image?.data || !image?.mimeType) {
                    return res.status(400).json({ error: "image(data, mimeType)가 필요합니다." });
                }
                const response = await ai.models.generateContent({
                    model: TEXT_MODEL,
                    contents: [{
                        role: "user",
                        parts: [
                            { text: prompt || "이 미술 작품의 조형 요소와 원리를 분석해 주세요." },
                            { inlineData: { data: image.data, mimeType: image.mimeType } },
                        ],
                    }],
                });
                return res.status(200).json({ text: response.text });
            }

            case "refine": {
                const { text, systemPrompt } = body;
                if (!text) return res.status(400).json({ error: "text가 필요합니다." });
                const response = await ai.models.generateContent({
                    model: TEXT_MODEL,
                    contents: `System Instruction: ${systemPrompt || "Help the student express their feelings about art better."}\n\nStudent Input: "${text}"\n\nResponse:`,
                });
                return res.status(200).json({ text: response.text });
            }

            case "chat": {
                const { history, message, systemInstruction } = body;
                if (!message) return res.status(400).json({ error: "message가 필요합니다." });
                const contents = [
                    ...(Array.isArray(history) ? history : []),
                    { role: "user", parts: [{ text: message }] },
                ];
                const response = await ai.models.generateContent({
                    model: TEXT_MODEL,
                    contents,
                    config: {
                        systemInstruction: systemInstruction || undefined,
                        maxOutputTokens: 500,
                    },
                });
                return res.status(200).json({ text: response.text });
            }

            // 모듈 1: 루브릭 + 작품 정보 + 1차 감상을 근거로 2차 감상을 이끄는 비계 질문 생성
            case "scaffold": {
                const { firstText, rubric, masterpiece } = body;
                if (!firstText || String(firstText).trim().length < 5) {
                    return res.status(400).json({ error: "1차 감상을 먼저 조금 더 적어 주세요." });
                }
                const rubricText = Array.isArray(rubric) && rubric.length
                    ? rubric.map((r, i) => `${i + 1}. ${r}`).join("\n")
                    : "1. 작품에서 본 것을 자세히 말했나요?\n2. 작품의 의미를 나만의 생각으로 해석했나요?";
                const artText = masterpiece
                    ? `작품: ${masterpiece.title} (${masterpiece.artist})\n조형 요소: ${masterpiece.formalElements || ""}\n감상 포인트: ${(masterpiece.appreciationPoints || []).join(" / ")}`
                    : "작품 정보 없음 (학급에서 정한 작품)";

                const prompt = `당신은 초등학교 미술 감상 수업을 돕는 선생님입니다.
학생이 쓴 1차 감상을 읽고, 학생이 2차 감상에서 더 깊게 생각하도록 돕는 질문을 만드세요.

[감상 작품 정보]
${artText}

[우리 반 감상 약속(루브릭)]
${rubricText}

[학생의 1차 감상]
"${String(firstText).slice(0, 2000)}"

[질문 만들기 규칙]
- 정확히 3개의 질문을 만드세요.
- 학생의 1차 감상에서 "이미 잘한 부분"을 짚은 뒤, 루브릭 중 "아직 부족한 부분"을 채우도록 이끄는 질문일 것.
- 학생이 쓴 표현을 직접 인용하며 물어볼 것 (예: "'하늘이 무섭다'고 했는데, 어떤 색 때문에 그렇게 느꼈나요?").
- 초등학생이 이해할 수 있는 쉬운 말, 한 문장, 물음표로 끝낼 것.
- 정답을 알려주지 말고 생각을 여는 질문만 할 것.

JSON 배열로만 답하세요. 예: ["질문1?", "질문2?", "질문3?"]`;

                const response = await ai.models.generateContent({
                    model: TEXT_MODEL,
                    contents: prompt,
                    config: { responseMimeType: "application/json" },
                });
                let questions = [];
                try {
                    const parsed = JSON.parse(response.text);
                    questions = (Array.isArray(parsed) ? parsed : parsed.questions || [])
                        .map((q) => String(q).trim()).filter(Boolean).slice(0, 3);
                } catch {
                    // JSON 실패 시 줄 단위 fallback
                    questions = String(response.text || "").split("\n")
                        .map((l) => l.replace(/^[\s\-*\d."]+/, "").trim())
                        .filter((l) => l.includes("?")).slice(0, 3);
                }
                if (!questions.length) {
                    return res.status(500).json({ error: "질문 생성에 실패했어요. 다시 시도해 주세요." });
                }
                return res.status(200).json({ questions });
            }

            case "image": {
                const { prompt } = body;
                if (!prompt) return res.status(400).json({ error: "prompt가 필요합니다." });
                const response = await ai.models.generateContent({
                    model: IMAGE_MODEL,
                    contents: prompt,
                    config: { responseModalities: ["TEXT", "IMAGE"] },
                });
                const parts = response.candidates?.[0]?.content?.parts || [];
                for (const part of parts) {
                    if (part.inlineData?.data) {
                        const mimeType = part.inlineData.mimeType || "image/png";
                        return res.status(200).json({
                            success: true,
                            imageDataUrl: `data:${mimeType};base64,${part.inlineData.data}`,
                        });
                    }
                }
                return res.status(200).json({ success: false, error: "이미지 생성 응답에서 이미지를 찾을 수 없습니다." });
            }

            default:
                return res.status(400).json({ error: `알 수 없는 action: ${body.action}` });
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        return res.status(500).json({ error: error.message || "AI 호출 중 오류가 발생했습니다." });
    }
}
