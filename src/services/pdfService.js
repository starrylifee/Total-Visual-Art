import jsPDF from 'jspdf';

const mmToPx = (mm, scale = 2) => Math.ceil((mm / 25.4) * 96 * scale);

const wrapCanvasText = (context, text, maxWidth) => {
    const rawLines = String(text || '').split('\n');
    const lines = [];

    rawLines.forEach((rawLine) => {
        if (!rawLine) {
            lines.push(' ');
            return;
        }

        if (rawLine.includes(' ')) {
            const words = rawLine.split(/\s+/);
            let currentLine = '';

            words.forEach((word) => {
                const nextLine = currentLine ? `${currentLine} ${word}` : word;

                if (context.measureText(nextLine).width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = nextLine;
                }
            });

            lines.push(currentLine || ' ');
            return;
        }

        let currentLine = '';
        Array.from(rawLine).forEach((char) => {
            const nextLine = currentLine + char;

            if (context.measureText(nextLine).width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = char;
            } else {
                currentLine = nextLine;
            }
        });

        lines.push(currentLine || ' ');
    });

    return lines.length > 0 ? lines : [' '];
};

const createTextImage = (text, options = {}) => {
    const {
        widthMm = 180,
        fontSize = 14,
        fontWeight = 'normal',
        color = '#000000',
        align = 'left',
        paddingPx = 24,
        scale = 2
    } = options;

    const widthPx = mmToPx(widthMm, scale);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontFamily = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
    const scaledFontSize = fontSize * scale;

    context.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;
    const lineHeight = Math.round(scaledFontSize * 1.45);
    const lines = wrapCanvasText(context, text, widthPx - paddingPx * 2);

    canvas.width = widthPx;
    canvas.height = paddingPx * 2 + lineHeight * lines.length;

    const drawContext = canvas.getContext('2d');
    drawContext.clearRect(0, 0, canvas.width, canvas.height);
    drawContext.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;
    drawContext.fillStyle = color;
    drawContext.textBaseline = 'top';

    lines.forEach((line, index) => {
        const lineWidth = drawContext.measureText(line).width;
        let x = paddingPx;

        if (align === 'center') {
            x = (canvas.width - lineWidth) / 2;
        } else if (align === 'right') {
            x = canvas.width - paddingPx - lineWidth;
        }

        drawContext.fillText(line, x, paddingPx + index * lineHeight);
    });

    return {
        dataUrl: canvas.toDataURL('image/png'),
        widthMm,
        heightMm: (canvas.height / canvas.width) * widthMm
    };
};

const addTextImage = (pdf, text, x, y, options = {}) => {
    const image = createTextImage(text, options);
    const align = options.align || 'left';
    const renderX = align === 'center' ? x - image.widthMm / 2 : align === 'right' ? x - image.widthMm : x;

    pdf.addImage(image.dataUrl, 'PNG', renderX, y, image.widthMm, image.heightMm);
    return image.heightMm;
};

const loadImageData = (url) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;

            const context = canvas.getContext('2d');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0);

            resolve({
                dataUrl: canvas.toDataURL('image/jpeg', 0.92),
                format: 'JPEG'
            });
        } catch (error) {
            console.error('Error converting image:', error);
            resolve(null);
        }
    };

    img.onerror = () => resolve(null);
    img.src = url;
});

/**
 * Generate a portfolio PDF for student artworks
 * @param {Object} studentInfo - { displayName, email }
 * @param {Array} artworks - Array of artwork objects { imageUrl, prompt, createdAt }
 * @param {Array} badges - Array of badge objects { name, iconUrl }
 */
