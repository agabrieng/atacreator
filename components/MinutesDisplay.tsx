import React, { useState, useCallback, useEffect } from 'react';
import type { MeetingMinutes } from '../types';
import { exportToDocx, exportToPdf } from '../services/exportService';
import { CheckIcon, ClipboardIcon, UsersIcon, TargetIcon, CheckCircleIcon, CalendarIcon, FileTextIcon, InfoIcon, DownloadIcon } from './icons';

interface MinutesDisplayProps {
  minutes: MeetingMinutes | null;
}

const MinutesDisplay: React.FC<MinutesDisplayProps> = ({ minutes }) => {
    const [copied, setCopied] = useState(false);
    const [isFileSaverReady, setIsFileSaverReady] = useState(false);
    const [isPdfReady, setIsPdfReady] = useState(false);

    useEffect(() => {
        const checkLibs = () => {
            const fsReady = !!(window as any).saveAs;
            // Check that the autotable plugin has attached itself to the jsPDF prototype
            const pdfReady = typeof (window as any).jspdf?.jsPDF?.API?.autoTable === 'function';

            if (fsReady) setIsFileSaverReady(true);
            if (pdfReady) setIsPdfReady(true);

            return fsReady && pdfReady;
        };
        
        if (checkLibs()) {
            return;
        }

        const interval = setInterval(() => {
            if (checkLibs()) {
                clearInterval(interval);
            }
        }, 200);

        return () => clearInterval(interval);
    }, []);

    const generatePlainText = useCallback(() => {
        if (!minutes) return '';
        
        let text = `ATA DE REUNIÃO\n`;
        text += `==================================\n\n`;
        text += `Título: ${minutes.cabecalho.titulo}\n`;
        text += `Data/Hora: ${minutes.cabecalho.dataHora}\n`;
        text += `Plataforma: ${minutes.cabecalho.plataforma}\n\n`;
        
        text += `PARTICIPANTES\n`;
        text += `----------------------------------\n`;
        minutes.participantes.forEach(p => text += `- ${p}\n`);
        text += `\n`;

        text += `RESUMO DA DISCUSSÃO\n`;
        text += `----------------------------------\n`;
        text += `${minutes.resumo}\n\n`;

        text += `DECISÕES\n`;
        text += `----------------------------------\n`;
        if (minutes.decisoes.length > 0) {
            minutes.decisoes.forEach(d => text += `- ${d.texto} (Por: ${d.por})\n`);
        } else {
            text += `Nenhuma decisão registrada.\n`;
        }
        text += `\n`;

        text += `AÇÕES E RESPONSABILIDADES\n`;
        text += `----------------------------------\n`;
        if (minutes.acoes.length > 0) {
            minutes.acoes.forEach(a => {
                text += `- ${a.texto} (Responsável: ${a.por}${a.prazo ? `, Prazo: ${a.prazo}` : ''})\n`;
            });
        } else {
            text += `Nenhuma ação registrada.\n`;
        }
        text += `\n`;
        
        text += `ENCERRAMENTO\n`;
        text += `----------------------------------\n`;
        text += `${minutes.encerramento}\n`;
        
        return text;
    }, [minutes]);


    const handleCopy = useCallback(() => {
        if (!minutes) return;
        const textToCopy = generatePlainText();
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [generatePlainText, minutes]);

    const handleExportDocx = useCallback(() => {
        if (!minutes) return;
        try {
            exportToDocx(minutes);
        } catch (error) {
            console.error("Erro ao exportar para DOCX:", error);
            alert("Ocorreu um erro ao gerar o arquivo DOCX.");
        }
    }, [minutes]);

    const handleExportPdf = useCallback(() => {
        if (!minutes) return;
        try {
            exportToPdf(minutes);
        } catch (error) {
            console.error("Erro ao exportar para PDF:", error);
            alert("Ocorreu um erro ao gerar o arquivo PDF.");
        }
    }, [minutes]);


  if (!minutes) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
        <FileTextIcon className="w-20 h-20 mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-xl font-semibold">Aguardando Geração da Ata</h3>
        <p className="max-w-md mt-2">Preencha os detalhes da reunião e cole a transcrição ao lado para começar.</p>
      </div>
    );
  }

  return (
    <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none relative">
        <div className="absolute top-0 right-0 flex space-x-2">
            <button onClick={handleCopy} title="Copiar para área de transferência" className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-md bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800">
                {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleExportDocx}
              disabled={!isFileSaverReady} 
              title={isFileSaverReady ? "Exportar para DOCX" : "Aguardando FileSaver.js..."}
              className={`p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-md bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-wait ${!isFileSaverReady ? 'animate-pulse' : ''}`}>
                <DownloadIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={handleExportPdf}
              disabled={!isPdfReady}
              title={isPdfReady ? "Exportar para PDF" : "Aguardando bibliotecas de PDF..."}
              className={`p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-md bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-wait ${!isPdfReady ? 'animate-pulse' : ''}`}>
                <DownloadIcon className="w-5 h-5 text-red-500" />
            </button>
        </div>


      <div className="text-center mb-6 border-b pb-4 dark:border-gray-600">
        <h1 className="text-2xl font-bold mb-1">{minutes.cabecalho.titulo}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {minutes.cabecalho.dataHora} | {minutes.cabecalho.plataforma}
        </p>
      </div>

      <section>
        <h2 className="flex items-center text-lg font-semibold mb-3"><UsersIcon className="w-5 h-5 mr-2" />Participantes</h2>
        <ul className="list-disc list-inside">
          {minutes.participantes.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </section>

      <section>
        <h2 className="flex items-center text-lg font-semibold mt-6 mb-3"><InfoIcon className="w-5 h-5 mr-2" />Resumo da Discussão</h2>
        <p>{minutes.resumo}</p>
      </section>

      <section>
        <h2 className="flex items-center text-lg font-semibold mt-6 mb-3"><CheckCircleIcon className="w-5 h-5 mr-2" />Decisões</h2>
        {minutes.decisoes.length > 0 ? (
          <ul className="space-y-2">
            {minutes.decisoes.map((d, i) => (
              <li key={i} className="flex items-start">
                <CheckCircleIcon className="w-4 h-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                <span><strong>{d.por}:</strong> {d.texto}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-gray-500 italic">Nenhuma decisão registrada.</p>}
      </section>
      
      <section>
        <h2 className="flex items-center text-lg font-semibold mt-6 mb-3"><TargetIcon className="w-5 h-5 mr-2" />Ações e Responsabilidades</h2>
        {minutes.acoes.length > 0 ? (
          <ul className="space-y-3">
            {minutes.acoes.map((a, i) => (
              <li key={i} className="flex flex-col p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                <div className="flex items-start font-medium">
                  <TargetIcon className="w-4 h-4 mr-2 mt-1 text-blue-500 flex-shrink-0" />
                  <span>{a.texto}</span>
                </div>
                <div className="pl-6 text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <span><strong>Responsável:</strong> {a.por}</span>
                  {a.prazo && <span className="ml-4 flex items-center"><CalendarIcon className="w-4 h-4 mr-1"/><strong>Prazo:</strong> {a.prazo}</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-gray-500 italic">Nenhuma ação registrada.</p>}
      </section>

      <section className="mt-8 pt-4 border-t dark:border-gray-600">
        <p className="text-sm text-gray-600 dark:text-gray-400 italic">{minutes.encerramento}</p>
      </section>
    </div>
  );
};

export default MinutesDisplay;