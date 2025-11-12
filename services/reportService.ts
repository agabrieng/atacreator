import type { OnePageReportData, AdminSettings } from '../types';

/**
 * Generates a professional PDF document for the One Page Report.
 * @param reportData The structured data of the report.
 * @param adminSettings The settings for the active company profile.
 */
export const exportOnePageToPdf = async (reportData: OnePageReportData, adminSettings: AdminSettings): Promise<void> => {
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

    const { companyLogo, documentSettings } = adminSettings;
    const { onepage: docSettings } = documentSettings;

    const totalPagesPlaceholder = '{totalPages}';
    const page_width = doc.internal.pageSize.getWidth();
    const margin = 15;
    const headerHeight = 50;
    const footerMargin = 10; // Space reserved at the bottom for the footer text

    const drawPageTemplate = (data: any) => {
        const pageNum = data.pageNumber;
        // Header
        if (companyLogo) {
          try {
            doc.addImage(companyLogo, margin - 5, 10, 40, 15);
          } catch (e) { console.error("Error adding logo to PDF", e); }
        }
        
        (doc as any).autoTable({
            head: [
                [{ content: docSettings.title.toUpperCase(), rowSpan: 3, styles: { halign: 'center', valign: 'middle', fontSize: 14, fontStyle: 'bold' } }, {content: `N°: ${docSettings.docNumber}`, styles: {halign: 'left'}}, {content: `Rev. ${docSettings.revision}`, styles: {halign: 'left'}}],
                [{ content: `FOLHA: ${pageNum} de ${totalPagesPlaceholder}`, colSpan: 2, styles: {halign: 'left'} }],
                [{content: '', colSpan: 2, styles: {minCellHeight: 2}}] 
            ],
            startY: 10,
            margin: { left: margin + 40 },
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1 },
            headStyles: {fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1, lineColor: [150, 150, 150]},
            bodyStyles: {fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1, lineColor: [150, 150, 150]},
        });

        // Footer
        doc.setFontSize(5);
        doc.text(
            docSettings.propertyInfo,
            page_width / 2,
            doc.internal.pageSize.getHeight() - 5,
            { 
                align: 'center',
                maxWidth: page_width - margin * 2
            }
        );
    };

    let lastY = headerHeight;

    const addSection = (title: string, estimatedContentHeight: number, contentGenerator: () => void) => {
        const titleHeight = 8;
        const pageHeight = doc.internal.pageSize.getHeight();
        const availablePageHeight = pageHeight - headerHeight - footerMargin;
        const remainingSpaceOnPage = pageHeight - lastY - footerMargin;
        
        const requiredHeight = titleHeight + estimatedContentHeight;

        // If the section is small enough for a single page but doesn't fit in the remaining space, move to a new page.
        if (requiredHeight < availablePageHeight && requiredHeight > remainingSpaceOnPage) {
            doc.addPage();
            lastY = headerHeight;
        }
        // Also handle the edge case where only the title would fit, orphaning it.
        else if (lastY + titleHeight > pageHeight - footerMargin - 15) { // 15mm buffer for at least one row of content
            doc.addPage();
            lastY = headerHeight;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, lastY);
        lastY += titleHeight;
        contentGenerator();
    };
    
    // Main Report Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Gerencial OnePage', page_width / 2, lastY, { align: 'center' });
    lastY += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Período:', margin, lastY);
    doc.setFont('helvetica', 'normal');
    doc.text(reportData.periodo, margin + 18, lastY);
    lastY += 6;

    if (reportData.empreendimento) {
        doc.setFont('helvetica', 'bold');
        doc.text('Empreendimento:', margin, lastY);
        doc.setFont('helvetica', 'normal');
        const empreendimentoText = doc.splitTextToSize(reportData.empreendimento, page_width - margin * 2 - 32);
        doc.text(empreendimentoText, margin + 32, lastY);
        lastY += (empreendimentoText.length * 4); // Line height for 10pt font is ~4mm
    }
    lastY += 6; // Space after header info
    
    // --- Sumário Executivo ---
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(reportData.sumarioExecutivo, page_width - margin * 2);
    const summaryHeight = summaryLines.length * 5;
    addSection('Sumário Executivo', summaryHeight, () => {
        (doc as any).autoTable({
            startY: lastY,
            body: [[{ content: reportData.sumarioExecutivo, styles: { cellPadding: {top: 0, left: 0, right: 0, bottom: 2} } }]],
            theme: 'plain',
            styles: { fontSize: 10 },
            didDrawPage: drawPageTemplate,
            margin: { left: margin, right: margin },
        });
        lastY = (doc as any).autoTable.previous.finalY + 8;
    });

    if (reportData.principaisDecisoes.length > 0) {
        const estimatedHeight = reportData.principaisDecisoes.length * 7; // 7mm per list item
        addSection('Principais Decisões', estimatedHeight, () => {
             (doc as any).autoTable({ startY: lastY, body: reportData.principaisDecisoes.map(d => [{content: `• ${d}`, styles: { cellPadding: 2 }}]), theme: 'plain', styles: { fontSize: 10 }, didDrawPage: drawPageTemplate, margin: { left: margin, right: margin } });
             lastY = (doc as any).autoTable.previous.finalY + 8;
        });
    }

    if (reportData.acoesCriticas.length > 0) {
        const estimatedHeight = (1 + reportData.acoesCriticas.length) * 10; // 10mm per row to be safe with wrapping
        addSection('Ações Críticas', estimatedHeight, () => {
            (doc as any).autoTable({ startY: lastY, head: [['Ação', 'Responsável', 'Prazo']], body: reportData.acoesCriticas.map(a => [a.acao, a.responsavel, a.prazo]), theme: 'grid', headStyles: { fillColor: [41, 128, 185] }, didDrawPage: drawPageTemplate, margin: { left: margin, right: margin } });
            lastY = (doc as any).autoTable.previous.finalY + 10;
        });
    }

    if (reportData.projetosConcluidos.length > 0) {
        const estimatedHeight = (1 + reportData.projetosConcluidos.length) * 8; // 8mm per row, less wrapping
        addSection('Projetos Concluídos', estimatedHeight, () => {
            (doc as any).autoTable({ startY: lastY, head: [['Projeto', 'Data de Entrega']], body: reportData.projetosConcluidos.map(p => [p.nome, p.dataEntrega]), headStyles: { fillColor: [39, 174, 96] }, didDrawPage: drawPageTemplate, margin: { left: margin, right: margin } });
            lastY = (doc as any).autoTable.previous.finalY + 10;
        });
    }
    
    if (reportData.projetosEmRisco.length > 0) {
        const estimatedHeight = (1 + reportData.projetosEmRisco.length) * 12; // 12mm per row, allows for significant wrapping
        addSection('Projetos em Risco', estimatedHeight, () => {
            (doc as any).autoTable({ startY: lastY, head: [['Projeto', 'Prazo', 'Motivo']], body: reportData.projetosEmRisco.map(p => [p.nome, p.prazo, p.motivo]), headStyles: { fillColor: [231, 76, 60] }, didDrawPage: drawPageTemplate, margin: { left: margin, right: margin } });
            lastY = (doc as any).autoTable.previous.finalY + 10;
        });
    }

    if (reportData.analiseRiscos.length > 0) {
        const estimatedHeight = reportData.analiseRiscos.length * 7;
        addSection('Análise de Riscos e Impedimentos', estimatedHeight, () => {
            (doc as any).autoTable({ startY: lastY, body: reportData.analiseRiscos.map(d => [{content: `• ${d}`, styles: { cellPadding: 2 }}]), theme: 'plain', styles: { fontSize: 10 }, didDrawPage: drawPageTemplate, margin: { left: margin, right: margin } });
            lastY = (doc as any).autoTable.previous.finalY + 8;
        });
    }

    if (reportData.recomendacoes.length > 0) {
        const estimatedHeight = reportData.recomendacoes.length * 7;
        addSection('Recomendações', estimatedHeight, () => {
            (doc as any).autoTable({ startY: lastY, body: reportData.recomendacoes.map(d => [{content: `• ${d}`, styles: { cellPadding: 2 }}]), theme: 'plain', styles: { fontSize: 10 }, didDrawPage: drawPageTemplate, margin: { left: margin, right: margin } });
            lastY = (doc as any).autoTable.previous.finalY + 8;
        });
    }


    // Call the template on the first page
    drawPageTemplate({ pageNumber: 1 });

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        drawPageTemplate({ pageNumber: i });
    }
    
    if (typeof (doc as any).putTotalPages === 'function') {
      (doc as any).putTotalPages(totalPagesPlaceholder);
    }
    
    doc.save('Relatorio_OnePage.pdf');
};


