import React, { useRef, useState, useEffect } from 'react';
import { PlayIcon, SparklesIcon, XIcon, UploadCloudIcon } from './icons';

interface TranscriptInputProps {
  vttContent: string;
  setVttContent: (value: string) => void;
  meetingTitle: string;
  setMeetingTitle: (value: string) => void;
  onGenerate: () => void;
  onUseSample: () => void;
  onClear: () => void;
  isLoading: boolean;
}

const TranscriptInput: React.FC<TranscriptInputProps> = ({
  vttContent,
  setVttContent,
  meetingTitle,
  setMeetingTitle,
  onGenerate,
  onUseSample,
  onClear,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMammothReady, setIsMammothReady] = useState(false);

  useEffect(() => {
    // Check if mammoth is already available on component mount
    if ((window as any).mammoth) {
      setIsMammothReady(true);
      return;
    }

    // If not, poll for it to handle slow network loading
    const interval = setInterval(() => {
      if ((window as any).mammoth) {
        setIsMammothReady(true);
        clearInterval(interval);
      }
    }, 200);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Por favor, selecione um arquivo .docx válido.');
      if (event.target) event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (arrayBuffer) {
        try {
          const mammoth = (window as any).mammoth;
          if (!mammoth) {
            console.error('A biblioteca Mammoth.js não está carregada.');
            alert('Ocorreu um erro ao carregar a funcionalidade de importação de DOCX. Por favor, verifique sua conexão com a internet e tente novamente.');
            return;
          }
          const result = await mammoth.extractRawText({ arrayBuffer });
          setVttContent(result.value);
        } catch (error) {
          console.error('Erro ao extrair texto do DOCX:', error);
          alert('Ocorreu um erro ao processar o arquivo DOCX.');
        }
      }
    };
    reader.onerror = () => {
      alert('Falha ao ler o arquivo.');
    };
    reader.readAsArrayBuffer(file);
    if (event.target) event.target.value = '';
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">1. Detalhes da Reunião</h2>
        <label htmlFor="meeting-title" className="block text-sm font-medium text-gray-600 dark:text-gray-300">
          Título da Reunião
        </label>
        <input
          id="meeting-title"
          type="text"
          value={meetingTitle}
          onChange={(e) => setMeetingTitle(e.target.value)}
          placeholder="Ex: Reunião Semanal de Sincronização"
          className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">2. Forneça a Transcrição</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Cole o conteúdo da transcrição ou importe um arquivo DOCX.
        </p>
        <textarea
          value={vttContent}
          onChange={(e) => setVttContent(e.target.value)}
          placeholder="Cole a transcrição ou use o botão de importação..."
          className="w-full h-64 p-3 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-y"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          aria-hidden="true"
        />
      </div>

      <div className="space-y-3">
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
        >
          <SparklesIcon className="-ml-1 mr-3 h-5 w-5" />
          {isLoading ? 'Gerando...' : 'Gerar Ata com IA'}
        </button>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            onClick={handleImportClick}
            disabled={isLoading || !isMammothReady}
            title={!isMammothReady ? "Aguardando o carregamento do importador de DOCX..." : "Importar arquivo .docx"}
            className={`sm:col-span-1 col-span-2 inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${!isMammothReady && !isLoading ? 'animate-pulse' : ''}`}
          >
            <UploadCloudIcon className="-ml-1 mr-2 h-5 w-5" />
            {isMammothReady ? 'Importar DOCX' : 'Carregando...'}
          </button>
          <button
            onClick={onUseSample}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <PlayIcon className="-ml-1 mr-2 h-5 w-5" />
            Exemplo
          </button>
          <button
            onClick={onClear}
            disabled={isLoading}
            title="Limpar campos"
            className="inline-flex items-center justify-center p-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranscriptInput;