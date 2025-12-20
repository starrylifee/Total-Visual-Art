import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
// Note: In production, it's better to proxy this through backend, 
// but for prototype/MVP, we can use client-side with awareness of key exposure risk or restricted keys.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_API_KEY_HERE";
const genAI = new GoogleGenerativeAI(apiKey);

export const geminiService = {
    // Vision Analysis
    analyzeImage: async (imageFile, systemPrompt) => {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            // Convert file to base64
            const base64Data = await fileToGenerativePart(imageFile);

            const prompt = systemPrompt || "Analyze this artwork's elements and principles.";
            const result = await model.generateContent([prompt, base64Data]);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini Vision Error:", error);
            throw error;
        }
    },

    // Text Refinement / Expression Helper
    refineText: async (userText, systemPrompt) => {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `
        System Instruction: ${systemPrompt || "Help the student express their feelings about art better."}
        
        Student Input: "${userText}"
        
        Response:
      `;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini Text Error:", error);
            throw error;
        }
    },

    // Chatbot (Multi-turn - Simplified as single turn with context for now)
    chatWithPersona: async (history, message, systemInstruction) => {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const chat = model.startChat({
                history: history, // [{role: "user" | "model", parts: [{text: ...}]}]
                generationConfig: {
                    maxOutputTokens: 500,
                },
                systemInstruction: { role: "system", parts: [{ text: systemInstruction }] }
            });

            const result = await chat.sendMessage(message);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini Chat Error:", error);
            throw error;
        }
    }
};

async function fileToGenerativePart(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            resolve({
                inlineData: {
                    data: base64String,
                    mimeType: file.type
                },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