/**
 * Generates an HTML string for the One Page Report, suitable for email clients.
 */
export const generateOnePageHtmlForEmail = (reportData: OnePageReportData, adminSettings: AdminSettings | null): string => {
    const fontFamily = "font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;";
    const listItems = (items: string[]) => items.map(item => `<li style="margin-bottom: 5px;">${item}</li>`).join('');

    const section = (title: string, content: string) => `
        <h3 style="font-size: 16px; font-weight: bold; color: #2c3e50; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #3498db;">${title}</h3>
        ${content}
    `;

    const table = (headers: string[], rows: string[][], headerColor: string = '#3498db') => {
        const headerHtml = headers.map(h => `<th style="padding: 8px; text-align: left; background-color: ${headerColor}; color: white;">${h}</th>`).join('');
        const bodyHtml = rows.map((row, index) => `
            <tr style="background-color: ${index % 2 === 0 ? '#f2f2f2' : '#ffffff'};">
                ${row.map(cell => `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${cell}</td>`).join('')}
            </tr>
        `).join('');
        return `<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 12px;"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
    };

    return `
    <!DOCTYPE html><html><body style="margin: 0; padding: 0; background-color: #f4f4f4; ${fontFamily}">
    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f4;"><tr><td align="center">
    <table width="600" cellspacing="0" cellpadding="20" border="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px;">
        <tr><td>
            <h1 style="font-size: 24px; color: #2c3e50; text-align: center;">Relatório Gerencial OnePage</h1>
            <p style="text-align: center; color: #7f8c8d; font-weight: bold;">${reportData.periodo}</p>
            
            ${section('Sumário Executivo', `<p style="line-height: 1.6; font-size: 14px; color: #34495e;">${reportData.sumarioExecutivo}</p>`)}
            
            ${reportData.principaisDecisoes.length > 0 ? section('Principais Decisões', `<ul style="padding-left: 20px; color: #34495e; font-size: 14px;">${listItems(reportData.principaisDecisoes)}</ul>`) : ''}

            ${reportData.acoesCriticas.length > 0 ? section('Ações Críticas', table(['Ação', 'Responsável', 'Prazo'], reportData.acoesCriticas.map(a => [a.acao, a.responsavel, a.prazo]), '#2980b9')) : ''}
            
            ${reportData.projetosConcluidos.length > 0 ? section('Projetos Concluídos', table(['Projeto', 'Data de Entrega'], reportData.projetosConcluidos.map(p => [p.nome, p.dataEntrega]), '#27ae60')) : ''}

            ${reportData.projetosEmRisco.length > 0 ? section('Projetos em Risco/Atrasados', table(['Projeto', 'Prazo', 'Motivo'], reportData.projetosEmRisco.map(p => [p.nome, p.prazo, p.motivo]), '#e74c3c')) : ''}
            
            ${reportData.analiseRiscos.length > 0 ? section('Análise de Riscos', `<ul style="padding-left: 20px; color: #34495e; font-size: 14px;">${listItems(reportData.analiseRiscos)}</ul>`) : ''}
            
            ${reportData.recomendacoes.length > 0 ? section('Recomendações', `<ul style="padding-left: 20px; color: #34495e; font-size: 14px;">${listItems(reportData.recomendacoes)}</ul>`) : ''}

        </td></tr>
    </table>
    </td></tr></table>
    </body></html>
    `;
};


/**
 * Generates a Microsoft Teams Adaptive Card JSON payload for the One Page Report.
 */
export const generateOnePageAdaptiveCard = (reportData: OnePageReportData, adminSettings: AdminSettings | null): object => {
    const section = (title: string, content: any[]) => ([
        { type: 'TextBlock', text: title, weight: 'bolder', size: 'medium', wrap: true, separator: true, spacing: 'large' },
        ...content
    ]);

    const list = (items: string[]) => items.map(item => ({ type: 'TextBlock', text: `- ${item}`, wrap: true }));
    
    const table = (headers: string[], rows: any[][]) => {
        const columns = headers.map(() => ({ type: 'Column', width: 'stretch', items: [] as any[] }));
        headers.forEach((h, i) => columns[i].items.push({ type: 'TextBlock', text: h, weight: 'bolder', wrap: true }));
        rows.forEach(row => {
            row.forEach((cell, i) => columns[i].items.push({ type: 'TextBlock', text: cell.toString(), wrap: true, separator: true, spacing: 'small' }));
        });
        return [{ type: 'ColumnSet', columns }];
    };

    const body: any[] = [
        { type: 'TextBlock', text: 'Relatório Gerencial OnePage', weight: 'bolder', size: 'extraLarge', wrap: true },
        { type: 'TextBlock', text: reportData.periodo, isSubtle: true, spacing: 'none', wrap: true },
        ...section('Sumário Executivo', [{ type: 'TextBlock', text: reportData.sumarioExecutivo, wrap: true }]),
    ];

    if (reportData.principaisDecisoes.length > 0) {
        body.push(...section('Principais Decisões', list(reportData.principaisDecisoes)));
    }
    if (reportData.acoesCriticas.length > 0) {
        body.push(...section('Ações Críticas', table(['Ação', 'Responsável', 'Prazo'], reportData.acoesCriticas.map(a => [a.acao, a.responsavel, a.prazo]))));
    }
    if (reportData.projetosConcluidos.length > 0) {
        body.push(...section('Projetos Concluídos', table(['Projeto', 'Data'], reportData.projetosConcluidos.map(p => [p.nome, p.dataEntrega]))));
    }
    if (reportData.projetosEmRisco.length > 0) {
        body.push(...section('Projetos em Risco/Atrasados', table(['Projeto', 'Prazo', 'Motivo'], reportData.projetosEmRisco.map(p => [p.nome, p.prazo, p.motivo]))));
    }
    if (reportData.analiseRiscos.length > 0) {
        body.push(...section('Análise de Riscos', list(reportData.analiseRiscos)));
    }
    if (reportData.recomendacoes.length > 0) {
        body.push(...section('Recomendações', list(reportData.recomendacoes)));
    }
    
    return {
        type: 'message',
        attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
                $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                type: 'AdaptiveCard',
                version: '1.4',
                body: body
            }
        }]
    };
};