

import React, { useRef, useState, useEffect } from 'react';
import { SparklesIcon, XIcon, UploadCloudIcon, SettingsIcon, PlusIcon, DownloadCloudIcon } from './icons';
import type { AdminSettings } from '../types';
import SettingsPanel from './SettingsPanel';
import CollapsibleSection from './CollapsibleSection';

interface InputFormProps {
  companyProfiles: Record<string, AdminSettings>;
  currentCompanyName: string;
  onSettingsSave: (profiles: Record<string, AdminSettings>, currentCompany: string) => void;
  empreendimento: string;
  setEmpreendimento: (value: string) => void;
  area: string;
  setArea: (value: string) => void;
  titulo: string;
  setTitulo: (value: string) => void;
  contrato: string;
  setContrato: (value: string) => void;
  assunto: string;
  setAssunto: (value: string) => void;
  local: string;
  setLocal: (value: string) => void;
  vttContent: string;
  setVttContent: (value: string) => void;
  onGenerate: () => void;
  onClear: () => void;
  isLoading: boolean;
  isEditing: boolean;
  onOpenLoadPanel: () => void;
}

const FormInput: React.FC<{ label: string; id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void; }> = ({ label, id, value, onChange, placeholder, onBlur }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-600 dark:text-gray-300">
          {label}
        </label>
        <input
          id={id}
          type="text"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
    </div>
);


const InputForm: React.FC<InputFormProps> = (props) => {
  const { onGenerate, onClear, isLoading, isEditing, vttContent, setVttContent, onOpenLoadPanel } = props;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMammothReady, setIsMammothReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if ((window as any).mammoth) setIsMammothReady(true);
    else {
        const interval = setInterval(() => {
            if ((window as any).mammoth) {
                setIsMammothReady(true);
                clearInterval(interval);
            }
        }, 200);
        return () => clearInterval(interval);
    }
  }, []);

  const handleContratoBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const contrato = e.target.value.trim();
    if (!contrato) return;
    try {
      const savedHeadersStr = localStorage.getItem('ata-header-data');
      if (savedHeadersStr) {
        const savedHeaders = JSON.parse(savedHeadersStr);
        const data = savedHeaders[contrato];
        if (data) {
          props.setEmpreendimento(data.empreendimento || '');
          props.setArea(data.area || '');
          props.setTitulo(data.titulo || '');
          props.setAssunto(data.assunto || '');
          props.setLocal(data.local || '');
        }
      }
    } catch (err) {
      console.error("Failed to load header data from localStorage", err);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        try {
          const mammoth = (window as any).mammoth;
          if (!mammoth) throw new Error('A biblioteca Mammoth.js não está carregada.');
          const result = await mammoth.extractRawText({ arrayBuffer });
          setVttContent(result.value);
        } catch (error) {
          console.error('Erro ao extrair texto do DOCX:', error);
          alert('Ocorreu um erro ao processar o arquivo DOCX.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith('.vtt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = e.target?.result as string;
        setVttContent(textContent);
      };
      reader.readAsText(file);
    } else {
      alert('Por favor, selecione um arquivo .docx ou .vtt válido.');
    }
    
    if (event.target) event.target.value = '';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Informações da Ata</h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={onOpenLoadPanel} 
            disabled={isEditing}
            title={isEditing ? "Conclua a edição para poder carregar" : "Carregar Ata da Nuvem"}
            className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
              <DownloadCloudIcon className="w-5 h-5 mr-2" />
              Carregar
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
              <SettingsIcon className="w-5 h-5 mr-2" />
              Configurações
          </button>
        </div>
      </div>
      
      <CollapsibleSection title="1. Detalhes do Cabeçalho" defaultOpen={true}>
        <FormInput label="Empreendimento" id="empreendimento" value={props.empreendimento} onChange={(e) => props.setEmpreendimento(e.target.value)} placeholder="Nome do projeto ou obra" />
        <FormInput label="Área" id="area" value={props.area} onChange={(e) => props.setArea(e.target.value)} placeholder="Departamento ou setor responsável" />
        <FormInput label="Título do Documento" id="titulo" value={props.titulo} onChange={(e) => props.setTitulo(e.target.value)} placeholder="Ex: ATA DE REUNIÃO" />
        <FormInput label="Contrato" id="contrato" value={props.contrato} onChange={(e) => props.setContrato(e.target.value)} placeholder="Número ou nome do contrato" onBlur={handleContratoBlur} />
        <FormInput label="Assunto" id="assunto" value={props.assunto} onChange={(e) => props.setAssunto(e.target.value)} placeholder="Assunto principal da reunião" />
        <FormInput label="Local" id="local" value={props.local} onChange={(e) => props.setLocal(e.target.value)} placeholder="Ex: Microsoft Teams, Sala de Reunião A" />
      </CollapsibleSection>

      <CollapsibleSection title="2. Transcrição da Reunião" defaultOpen={true}>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Cole o conteúdo da transcrição ou importe um arquivo DOCX ou VTT.
        </p>
        <textarea
          value={vttContent}
          onChange={(e) => setVttContent(e.target.value)}
          placeholder="Cole a transcrição ou use o botão de importação..."
          className="w-full h-48 p-3 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-y"
        />
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.vtt,text/vtt" className="hidden" aria-hidden="true" />
      </CollapsibleSection>

      <div className="space-y-3 pt-4 border-t dark:border-gray-700">
        <button
          onClick={onGenerate}
          disabled={isLoading || isEditing}
          title={isEditing ? "Conclua a edição para gerar uma nova ata." : "Gerar Ata com IA"}
          className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
        >
          <SparklesIcon className="-ml-1 mr-3 h-5 w-5" />
          {isLoading ? 'Gerando...' : 'Gerar Ata com IA'}
        </button>
        <div className="flex gap-3">
          <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || !isMammothReady} title={!isMammothReady ? "Aguardando..." : "Importar arquivo .docx ou .vtt"} className={`flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 ${!isMammothReady && !isLoading ? 'animate-pulse' : ''}`}>
            <UploadCloudIcon className="-ml-1 mr-2 h-5 w-5" />
            {isMammothReady ? 'Importar Arquivo' : 'Carregando...'}
          </button>
          <button onClick={onClear} disabled={isLoading} title="Iniciar uma nova ata e limpar todos os campos" className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            <span>Nova Ata</span>
          </button>
        </div>
      </div>
      
      {isSettingsOpen && <SettingsPanel allProfiles={props.companyProfiles} currentCompanyName={props.currentCompanyName} onSave={props.onSettingsSave} onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
};

export default InputForm;