export async function generatePortfolioPDF(studentInfo, artworks, badges = []) {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    const addImageFromUrl = async (url, x, y, width, height) => {
        const image = await loadImageData(url);
        if (!image) return false;

        pdf.addImage(image.dataUrl, image.format, x, y, width, height);
        return true;
    };

    pdf.setFillColor(253, 242, 248);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    yPos = 68;
    yPos += addTextImage(pdf, '나의 미술 포트폴리오', pageWidth / 2, yPos, {
        widthMm: 150,
        fontSize: 20,
        fontWeight: '700',
        color: '#4a044e',
        align: 'center'
    });
    yPos += 8;
    yPos += addTextImage(pdf, studentInfo.displayName || '학생', pageWidth / 2, yPos, {
        widthMm: 100,
        fontSize: 15,
        color: '#4a044e',
        align: 'center'
    });
    yPos += 6;
    yPos += addTextImage(pdf, `총 ${artworks.length}개의 작품`, pageWidth / 2, yPos, {
        widthMm: 100,
        fontSize: 11,
        color: '#831843',
        align: 'center'
    });
    yPos += 3;
    yPos += addTextImage(pdf, `생성일 ${new Date().toLocaleDateString('ko-KR')}`, pageWidth / 2, yPos, {
        widthMm: 110,
        fontSize: 10,
        color: '#831843',
        align: 'center'
    });

    if (badges.length > 0) {
        const badgeNames = badges.map((badge) => badge.name).join(', ');
        yPos += 10;
        yPos += addTextImage(pdf, `획득한 배지 ${badges.length}개`, pageWidth / 2, yPos, {
            widthMm: 110,
            fontSize: 11,
            fontWeight: '700',
            color: '#4a044e',
            align: 'center'
        });
        addTextImage(pdf, badgeNames, pageWidth / 2, yPos + 2, {
            widthMm: 150,
            fontSize: 9,
            color: '#6b7280',
            align: 'center'
        });
    }

    if (artworks.length > 0) {
        pdf.addPage();
        yPos = margin;
        yPos += addTextImage(pdf, '작품 목록', margin, yPos - 4, {
            widthMm: 60,
            fontSize: 14,
            fontWeight: '700',
            color: '#4a044e'
        });
        yPos += 6;

        for (let i = 0; i < artworks.length; i += 1) {
            const art = artworks[i];

            if (yPos > pageHeight - 100) {
                pdf.addPage();
                yPos = margin;
            }

            pdf.setDrawColor(244, 114, 182);
            pdf.setLineWidth(0.5);
            pdf.roundedRect(margin, yPos, pageWidth - margin * 2, 85, 3, 3);

            addTextImage(pdf, `작품 #${i + 1}`, margin + 2, yPos + 2, {
                widthMm: 34,
                fontSize: 8.5,
                fontWeight: '700',
                color: '#4a044e'
            });

            let imageAdded = false;
            if (art.imageUrl) {
                try {
                    imageAdded = await addImageFromUrl(art.imageUrl, margin + 5, yPos + 12, 50, 50);
                } catch (error) {
                    console.error('Error adding artwork image:', error);
                }
            }

            if (!imageAdded) {
                addTextImage(pdf, '이미지를 불러올 수 없습니다.', margin + 4, yPos + 30, {
                    widthMm: 50,
                    fontSize: 7.5,
                    color: '#6b7280'
                });
            }

            addTextImage(pdf, art.prompt || '프롬프트 없음', margin + 58, yPos + 12, {
                widthMm: pageWidth - margin * 2 - 62,
                fontSize: 8,
                color: '#111827'
            });

            const dateStr = art.createdAt?.toDate?.()?.toLocaleDateString('ko-KR') || '';
            if (dateStr) {
                addTextImage(pdf, dateStr, margin + 58, yPos + 64, {
                    widthMm: 45,
                    fontSize: 7,
                    color: '#6b7280'
                });
            }

            yPos += 90;
        }
    }

    addTextImage(pdf, '2025 대실초등학교 방과후 Total Visual Art Class', pageWidth / 2, pageHeight - 14, {
        widthMm: 150,
        fontSize: 6.5,
        color: '#9ca3af',
        align: 'center'
    });

    const fileName = `${studentInfo.displayName || 'student'}_portfolio_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(fileName);

    return fileName;
}

// ---------- 봄·봄·봄 세션 포트폴리오 (모듈 산출물 통합) ----------

const FELDMAN_LABELS = { 1: '서술', 2: '분석', 3: '해석', 4: '판단' };

// 페이지 넘김을 관리하며 텍스트를 흘려 쓰는 헬퍼
const makeFlow = (pdf, margin) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const state = { y: margin };

    const ensure = (needed) => {
        if (state.y + needed > pageHeight - margin) {
            pdf.addPage();
            state.y = margin;
        }
    };

    const text = (str, opts = {}) => {
        if (!str) return;
        const image = createTextImage(str, { widthMm: pageWidth - margin * 2, ...opts });
        ensure(image.heightMm);
        pdf.addImage(image.dataUrl, 'PNG', margin, state.y, image.widthMm, image.heightMm);
        state.y += image.heightMm;
    };

    const heading = (str) => {
        ensure(24);
        state.y += 4;
        pdf.setDrawColor(30, 41, 59);
        pdf.setLineWidth(0.6);
        pdf.line(margin, state.y, pageWidth - margin, state.y);
        state.y += 2;
        text(str, { fontSize: 13, fontWeight: '700', color: '#1e293b', paddingPx: 12 });
    };

    const image = async (url, widthMm = 70) => {
        if (!url) return false;
        const data = await loadImageData(url);
        if (!data) return false;
        // 원본 비율 유지를 위해 임시 이미지 크기 측정
        const dims = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
            img.onerror = () => resolve({ w: 1, h: 1 });
            img.src = data.dataUrl;
        });
        const heightMm = widthMm * (dims.h / dims.w);
        ensure(heightMm + 4);
        pdf.addImage(data.dataUrl, data.format, margin, state.y, widthMm, heightMm);
        state.y += heightMm + 4;
        return true;
    };

    const gap = (mm = 3) => { state.y += mm; };

    return { text, heading, image, gap, state };
};

/**
 * 학생 1명의 세션 산출물 전체를 PDF로 저장
 * @param {Object} meta - { classNam: 학급명, sessionTitle, studentNo }
 * @param {Object} s - portfolioService.loadSessionOutputs()의 students 항목
 */
export async function generateSessionPortfolioPDF(meta, s) {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const flow = makeFlow(pdf, margin);

    // 표지 머리글
    flow.text('봄·봄·봄 활동 포트폴리오', { fontSize: 19, fontWeight: '700', color: '#1e293b' });
    flow.text(`${meta.sessionTitle || '활동'}  ·  ${meta.className || ''}  ·  ${meta.studentNo}번`, {
        fontSize: 12, color: '#475569'
    });
    flow.text(`만든 날짜: ${new Date().toLocaleDateString('ko-KR')}`, { fontSize: 9, color: '#94a3b8' });
    flow.gap(2);

    // 1. 명화 감상 (모듈 1)
    if (s.deep && (s.deep.firstText || s.deep.secondText)) {
        flow.heading('🖼️ 명화 감상 (1·2차)');
        if (s.deep.firstText) {
            flow.text('1차 감상', { fontSize: 10.5, fontWeight: '700', color: '#334155' });
            flow.text(s.deep.firstText, { fontSize: 10, color: '#111827' });
        }
        if (Array.isArray(s.deep.questions) && s.deep.questions.length > 0) {
            flow.text('AI 선생님의 질문', { fontSize: 10.5, fontWeight: '700', color: '#334155' });
            flow.text(s.deep.questions.map((q, i) => `${i + 1}. ${q}`).join('\n'), { fontSize: 9.5, color: '#475569' });
        }
        if (s.deep.secondText) {
            flow.text('2차 감상', { fontSize: 10.5, fontWeight: '700', color: '#334155' });
            flow.text(s.deep.secondText, { fontSize: 10, color: '#111827' });
        }
        const level = s.deep.teacherLevel || s.deep.aiLevel;
        if (level) {
            flow.text(
                `펠드만 감상 단계: ${level}단계 (${FELDMAN_LABELS[level] || ''})${s.deep.teacherLevel ? ' — 선생님 확정' : ' — AI 초벌'}`,
                { fontSize: 9.5, fontWeight: '700', color: '#0f766e' }
            );
        }
    }

    // 2. 복원 챌린지 (모듈 2)
    const r = s.restore;
    if (r && (r.observation1 || r.observation2 || r.reflection)) {
        flow.heading('🧩 복원 챌린지');
        if (r.observation1) {
            flow.text('1차 관찰', { fontSize: 10.5, fontWeight: '700', color: '#334155' });
            flow.text(r.observation1, { fontSize: 10, color: '#111827' });
        }
        if (r.image1) await flow.image(r.image1, 60);
        if (Array.isArray(r.diff1) && r.diff1.length > 0) {
            flow.text('AI가 찾은 다른 점', { fontSize: 10.5, fontWeight: '700', color: '#334155' });
            flow.text(r.diff1.map((d, i) => `${i + 1}. ${d}`).join('\n'), { fontSize: 9.5, color: '#475569' });
        }
        if (r.observation2) {
            flow.text('2차 관찰 (보완)', { fontSize: 10.5, fontWeight: '700', color: '#334155' });
            flow.text(r.observation2, { fontSize: 10, color: '#111827' });
        }
        if (r.image2) await flow.image(r.image2, 60);
        if (r.reflection) {
            flow.text('성찰', { fontSize: 10.5, fontWeight: '700', color: '#334155' });
            flow.text(r.reflection, { fontSize: 10, color: '#111827' });
        }
    }

    // 3. AI 생성 작품 (승인 큐에서 공개된 것)
    if (Array.isArray(s.artworks) && s.artworks.length > 0) {
        flow.heading(`🎨 AI 그림 작품 (${s.artworks.length}점)`);
        for (const art of s.artworks) {
            if (art.prompt) flow.text(`“${art.prompt}”`, { fontSize: 9.5, color: '#475569' });
            if (art.imageUrl) await flow.image(art.imageUrl, 60);
        }
    }

    // 4. 인물의 하루 (모듈 3)
    const p = s.portrait;
    if (p && (p.prompt || p.feelings)) {
        flow.heading('🎬 인물의 하루 — 영상 프롬프트');
        const obs = [
            p.feelings ? `감정: ${p.feelings}` : '',
            p.situation ? `상황: ${p.situation}` : '',
            p.clothes ? `의상: ${p.clothes}` : '',
        ].filter(Boolean).join('\n');
        if (obs) flow.text(obs, { fontSize: 10, color: '#111827' });
        if (p.prompt) {
            flow.text('영상 프롬프트', { fontSize: 10.5, fontWeight: '700', color: '#334155' });
            flow.text(p.prompt, { fontSize: 10, color: '#111827' });
        }
        if (p.videoUrl) flow.text(`완성 영상: ${p.videoUrl}`, { fontSize: 9, color: '#2563eb' });
    }

    // 5. 스토리보드 (모듈 4)
    const sb = s.storyboard;
    if (sb && (sb.prompt || (sb.cuts || []).length > 0)) {
        flow.heading('🎞️ 캐릭터 스토리보드');
        if (sb.appreciation) {
            flow.text('친구 작품 감상', { fontSize: 10.5, fontWeight: '700', color: '#334155' });
            flow.text(sb.appreciation, { fontSize: 10, color: '#111827' });
        }
        if (Array.isArray(sb.cuts) && sb.cuts.length > 0) {
            flow.text('장면 구성', { fontSize: 10.5, fontWeight: '700', color: '#334155' });
            flow.text(sb.cuts.map((c, i) => `${i + 1}컷. ${c}`).join('\n'), { fontSize: 10, color: '#111827' });
        }
        if (sb.prompt) {
            flow.text('영상 프롬프트', { fontSize: 10.5, fontWeight: '700', color: '#334155' });
            flow.text(sb.prompt, { fontSize: 10, color: '#111827' });
        }
        if (sb.videoUrl) flow.text(`완성 영상: ${sb.videoUrl}`, { fontSize: 9, color: '#2563eb' });
    }

    // 6. 내 작품 평가 (모듈 5)
    const ar = s.artReview;
    if (ar && (ar.imageDataUrl || ar.pledge)) {
        flow.heading('🖌️ 내 작품 평가와 성장 다짐');
        if (ar.imageDataUrl) await flow.image(ar.imageDataUrl, 70);
        if (ar.aiReview?.items?.length) {
            flow.text('루브릭 피드백 (AI 초벌)', { fontSize: 10.5, fontWeight: '700', color: '#334155' });
            flow.text(
                ar.aiReview.items.map(it => `${it.met ? '◯' : '△'} ${it.criterion} — ${it.comment}`).join('\n'),
                { fontSize: 9.5, color: '#475569' }
            );
        }
        if (ar.teacherComment) {
            flow.text('선생님 한마디', { fontSize: 10.5, fontWeight: '700', color: '#334155' });
            flow.text(ar.teacherComment, { fontSize: 10, color: '#111827' });
        }
        if (ar.pledge) {
            flow.text('나의 성장 다짐', { fontSize: 10.5, fontWeight: '700', color: '#0f766e' });
            flow.text(ar.pledge, { fontSize: 10, color: '#111827' });
        }
    }

    // 바닥글 (마지막 페이지)
    addTextImage(pdf, '인공지능 융합 봄·봄·봄 프로그램 · Total Visual Art', pageWidth / 2, pdf.internal.pageSize.getHeight() - 12, {
        widthMm: 150, fontSize: 7, color: '#94a3b8', align: 'center'
    });

    const fileName = `포트폴리오_${meta.sessionTitle || '활동'}_${meta.studentNo}번.pdf`;
    pdf.save(fileName);
    return fileName;
}

export default { generatePortfolioPDF, generateSessionPortfolioPDF };
