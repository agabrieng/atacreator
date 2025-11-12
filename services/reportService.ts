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
    const page_height = doc.internal.pageSize.getHeight();
    const margin = 15;
    const headerHeight = 40;
    const footerMargin = 10;

    const drawPageTemplate = (data: any) => {
        const pageNum = data.pageNumber;
        
        // Header Table
        (doc as any).autoTable({
            head: [
                [{ content: docSettings.title.toUpperCase(), rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: 14, fontStyle: 'bold' } }, {content: `N°: ${docSettings.docNumber}`, styles: {halign: 'left'}}, {content: `Rev. ${docSettings.revision}`, styles: {halign: 'left'}}],
                [{ content: `FOLHA: ${pageNum} de ${totalPagesPlaceholder}`, colSpan: 2, styles: {halign: 'left'} }],
            ],
            startY: 10,
            margin: { left: margin + 45 },
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1 },
            headStyles: {fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1, lineColor: [150, 150, 150]},
        });
        
        // Logo
        if (companyLogo) {
          try {
            doc.addImage(companyLogo, margin, 12, 40, 15);
          } catch (e) { console.error("Error adding logo to PDF", e); }
        }

        // Footer
        doc.setFontSize(5);
        doc.text(
            docSettings.propertyInfo,
            page_width / 2,
            page_height - 5,
            { align: 'center', maxWidth: page_width - margin * 2 }
        );
    };

    let lastY = 35; // Initial start Y after header area

    const checkPageBreak = (neededHeight: number) => {
        if (lastY + neededHeight > page_height - footerMargin) {
            doc.addPage();
            lastY = headerHeight;
        }
    };

    const addSectionTitle = (title: string) => {
        checkPageBreak(15); // Check space for title + a bit of content
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, lastY);
        lastY += 8;
    };
    
    // --- Main Report Title and Header Info ---
    checkPageBreak(30);
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
        checkPageBreak(empreendimentoText.length * 4);
        doc.text(empreendimentoText, margin + 32, lastY);
        lastY += (empreendimentoText.length * 4);
    }
    lastY += 6;
    
    const autoTableOptions = {
        didDrawPage: drawPageTemplate,
        margin: { left: margin, right: margin, top: headerHeight },
    };

    // --- Sumário Executivo ---
    addSectionTitle('Sumário Executivo');
    (doc as any).autoTable({ ...autoTableOptions, startY: lastY, body: [[reportData.sumarioExecutivo]], theme: 'plain', styles: { fontSize: 10 } });
    lastY = (doc as any).autoTable.previous.finalY + 8;

    // --- Por dentro das reuniões ---
    if (reportData.porDentroDasReunioes?.length > 0) {
        addSectionTitle('Por dentro das reuniões');
        (doc as any).autoTable({
            ...autoTableOptions,
            startY: lastY,
            body: reportData.porDentroDasReunioes.flatMap(reuniao => [
                [{ content: `${reuniao.data} - ${reuniao.titulo}`, styles: { fontStyle: 'bold', cellPadding: { top: 3, bottom: 1 } } }],
                [{ content: reuniao.resumo, styles: { cellPadding: { top: 1, bottom: 5 } } }],
            ]),
            theme: 'plain',
            styles: { fontSize: 10 },
        });
        lastY = (doc as any).autoTable.previous.finalY + 8;
    }

    // --- Principais Decisões ---
    if (reportData.principaisDecisoes?.length > 0) {
        addSectionTitle('Principais Decisões');
        (doc as any).autoTable({ ...autoTableOptions, startY: lastY, body: reportData.principaisDecisoes.map(d => [`• ${d}`]), theme: 'plain', styles: { fontSize: 10, cellPadding: 2 } });
        lastY = (doc as any).autoTable.previous.finalY + 8;
    }

    // --- Ações Críticas ---
    if (reportData.acoesCriticas?.length > 0) {
        addSectionTitle('Ações Críticas');
        (doc as any).autoTable({ ...autoTableOptions, startY: lastY, head: [['Ação', 'Responsável', 'Prazo']], body: reportData.acoesCriticas.map(a => [a.acao, a.responsavel, a.prazo]), theme: 'grid', headStyles: { fillColor: [41, 128, 185] } });
        lastY = (doc as any).autoTable.previous.finalY + 10;
    }

    // --- Projetos Concluídos ---
    if (reportData.projetosConcluidos?.length > 0) {
        addSectionTitle('Projetos Concluídos');
        (doc as any).autoTable({ ...autoTableOptions, startY: lastY, head: [['Projeto', 'Data de Entrega']], body: reportData.projetosConcluidos.map(p => [p.nome, p.dataEntrega]), headStyles: { fillColor: [39, 174, 96] } });
        lastY = (doc as any).autoTable.previous.finalY + 10;
    }

    // --- Projetos em Risco ---
    if (reportData.projetosEmRisco?.length > 0) {
        addSectionTitle('Projetos em Risco');
        (doc as any).autoTable({ ...autoTableOptions, startY: lastY, head: [['Projeto', 'Prazo', 'Motivo']], body: reportData.projetosEmRisco.map(p => [p.nome, p.prazo, p.motivo]), headStyles: { fillColor: [231, 76, 60] } });
        lastY = (doc as any).autoTable.previous.finalY + 10;
    }

    // --- Análise de Riscos ---
    if (reportData.analiseRiscos?.length > 0) {
        addSectionTitle('Análise de Riscos e Impedimentos');
        (doc as any).autoTable({ ...autoTableOptions, startY: lastY, body: reportData.analiseRiscos.map(d => [`• ${d}`]), theme: 'plain', styles: { fontSize: 10, cellPadding: 2 } });
        lastY = (doc as any).autoTable.previous.finalY + 8;
    }
    
    // --- Recomendações ---
    if (reportData.recomendacoes?.length > 0) {
        addSectionTitle('Recomendações');
        (doc as any).autoTable({ ...autoTableOptions, startY: lastY, body: reportData.recomendacoes.map(d => [`• ${d}`]), theme: 'plain', styles: { fontSize: 10, cellPadding: 2 } });
        lastY = (doc as any).autoTable.previous.finalY + 8;
    }

    // --- Finalize Pages ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawPageTemplate({ pageNumber: i });
    }
    
    if (typeof (doc as any).putTotalPages === 'function') {
      (doc as any).putTotalPages(totalPagesPlaceholder);
    }
    
    // --- Generate Dynamic Filename ---
    const now = new Date();
    const formattedDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
    
    let periodForFilename = reportData.periodo.replace(/[^0-9a-zA-Z]+/g, '_');
    const dates = reportData.periodo.match(/\d{2}\/\d{2}\/\d{4}/g);
    if (dates && dates.length > 0) {
        periodForFilename = dates.join('_a_').replace(/\//g, '-');
    }

    let empreendimentoForFilename = '';
    if (reportData.empreendimento) {
        const slug = reportData.empreendimento
            .toLowerCase()
            .replace(/\{|\}/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
        empreendimentoForFilename = `_${slug.substring(0, 15)}`;
    }

    const filename = `${formattedDateTime}_Relatorio_OnePage_semana_${periodForFilename}${empreendimentoForFilename}.pdf`;

    doc.save(filename);
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
            
            ${reportData.porDentroDasReunioes && reportData.porDentroDasReunioes.length > 0 ? 
                section('Por dentro das reuniões', 
                    reportData.porDentroDasReunioes.map(reuniao => `
                        <div style="margin-bottom: 12px; padding: 10px; background-color: #ecf0f1; border-radius: 4px;">
                            <p style="margin: 0 0 5px 0; font-size: 13px; font-weight: bold; color: #2c3e50;">${reuniao.data} - ${reuniao.titulo}</p>
                            <p style="margin: 0; line-height: 1.5; font-size: 13px; color: #34495e;">${reuniao.resumo}</p>
                        </div>
                    `).join('')
                ) : ''
            }

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

    if (reportData.porDentroDasReunioes && reportData.porDentroDasReunioes.length > 0) {
        const meetingSummaries = reportData.porDentroDasReunioes.map(reuniao => (
            {
                type: 'Container',
                style: 'emphasis',
                items: [
                    { type: 'TextBlock', text: `${reuniao.data} - ${reuniao.titulo}`, weight: 'bolder', wrap: true },
                    { type: 'TextBlock', text: reuniao.resumo, wrap: true, spacing: 'small' }
                ],
                separator: true
            }
        ));
        body.push(...section('Por dentro das reuniões', meetingSummaries));
    }

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