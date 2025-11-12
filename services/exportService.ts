import type { AtaData } from '../types';

const slugify = (text: string): string => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').substring(0, 50);

const shortenName = (fullName: string): string => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(0, 2).join(' ');
};


// Colors mapped from TailwindCSS classes in MinutesDisplay.tsx for PDF generation
const PDF_COLORS = [
    { bg: [219, 234, 254], text: [30, 64, 175] },    // Blue
    { bg: [209, 250, 229], text: [6, 95, 70] },      // Green
    { bg: [254, 249, 195], text: [133, 77, 14] },    // Yellow
    { bg: [243, 232, 255], text: [88, 28, 135] },    // Purple
    { bg: [252, 231, 243], text: [157, 23, 77] },    // Pink
];


export const exportToPdf = async (ata: AtaData): Promise<void> => {
    const jsPDF = (window as any).jspdf?.jsPDF;
    if (!jsPDF) {
        alert("A biblioteca de exportação (jsPDF) não foi encontrada.");
        return;
    }
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    
    if (!(doc as any).autoTable) {
        alert("A biblioteca de exportação (jsPDF-AutoTable) não foi encontrada ou não foi carregada corretamente.");
        return;
    }

    const totalPagesPlaceholder = '{totalPages}';
    const page_width = doc.internal.pageSize.getWidth();
    const margin = 10;
    const headerHeight = 55; // Approximate height of the header section

    const drawHeader = (data: any) => {
        const pageNum = data.pageNumber;
        
        // --- Header ---
        if (ata.logoUrl) {
          try {
            doc.addImage(ata.logoUrl, margin, 10, 40, 15);
          } catch (e) { console.error("Error adding logo to PDF", e); }
        }
        
        (doc as any).autoTable({
            head: [
                [{ content: "ATA DE REUNIÃO", rowSpan: 3, styles: { halign: 'center', valign: 'middle', fontSize: 14, fontStyle: 'bold' } }, {content: `N°: ${ata.numeroDocumento}`, styles: {halign: 'left'}}, {content: `Rev. ${ata.revisao}`, styles: {halign: 'left'}}],
                [{ content: `FOLHA: ${pageNum} de ${totalPagesPlaceholder}`, colSpan: 2, styles: {halign: 'left'} }],
                // Empty row for spacing to match DOCX layout better
                [{content: '', colSpan: 2, styles: {minCellHeight: 2}}] 
            ],
            body: [
                ['EMPREENDIMENTO:', { content: ata.empreendimento, colSpan: 2 }],
                ['ÁREA:', { content: ata.area, colSpan: 2 }],
                ['TÍTULO:', { content: ata.titulo, colSpan: 2 }],
            ],
            startY: 10,
            margin: { left: margin + 45 },
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1 },
            headStyles: {fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1, lineColor: [150, 150, 150]},
            bodyStyles: {fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1, lineColor: [150, 150, 150]},
        });
    };
    
    // --- Body Content ---
    const autoTableConfig = {
      margin: { left: margin, right: margin, top: headerHeight },
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
      headStyles: {fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold'},
      footStyles: {fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold'},
      didDrawPage: drawHeader
    };
    
    (doc as any).autoTable({
      body: [
        [`Contrato: ${ata.contrato}`],
        [`Assunto: ${ata.assunto}`],
      ],
      ...autoTableConfig,
      theme: 'grid',
    });
    
     (doc as any).autoTable({
      body: [
        [`Local: ${ata.local}`, `Horário: ${ata.horario}`, `Data: ${ata.data}`]
      ],
      startY: (doc as any).autoTable.previous.finalY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      didDrawPage: drawHeader,
    });
    
    // --- Participants ---
    (doc as any).autoTable({
        head: [['Empresa', 'Participantes', 'E-mails', 'P/A', 'Assinatura']],
        body: ata.participantes.map(p => [p.empresa, p.nome, p.email, p.status, '']),
        startY: (doc as any).autoTable.previous.finalY + 2,
        ...autoTableConfig,
        foot: [[{content: 'P = Presença  PA = Presença com atraso  A = Ausência  AJ = Ausência Justificada', colSpan: 5, styles: {fontSize: 8, halign: 'left'}}]]
    });
    
    // --- Observations ---
    (doc as any).autoTable({
        head: [['OBSERVAÇÕES']],
        body: [[ata.observacoes]],
        startY: (doc as any).autoTable.previous.finalY + 2,
        ...autoTableConfig
    });

    // --- Pauta ---
    // Create consistent color map for responsibles, just like in the UI
    const allResponsibleNames = new Set<string>();
    ata.pauta.forEach(item => {
        item.responsaveis.forEach(resp => {
            allResponsibleNames.add(resp.responsavel);
        });
    });

    const responsibleColorMap: Record<string, typeof PDF_COLORS[number]> = {};
    Array.from(allResponsibleNames).sort().forEach((name, index) => {
        responsibleColorMap[name] = PDF_COLORS[index % PDF_COLORS.length];
    });


    const pautaBody: any[] = [];
    ata.pauta.forEach(item => {
        const numResponsaveis = item.responsaveis.length;
        if (numResponsaveis === 0) {
            pautaBody.push([
                { content: item.item, styles: { halign: 'center', valign: 'middle' } },
                item.descricao,
                '',
                ''
            ]);
        } else {
            item.responsaveis.forEach((resp, respIndex) => {
                const color = responsibleColorMap[resp.responsavel] || PDF_COLORS[0]; // Use the consistent color map
                const cellStyles = {
                    fillColor: color.bg,
                    textColor: color.text,
                    fontStyle: 'normal',
                    halign: 'left',
                    valign: 'middle',
                };

                const responsavelCell = { content: shortenName(resp.responsavel), styles: cellStyles };
                const prazoCell = { content: resp.prazo || 'N/A', styles: cellStyles };

                if (respIndex === 0) {
                    pautaBody.push([
                        { content: item.item, rowSpan: numResponsaveis, styles: { halign: 'center', valign: 'top' } },
                        { content: item.descricao, rowSpan: numResponsaveis, styles: { valign: 'top' } },
                        responsavelCell,
                        prazoCell
                    ]);
                } else {
                    pautaBody.push([responsavelCell, prazoCell]);
                }
            });
        }
    });

    (doc as any).autoTable({
        head: [['Item', 'Descrição', 'Responsável(eis)', 'Prazo']],
        body: pautaBody,
        startY: (doc as any).autoTable.previous.finalY + 2,
        ...autoTableConfig,
        columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 45 },
            3: { cellWidth: 30 },
        }
    });

    // --- Footer ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(5);
        doc.text(
            ata.informacaoPropriedade,
            page_width / 2,
            doc.internal.pageSize.getHeight() - 5,
            { 
                align: 'center',
                maxWidth: page_width - margin * 2
            }
        );
    }

    // Replace the placeholder with the total page count.
    // This is done after all pages are rendered.
    if (typeof (doc as any).putTotalPages === 'function') {
      (doc as any).putTotalPages(totalPagesPlaceholder);
    }

    doc.save(`${slugify(ata.titulo)}.pdf`);
};