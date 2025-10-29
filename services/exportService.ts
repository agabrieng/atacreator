

import {
  AlignmentType, Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, VerticalAlign, HeadingLevel, TextRun, ImageRun, Header, PageNumber
} from 'docx';
import type { AtaData, ResponsavelPrazo } from '../types';

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


export const exportToDocx = async (ata: AtaData): Promise<void> => {
    const saveAs = (window as any).saveAs;
    if (!saveAs) {
      alert("A biblioteca de exportação (FileSaver.js) não foi encontrada.");
      return;
    }
    
    let logoBuffer: ArrayBuffer | undefined = undefined;
    if (ata.logoUrl) {
        try {
            const response = await fetch(ata.logoUrl);
            logoBuffer = await response.arrayBuffer();
        } catch (e) {
            console.error("Failed to fetch logo for DOCX export:", e);
        }
    }

    const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        children: [logoBuffer ? new Paragraph({
                            // Fix: Use 'buffer' instead of 'data' for ImageRun property
                            children: [new ImageRun({ buffer: logoBuffer, transformation: { width: 120, height: 45 }})],
                            alignment: AlignmentType.CENTER
                        }) : new Paragraph("")],
                        verticalAlign: VerticalAlign.CENTER,
                        rowSpan: 3,
                        width: { size: 25, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ text: "ATA DE REUNIÃO", style: "strong", alignment: AlignmentType.CENTER, })],
                        verticalAlign: VerticalAlign.CENTER,
                        rowSpan: 3,
                        width: { size: 50, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({ children: [new Paragraph("N°: " + ata.numeroDocumento)] }),
                    new TableCell({ children: [new Paragraph("Rev. " + ata.revisao)] }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({
                            children: [
                                new TextRun("FOLHA: "),
                                new TextRun({ children: [PageNumber.CURRENT] }),
                                new TextRun(" de "),
                                new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                            ]
                        })],
                        columnSpan: 2
                    }),
                ],
            }),
            new TableRow({ children: [new TableCell({ children: [] }), new TableCell({ children: [] })] }), // Empty row for spacing
            new TableRow({
                children: [
                    new TableCell({children: [new Paragraph("EMPREENDIMENTO:"), new Paragraph({text: ata.empreendimento, style: "strong"})], columnSpan: 4}),
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({children: [new Paragraph("ÁREA:"), new Paragraph({text: ata.area, style: "strong"})], columnSpan: 4}),
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({children: [new Paragraph("TÍTULO:"), new Paragraph({text: ata.titulo, style: "strong"})], columnSpan: 4}),
                ]
            }),
        ],
    });

    const doc = new Document({
        sections: [{
            headers: {
                default: new Header({
                    children: [headerTable, new Paragraph(" ")], // Add table and a space after
                }),
            },
            children: [
                new Table({
                    width: {size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({children: [new TableCell({children: [new Paragraph(`Contrato: ${ata.contrato}`)]})]}),
                        new TableRow({children: [new TableCell({children: [new Paragraph(`Assunto: ${ata.assunto}`)]})]}),
                         new TableRow({
                            children: [
                                new TableCell({ width: { size: 33, type: WidthType.PERCENTAGE }, children: [new Paragraph(`Local: ${ata.local}`)]}),
                                new TableCell({ width: { size: 33, type: WidthType.PERCENTAGE }, children: [new Paragraph(`Horário: ${ata.horario}`)]}),
                                new TableCell({ width: { size: 34, type: WidthType.PERCENTAGE }, children: [new Paragraph(`Data: ${ata.data}`)]}),
                            ]
                         })
                    ]
                }),
                new Paragraph({ text: "" }), // Spacing

                // Participants Table
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: "Empresa", style: "strong" })] }),
                                new TableCell({ children: [new Paragraph({ text: "Participantes", style: "strong" })] }),
                                new TableCell({ children: [new Paragraph({ text: "E-mails", style: "strong" })] }),
                                new TableCell({ children: [new Paragraph({ text: "P/A", style: "strong" })] }),
                                new TableCell({ children: [new Paragraph({ text: "Assinatura", style: "strong" })] }),
                            ],
                        }),
                        ...ata.participantes.map(p => new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph(p.empresa)] }),
                                new TableCell({ children: [new Paragraph(p.nome)] }),
                                new TableCell({ children: [new Paragraph(p.email)] }),
                                new TableCell({ children: [new Paragraph(p.status)] }),
                                new TableCell({ children: [new Paragraph(" ")] }),
                            ]
                        })),
                        new TableRow({
                           children: [new TableCell({
                            columnSpan: 5,
                            children: [new Paragraph({text: 'P = Presença  PA = Presença com atraso  A = Ausência  AJ = Ausência Justificada', style: 'small'})]
                           })]
                        })
                    ],
                }),
                new Paragraph({ text: "" }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE},
                    rows: [
                        new TableRow({ children: [new TableCell({children: [new Paragraph({text: 'OBSERVAÇÕES', style: 'strong', alignment: AlignmentType.CENTER})]})]}),
                        new TableRow({ children: [new TableCell({children: [new Paragraph(ata.observacoes)]})]})
                    ]
                }),
                new Paragraph({ text: "" }),
                
                 new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                         new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: "Item", style: "strong" })], width: {size: 10, type: WidthType.PERCENTAGE} }),
                                new TableCell({ children: [new Paragraph({ text: "Descrição", style: "strong" })], width: {size: 50, type: WidthType.PERCENTAGE} }),
                                new TableCell({ children: [new Paragraph({ text: "Responsável(eis)", style: "strong" })], width: {size: 20, type: WidthType.PERCENTAGE} }),
                                new TableCell({ children: [new Paragraph({ text: "Prazo", style: "strong" })], width: {size: 20, type: WidthType.PERCENTAGE} }),
                            ],
                        }),
                        ...ata.pauta.map(item => new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph(item.item)], verticalAlign: VerticalAlign.TOP }),
                                new TableCell({ children: item.descricao.split('\n').map(line => new Paragraph(line))}),
                                new TableCell({ children: item.responsaveis.map(r => new Paragraph(shortenName(r.responsavel))), verticalAlign: VerticalAlign.TOP }),
                                new TableCell({ children: item.responsaveis.map(r => new Paragraph(r.prazo || "")), verticalAlign: VerticalAlign.TOP }),
                            ]
                        }))
                    ]
                 }),
                 new Paragraph({ text: "" }),
                 new Paragraph({ text: ata.informacaoPropriedade, alignment: AlignmentType.CENTER, style: 'small' }),
            ],
        }],
         styles: {
            default: {
                document: {
                    run: {
                        font: "Calibri",
                        size: "22pt", // 11pt
                    },
                },
            },
            paragraphStyles: [{
                id: "strong",
                name: "Strong",
                basedOn: "Normal",
                next: "Normal",
                run: { bold: true },
            }, {
                id: "small",
                name: "Small",
                basedOn: "Normal",
                next: "Normal",
                run: { size: '16pt' }, // 8pt
            }],
        },
    });

    Packer.toBlob(doc).then(blob => {
        saveAs(blob, `${slugify(ata.titulo)}.docx`);
    });
};


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
            doc.addImage(ata.logoUrl, 'PNG', margin, 10, 40, 15);
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
                const color = PDF_COLORS[respIndex % PDF_COLORS.length];
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
        doc.setFontSize(8);
        doc.text(ata.informacaoPropriedade, page_width / 2, doc.internal.pageSize.getHeight() - 7, { align: 'center' });
    }

    // Replace the placeholder with the total page count.
    // This is done after all pages are rendered.
    if (typeof (doc as any).putTotalPages === 'function') {
      (doc as any).putTotalPages(totalPagesPlaceholder);
    }

    doc.save(`${slugify(ata.titulo)}.pdf`);
};