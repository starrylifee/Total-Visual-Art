/**
 * Gemini AI 프록시 (Vercel Serverless Function)
 * API 키를 서버에만 두고, 클라이언트는 이 엔드포인트만 호출한다.
 *
 * POST /api/ai
 *  { action: "analyze", image: { data, mimeType }, prompt }        -> { text }
 *  { action: "refine",  text, systemPrompt }                        -> { text }
 *  { action: "chat",    history, message, systemInstruction }       -> { text }
 *  { action: "image",   prompt }                                    -> { success, imageDataUrl | error }
 */
import { GoogleGenAI } from "@google/genai";

const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "POST만 허용됩니다." });
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
