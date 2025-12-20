import jsPDF from 'jspdf';

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

    // Helper function to add image from URL
    const addImageFromUrl = async (url, x, y, width, height) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                try {
                    pdf.addImage(img, 'JPEG', x, y, width, height);
                } catch (e) {
                    console.error('Error adding image:', e);
                }
                resolve();
            };
            img.onerror = () => resolve();
            img.src = url;
        });
    };

    // Title Page
    pdf.setFillColor(253, 242, 248); // Pastel pink background
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor(74, 4, 78); // Dark purple
    pdf.text('🎨 나의 미술 포트폴리오', pageWidth / 2, 80, { align: 'center' });

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'normal');
    pdf.text(studentInfo.displayName || '학생', pageWidth / 2, 100, { align: 'center' });

    pdf.setFontSize(12);
    pdf.setTextColor(131, 24, 67);
    pdf.text(`총 ${artworks.length}개의 작품`, pageWidth / 2, 115, { align: 'center' });
    pdf.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, pageWidth / 2, 125, { align: 'center' });

    // Badges section on title page
    if (badges.length > 0) {
        pdf.setFontSize(14);
        pdf.text(`🏆 획득한 뱃지: ${badges.length}개`, pageWidth / 2, 145, { align: 'center' });
        pdf.setFontSize(10);
        const badgeNames = badges.map(b => b.name).join(', ');
        pdf.text(badgeNames, pageWidth / 2, 155, { align: 'center' });
    }

    // Artworks pages
    if (artworks.length > 0) {
        pdf.addPage();
        yPos = margin;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(74, 4, 78);
        pdf.text('📖 작품 목록', margin, yPos);
        yPos += 15;

        for (let i = 0; i < artworks.length; i++) {
            const art = artworks[i];

            // Check if we need a new page
            if (yPos > pageHeight - 100) {
                pdf.addPage();
                yPos = margin;
            }

            // Artwork box
            pdf.setDrawColor(244, 114, 182);
            pdf.setLineWidth(0.5);
            pdf.roundedRect(margin, yPos, pageWidth - margin * 2, 85, 3, 3);

            // Artwork number
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.setTextColor(74, 4, 78);
            pdf.text(`작품 #${i + 1}`, margin + 5, yPos + 8);

            // Try to add image
            if (art.imageUrl) {
                try {
                    await addImageFromUrl(art.imageUrl, margin + 5, yPos + 12, 50, 50);
                } catch (e) {
                    pdf.setFontSize(10);
                    pdf.text('[이미지 로드 실패]', margin + 10, yPos + 35);
                }
            }

            // Prompt text
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 0);

            const promptText = art.prompt || '프롬프트 없음';
            const maxWidth = pageWidth - margin * 2 - 65;
            const splitPrompt = pdf.splitTextToSize(promptText, maxWidth);
            pdf.text(splitPrompt.slice(0, 4), margin + 60, yPos + 20);

            // Date
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            const dateStr = art.createdAt?.toDate?.()?.toLocaleDateString('ko-KR') || '';
            pdf.text(dateStr, margin + 60, yPos + 70);

            yPos += 90;
        }
    }

    // Footer on last page
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('© 2025 서울신답초등학교 정용석 · Total Visual Art Class', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Save the PDF
    const fileName = `${studentInfo.displayName || 'student'}_portfolio_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(fileName);

    return fileName;
}

export default { generatePortfolioPDF };
