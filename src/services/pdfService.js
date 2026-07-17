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

export default { generatePortfolioPDF };
