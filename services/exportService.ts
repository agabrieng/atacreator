import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type { MeetingMinutes } from '../types';

// Helper function to create a URL/file-safe slug from the title
const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .substring(0, 50); // Truncate to 50 chars
};

export const exportToDocx = (minutes: MeetingMinutes): void => {
  const saveAs = (window as any).saveAs;

  if (!saveAs) {
    const errorMsg = "A biblioteca de exportação (FileSaver.js) não foi encontrada. Verifique a conexão com a internet ou se há bloqueadores de script.";
    console.error(errorMsg, { saveAs });
    alert(errorMsg);
    return;
  }
  
  const sections = [
    new Paragraph({
      text: minutes.cabecalho.titulo,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `${minutes.cabecalho.dataHora} | ${minutes.cabecalho.plataforma}`,
      alignment: AlignmentType.CENTER,
      style: "WellSpaced",
    }),
    new Paragraph({ text: "Participantes", heading: HeadingLevel.HEADING_2 }),
    ...minutes.participantes.map(p => new Paragraph({ text: p, bullet: { level: 0 } })),

    new Paragraph({ text: "Resumo da Discussão", heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: minutes.resumo }),

    new Paragraph({ text: "Decisões", heading: HeadingLevel.HEADING_2 }),
    ...(minutes.decisoes.length > 0 
        ? minutes.decisoes.map(d => new Paragraph({ 
            children: [
                new TextRun({ text: `${d.por}: `, bold: true }),
                new TextRun(d.texto),
            ],
            bullet: { level: 0 },
        }))
        : [new Paragraph({ text: "Nenhuma decisão registrada." })]),

    new Paragraph({ text: "Ações e Responsabilidades", heading: HeadingLevel.HEADING_2 }),
    ...(minutes.acoes.length > 0
        ? minutes.acoes.map(a => new Paragraph({ 
            children: [
                new TextRun({ text: a.texto, bold: true }),
                new TextRun(` (Responsável: ${a.por}${a.prazo ? `, Prazo: ${a.prazo}`: ''})`),
            ],
            bullet: { level: 0 },
        }))
        : [new Paragraph({ text: "Nenhuma ação registrada." })]),
    
    new Paragraph({ text: "Encerramento", heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: minutes.encerramento, style: "WellSpaced" }),
  ];

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "WellSpaced",
          name: "Well Spaced",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          paragraph: {
            spacing: { after: 120, before: 120 },
          },
        },
      ],
    },
    sections: [{
      properties: {},
      children: sections,
    }],
  });

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `${slugify(minutes.cabecalho.titulo)}.docx`);
  }).catch(err => {
    console.error("Erro ao criar o arquivo DOCX:", err);
    alert("Não foi possível gerar o arquivo DOCX. Verifique o console para mais detalhes.");
  });
};


export const exportToPdf = (minutes: MeetingMinutes): void => {
    const jsPDF = (window as any).jspdf?.jsPDF;

    if (!jsPDF) {
        const errorMsg = "A biblioteca de exportação (jsPDF) não foi encontrada. Verifique a conexão com a internet ou se há bloqueadores de script.";
        console.error(errorMsg);
        alert(errorMsg);
        return;
    }
    
    const doc = new jsPDF();
    
    if (typeof (doc as any).autoTable !== 'function') {
        const errorMsg = "O plugin de exportação de tabela (jsPDF-AutoTable) não foi encontrado. Verifique a conexão com a internet ou se há bloqueadores de script.";
        console.error(errorMsg);
        alert(errorMsg);
        return;
    }

    const page_width = doc.internal.pageSize.getWidth();
    const margin = 15;
    let cursor = 20;

    // --- Header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(minutes.cabecalho.titulo, page_width / 2, cursor, { align: "center" });
    cursor += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${minutes.cabecalho.dataHora} | ${minutes.cabecalho.plataforma}`, page_width / 2, cursor, { align: "center" });
    cursor += 15;

    // --- Sections ---
    const addSection = (title: string, body: () => void) => {
        if(cursor > 260) {
            doc.addPage();
            cursor = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(title, margin, cursor);
        cursor += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        body();
    }
    
    addSection("Participantes", () => {
        minutes.participantes.forEach(p => {
            doc.text(`• ${p}`, margin + 5, cursor);
            cursor += 7;
        });
        cursor += 5;
    });

    addSection("Resumo da Discussão", () => {
        const summaryLines = doc.splitTextToSize(minutes.resumo, page_width - (margin * 2));
        doc.text(summaryLines, margin, cursor);
        cursor += summaryLines.length * 5 + 5;
    });

    addSection("Decisões", () => {
        if (minutes.decisoes.length > 0) {
            (doc as any).autoTable({
                startY: cursor,
                head: [['Decisão', 'Definido Por']],
                body: minutes.decisoes.map(d => [d.texto, d.por]),
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] },
            });
            cursor = (doc as any).autoTable.previous.finalY + 10;
        } else {
            doc.text("Nenhuma decisão registrada.", margin, cursor);
            cursor += 10;
        }
    });

    addSection("Ações e Responsabilidades", () => {
        if (minutes.acoes.length > 0) {
            (doc as any).autoTable({
                startY: cursor,
                head: [['Ação', 'Responsável', 'Prazo']],
                body: minutes.acoes.map(a => [a.texto, a.por, a.prazo || 'N/D']),
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] },
            });
            cursor = (doc as any).autoTable.previous.finalY + 10;
        } else {
            doc.text("Nenhuma ação registrada.", margin, cursor);
            cursor += 10;
        }
    });
    
    addSection("Encerramento", () => {
        const endLines = doc.splitTextToSize(minutes.encerramento, page_width - (margin * 2));
        doc.setFont("helvetica", "italic");
        doc.text(endLines, margin, cursor);
    });

    doc.save(`${slugify(minutes.cabecalho.titulo)}.pdf`);
};