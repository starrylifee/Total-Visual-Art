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
 *  { action: "feldman",  firstText, secondText, rubric }            -> { level, reason }     (모듈1 초벌 판정, 교사 전용)
 *  { action: "compare",  queueId }                                  -> { differences, praise } (모듈2 원본 vs 생성 비교, 학생 토큰)
 */
import { GoogleGenAI } from "@google/genai";
import { authenticateRequest, adminDb } from "./_lib.js";

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

            // 모듈 2: 원본 명화 vs 학생 생성 이미지 비교 — "다른 점 2가지" 코멘트
            // 이미지 주소를 클라이언트에서 받지 않고, 세션의 원본과 본인 큐 문서에서 서버가 직접 읽는다 (위조·SSRF 차단)
            case "compare": {
                if (requester.role !== "student") {
                    return res.status(403).json({ error: "학생 활동 화면에서 사용할 수 있어요." });
                }
                const queueId = String(body.queueId || "");
                if (!queueId) return res.status(400).json({ error: "queueId가 필요합니다." });

                const db = adminDb();
                const { classId, sessionId, studentNo } = requester;
                const [sessionSnap, queueSnap] = await Promise.all([
                    db.doc(`classes/${classId}/sessions/${sessionId}`).get(),
                    db.doc(`classes/${classId}/sessions/${sessionId}/generationQueue/${queueId}`).get(),
                ]);
                const referenceImageUrl = sessionSnap.exists ? sessionSnap.data().referenceImageUrl : null;
                if (!referenceImageUrl) return res.status(400).json({ error: "이 활동에 원본 작품이 설정되지 않았어요." });
                if (!queueSnap.exists || queueSnap.data().studentId !== `sno_${studentNo}`) {
                    return res.status(404).json({ error: "내 작품을 찾을 수 없어요." });
                }
                const generated = queueSnap.data().imageUrl;
                if (!generated || queueSnap.data().status !== "published") {
                    return res.status(400).json({ error: "아직 공개된 작품이 없어요. 선생님 승인을 기다려 주세요." });
                }

                // 원본 다운로드 (축소판이면 그대로, 아니면 원본) → base64
                const origResp = await fetch(referenceImageUrl);
                if (!origResp.ok) return res.status(502).json({ error: "원본 작품 이미지를 불러오지 못했어요." });
                const origMime = origResp.headers.get("content-type") || "image/jpeg";
                const origB64 = Buffer.from(await origResp.arrayBuffer()).toString("base64");

                // 생성본: dataURL 또는 원격 URL
                let genB64, genMime;
                const m = /^data:([^;]+);base64,(.+)$/.exec(generated);
                if (m) {
                    genMime = m[1]; genB64 = m[2];
                } else {
                    const genResp = await fetch(generated);
                    if (!genResp.ok) return res.status(502).json({ error: "내 작품 이미지를 불러오지 못했어요." });
                    genMime = genResp.headers.get("content-type") || "image/png";
                    genB64 = Buffer.from(await genResp.arrayBuffer()).toString("base64");
                }

                const response = await ai.models.generateContent({
                    model: TEXT_MODEL,
                    contents: [{
                        role: "user",
                        parts: [
                            { text: "첫 번째 이미지는 원본 명화, 두 번째 이미지는 초등학생이 관찰 글로 AI에게 설명해서 만든 그림입니다." },
                            { inlineData: { data: origB64, mimeType: origMime } },
                            { inlineData: { data: genB64, mimeType: genMime } },
                            {
                                text: `두 그림을 비교해서 초등학생에게 알려 주세요.
- differences: 원본과 다른 점을 정확히 2가지. 학생이 다음 도전에서 관찰 글에 추가하면 좋을 구체적 단서(색, 위치, 모양, 빠진 대상)를 짚어 주세요. 각 한 문장.
- praise: 원본과 닮게 표현된 점 1가지를 칭찬. 한 문장.
쉬운 한국어로, JSON으로만 답하세요: {"differences": ["...", "..."], "praise": "..."}`,
                            },
                        ],
                    }],
                    config: { responseMimeType: "application/json" },
                });
                try {
                    const parsed = JSON.parse(response.text);
                    const differences = (parsed.differences || []).map((d) => String(d).slice(0, 300)).slice(0, 2);
                    if (!differences.length) throw new Error("empty");
                    return res.status(200).json({ differences, praise: String(parsed.praise || "").slice(0, 300) });
                } catch {
                    return res.status(500).json({ error: "비교 결과를 만들지 못했어요. 다시 시도해 주세요." });
                }
            }

            // 모듈 1: 펠드만 단계 초벌 판정 (교사 전용 — 교사가 최종 확정)
            case "feldman": {
                if (requester.role !== "teacher") {
                    return res.status(403).json({ error: "판정은 선생님만 실행할 수 있어요." });
                }
                const { firstText, secondText, rubric } = body;
                if (!firstText && !secondText) {
                    return res.status(400).json({ error: "판정할 감상 글이 없습니다." });
                }
                const rubricText = Array.isArray(rubric) && rubric.length
                    ? rubric.map((r, i) => `${i + 1}. ${r}`).join("\n") : "(루브릭 없음)";
                const prompt = `당신은 초등 미술 감상 평가를 돕는 보조 채점자입니다.
학생의 감상문이 펠드만(Feldman) 감상 4단계 중 어느 단계까지 도달했는지 판정하세요.

[펠드만 4단계]
1 서술: 작품에서 보이는 것(색, 선, 모양, 인물, 소재)을 말한다.
2 분석: 조형 요소들이 어떻게 어울리고 배치됐는지(대비, 균형, 강조 등) 말한다.
3 해석: 작품의 의미, 분위기, 작가의 의도를 자기 생각으로 풀이한다.
4 판단: 작품에 대한 자기 평가와 그 근거를 말한다.

[우리 반 루브릭]
${rubricText}

[학생의 1차 감상]
"${String(firstText || "").slice(0, 3000)}"

[학생의 2차 감상]
"${String(secondText || "").slice(0, 3000)}"

[판정 규칙]
- 1차와 2차를 합쳐서, 근거가 분명하게 나타난 가장 높은 단계를 고르세요.
- 단계를 스치듯 언급한 것만으로는 도달로 보지 않습니다. 초등학생 수준에서 판단하세요.
- reason은 학생 글을 인용한 한두 문장의 한국어로, 교사가 확정할 때 참고할 근거를 쓰세요.

JSON으로만 답하세요: {"level": 1~4의 정수, "reason": "판정 근거"}`;

                const response = await ai.models.generateContent({
                    model: TEXT_MODEL,
                    contents: prompt,
                    config: { responseMimeType: "application/json" },
                });
                try {
                    const parsed = JSON.parse(response.text);
                    const level = Math.min(4, Math.max(1, parseInt(parsed.level, 10) || 1));
                    return res.status(200).json({ level, reason: String(parsed.reason || "").slice(0, 500) });
                } catch {
                    return res.status(500).json({ error: "판정 결과를 해석하지 못했어요. 다시 시도해 주세요." });
                }
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
