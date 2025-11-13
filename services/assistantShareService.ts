import type { AdminSettings } from '../types';
import { sendToTeamsWebhook } from './webhookService';

/**
 * Exports the conversation with the AI assistant to a PDF document.
 * @param question The user's question.
 * @param answer The AI's answer.
 * @param adminSettings The settings for the active company profile.
 */
export const exportAssistantResponseToPdf = async (question: string, answer: string, adminSettings: AdminSettings | null): Promise<void> => {
    const jsPDF = (window as any).jspdf?.jsPDF;
    if (!jsPDF) {
        alert("A biblioteca de exportação (jsPDF) não foi encontrada.");
        return;
    }
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    if (!(doc as any).autoTable) {
        alert("A biblioteca de exportação (jsPDF-AutoTable) não foi encontrada.");
        return;
    }

    const { companyLogo, documentSettings } = adminSettings || {};
    const docSettings = documentSettings?.ata || { title: 'RELATÓRIO ASSISTENTE IA', docNumber: 'N/A', revision: 'N/A', propertyInfo: 'CONFIDENCIAL' };
    
    const page_width = doc.internal.pageSize.getWidth();
    const page_height = doc.internal.pageSize.getHeight();
    const margin = 15;

    const drawPageTemplate = () => {
        if (companyLogo) {
          try { doc.addImage(companyLogo, margin, 12, 40, 15); } catch (e) { console.error("Error adding logo to PDF", e); }
        }
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(docSettings.title, page_width / 2, 20, { align: 'center' });
        doc.setFontSize(8);
        doc.text(docSettings.propertyInfo, page_width / 2, page_height - 10, { align: 'center' });
    };

    drawPageTemplate();
    let lastY = 40;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40);
    const questionLines = doc.splitTextToSize(`Pergunta: ${question}`, page_width - margin * 2);
    doc.text(questionLines, margin, lastY);
    lastY += (questionLines.length * 7) + 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);

    const answerLines = answer.split('\n');
    answerLines.forEach(line => {
        if (lastY > page_height - 20) {
            doc.addPage();
            drawPageTemplate();
            lastY = 40;
        }

        if (line.trim().startsWith('* ')) {
            const bulletContent = doc.splitTextToSize(line.substring(2), page_width - margin * 2 - 5);
            doc.text(`•`, margin, lastY, { charSpace: 2 });
            doc.text(bulletContent, margin + 5, lastY);
            lastY += bulletContent.length * 6;
        } else if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
            doc.setFont('helvetica', 'bold');
            const boldContent = doc.splitTextToSize(line.substring(2, line.length - 2), page_width - margin * 2);
            doc.text(boldContent, margin, lastY);
            doc.setFont('helvetica', 'normal');
            lastY += boldContent.length * 6 + 2;
        } else if (line.trim() === '') {
            lastY += 4;
        } else {
            const pContent = doc.splitTextToSize(line, page_width - margin * 2);
            doc.text(pContent, margin, lastY);
            lastY += pContent.length * 6;
        }
    });

    doc.save(`Resposta_IA_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Generates an HTML string for the AI Assistant's response, suitable for email clients.
 */
export const generateAssistantHtmlForEmail = (question: string, answer: string, adminSettings: AdminSettings | null): string => {
    const fontFamily = "font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;";
    
    const answerHtml = '<ul>' + answer.split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => {
            if (line.startsWith('* ')) return `<li>${line.substring(2)}</li>`;
            if (line.startsWith('**') && line.endsWith('**')) return `<p><strong>${line.substring(2, line.length - 2)}</strong></p>`;
            return `<p>${line}</p>`;
        })
        .join('')
        .replace(/<\/p><p>/g, '</p><p>')
        .replace(/<\/li><li>/g, '</li><li>')
        .replace(/<\/p><li>/g, '</ul><p>')
        .replace(/<\/li><p>/g, '</li></ul><p>') + '</ul>'
        .replace(/<ul><\/ul>/g, '');

    const companyName = adminSettings?.companyName || 'Claritas';
    const companyLogo = adminSettings?.companyLogo;

    return `
    <!DOCTYPE html><html><body style="margin: 0; padding: 0; background-color: #f4f4f4; ${fontFamily}">
    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f4;"><tr><td align="center">
    <table width="600" cellspacing="0" cellpadding="20" border="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px;">
        <tr><td>
            ${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="max-height: 40px; margin-bottom: 20px;">` : `<h1 style="font-size: 24px;">${companyName}</h1>`}
            <h2 style="font-size: 18px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">Resposta do Assistente IA Claritas</h2>
            
            <h3 style="font-size: 16px; color: #555; margin-top: 20px;">Sua Pergunta:</h3>
            <p style="background-color: #f9f9f9; border-left: 3px solid #ccc; padding: 10px; font-style: italic; color: #333;">${question}</p>

            <h3 style="font-size: 16px; color: #555; margin-top: 20px;">Resposta:</h3>
            <div style="line-height: 1.6; color: #333;">${answerHtml}</div>
        </td></tr>
    </table>
    </td></tr></table>
    </body></html>`;
};

/**
 * Generates a Microsoft Teams Adaptive Card JSON payload for the AI Assistant's response.
 */
export const generateAssistantAdaptiveCard = (question: string, answer: string): object => {
    const body: any[] = [
        { type: 'TextBlock', text: 'Resposta do Assistente IA Claritas', weight: 'bolder', size: 'large' },
        {
            type: 'Container',
            style: 'emphasis',
            separator: true,
            spacing: 'medium',
            items: [
                { type: 'TextBlock', text: `**Pergunta:** ${question}`, wrap: true },
            ]
        },
        { type: 'TextBlock', text: `**Resposta:**\n\n${answer}`, wrap: true, separator: true, spacing: 'medium' },
    ];
    
    return {
        type: 'message',
        attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
                '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
                type: 'AdaptiveCard',
                version: '1.4',
                body: body
            }
        }]
    };
};
