/**
 * Gemini 2.5 Flash Image Generation Service
 * Uses the new @google/genai package for image generation
 * 
 * NOTE: This model generates images from text prompts using Gemini 2.5 Flash
 */

import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

let genAI = null;

function getGenAI() {
    if (!genAI && apiKey) {
        genAI = new GoogleGenAI({ apiKey });
    }
    return genAI;
}

/**
 * Generate an image from a text prompt using Gemini 2.5 Flash
 * @param {string} prompt - The text description for the image
 * @returns {Promise<{success: boolean, imageDataUrl?: string, error?: string}>}
 */
export async function generateImage(prompt) {
    try {
        const ai = getGenAI();
        if (!ai) {
            return { success: false, error: 'Gemini API 키가 설정되지 않았습니다.' };
        }

        console.log("🎨 Gemini 이미지 생성 시작:", prompt);

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp-image-generation",
            contents: prompt,
            config: {
                responseModalities: ["Text", "Image"]
            }
        });

        // Extract image from response
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    // Convert base64 to data URL for browser display
                    const mimeType = part.inlineData.mimeType || 'image/png';
                    const base64Data = part.inlineData.data;
                    const imageDataUrl = `data:${mimeType};base64,${base64Data}`;

                    console.log("✅ 이미지 생성 완료!");
                    return { success: true, imageDataUrl };
                }
            }
        }

        return { success: false, error: '이미지 생성 응답에서 이미지를 찾을 수 없습니다.' };
    } catch (error) {
        console.error("❌ Gemini 이미지 생성 오류:", error);
        return {
            success: false,
            error: error.message || '이미지 생성 중 오류가 발생했습니다.'
        };
    }
}

/**
 * Generate image and return the data URL directly (no Firebase Storage upload)
 * The data URL can be stored directly in Firestore (for small images)
 * @param {string} prompt 
 * @param {string} classId 
 * @param {string} sessionId 
 * @param {string} genId 
 */
export async function generateAndUploadImage(prompt, classId, sessionId, genId) {
    const result = await generateImage(prompt);

    if (!result.success) {
        return result;
    }

    // Return the data URL directly - no Firebase Storage needed
    // Note: Data URLs can be stored in Firestore for small images
    // For production, consider using Firebase Storage with proper CORS config
    return { success: true, imageUrl: result.imageDataUrl };
}

export default {
    generateImage,
    generateAndUploadImage
};
