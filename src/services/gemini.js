/**
 * Gemini AI 서비스 (클라이언트)
 * 실제 AI 호출은 서버(/api/ai)에서 수행 — API 키는 클라이언트에 존재하지 않는다.
 */

import { authHeaders } from "./apiAuth";

async function callAI(payload) {
    const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || `AI 서버 오류 (${response.status})`);
    }
    return data;
}

export const geminiService = {
    // Vision Analysis
    analyzeImage: async (imageFile, systemPrompt) => {
        try {
            const image = await fileToResizedBase64(imageFile);
            const data = await callAI({ action: "analyze", image, prompt: systemPrompt });
            return data.text;
        } catch (error) {
            console.error("Gemini Vision Error:", error);
            throw error;
        }
    },

    // Text Refinement / Expression Helper
    refineText: async (userText, systemPrompt) => {
        try {
            const data = await callAI({ action: "refine", text: userText, systemPrompt });
            return data.text;
        } catch (error) {
            console.error("Gemini Text Error:", error);
            throw error;
        }
    },

    // Chatbot (Multi-turn)
    chatWithPersona: async (history, message, systemInstruction) => {
        try {
            const data = await callAI({ action: "chat", history, message, systemInstruction });
            return data.text;
        } catch (error) {
            console.error("Gemini Chat Error:", error);
            throw error;
        }
    }
};

/**
 * 이미지 파일을 최대 1024px로 축소한 base64로 변환
 * (서버 요청 용량 제한 + Firestore 1MB 문서 한계 대비)
 */
const MAX_DIMENSION = 1024;

async function fileToResizedBase64(file) {
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = dataUrl;
    });

    let { width, height } = img;
    if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        // 축소 불필요 — 원본 그대로 전송
        return { data: dataUrl.split(",")[1], mimeType: file.type };
    }

    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);

    const resizedUrl = canvas.toDataURL("image/jpeg", 0.85);
    return { data: resizedUrl.split(",")[1], mimeType: "image/jpeg" };
}
