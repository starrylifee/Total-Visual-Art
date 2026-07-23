/**
 * AI 이미지 생성 서비스 (클라이언트)
 * 실제 생성은 서버(/api/ai)에서 수행 — API 키는 클라이언트에 존재하지 않는다.
 */
import { authHeaders } from "./apiAuth";

/**
 * Generate an image from a text prompt
 * @param {string} prompt - The text description for the image
 * @returns {Promise<{success: boolean, imageDataUrl?: string, error?: string}>}
 */
export async function generateImage(prompt) {
    try {
        console.log("🎨 AI 이미지 생성 요청:", prompt);

        const response = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await authHeaders()) },
            body: JSON.stringify({ action: "image", prompt }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return { success: false, error: data.error || `AI 서버 오류 (${response.status})` };
        }
        if (data.success && data.imageDataUrl) {
            console.log("✅ 이미지 생성 완료!");
            return { success: true, imageDataUrl: data.imageDataUrl };
        }
        return { success: false, error: data.error || "이미지 생성에 실패했습니다." };
    } catch (error) {
        console.error("❌ AI 이미지 생성 오류:", error);
        return {
            success: false,
            error: error.message || "이미지 생성 중 오류가 발생했습니다."
        };
    }
}

/**
 * Generate image and return the data URL directly (no Firebase Storage upload)
 * The data URL can be stored directly in Firestore (for small images)
 */
export async function generateAndUploadImage(prompt, classId, sessionId, genId) {
    const result = await generateImage(prompt);

    if (!result.success) {
        return result;
    }

    // Firestore 문서 1MB 한계 대비 — 저장 전 압축 (1024px JPEG)
    const compressed = await compressDataUrl(result.imageDataUrl);
    return { success: true, imageUrl: compressed };
}

const MAX_DIMENSION = 1024;

/**
 * data URL 이미지를 최대 1024px JPEG로 압축
 */
async function compressDataUrl(dataUrl) {
    try {
        const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = dataUrl;
        });

        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        // PNG 투명 배경이 검게 변하지 않도록 흰 배경 깔기
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        return canvas.toDataURL("image/jpeg", 0.85);
    } catch (error) {
        console.warn("이미지 압축 실패 — 원본 사용:", error);
        return dataUrl;
    }
}

export default {
    generateImage,
    generateAndUploadImage
};
