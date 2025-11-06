import React, { useRef, useState, useEffect } from 'react';
import { SparklesIcon, XIcon, UploadCloudIcon, SettingsIcon, PlusIcon, DownloadCloudIcon, EditIcon, ChevronLeftIcon, ChevronRightIcon, CalendarCheckIcon, SendIcon } from './icons';
import type { AdminSettings, Empreendimento } from '../types';
import SettingsPanel from './SettingsPanel';
import CollapsibleSection from './CollapsibleSection';

interface InputFormProps {
  companyProfiles: Record<string, AdminSettings>;
  currentCompanyName: string;
  onSettingsSave: (profiles: Record<string, AdminSettings>, currentCompany: string) => void;
  empreendimento: string;
  setEmpreendimento: (value: string) => void;
  empreendimentos: Empreendimento[];
  isProjectsLoading: boolean;
  onOpenProjectPanel: () => void;
  area: string;
  setArea: (value: string) => void;
  titulo: string;
  setTitulo: (value: string) => void;
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
  isGenerateDisabled: boolean;
  onOpenLoadPanel: () => void;
  onOpenDeadlinePanel: () => void;
  onOpenWebhookPanel: () => void;
  isAtaGenerated: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const FormInput: React.FC<{ label: string; id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; }> = ({ label, id, value, onChange, placeholder }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-600 dark:text-slate-300">
          {label}
        </label>
        <input
          id={id}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
    </div>
);


const InputForm: React.FC<InputFormProps> = (props) => {
  const { onGenerate, onClear, isLoading, isEditing, vttContent, setVttContent, onOpenLoadPanel, onOpenDeadlinePanel, onOpenWebhookPanel, isAtaGenerated, isCollapsed, onToggleCollapse, isGenerateDisabled } = props;
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
  
  let generateButtonTitle = "Gerar Ata com IA";
  if (isGenerateDisabled) {
    if (isEditing) {
      generateButtonTitle = "Conclua a edição para gerar uma nova ata.";
    } else if (isLoading) {
      generateButtonTitle = "Gerando...";
    } else {
      generateButtonTitle = "Preencha todos os campos do cabeçalho e da transcrição para habilitar.";
    }
  }

  if (isCollapsed) {
    return (
        <div className="h-full flex items-start justify-center lg:sticky top-8 pt-6">
            <button
                onClick={onToggleCollapse}
                title="Expandir Painel de Informações"
                className="group w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900"
                aria-label="Expandir painel"
            >
                <ChevronRightIcon className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors" />
            </button>
        </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Informações da Ata</h2>
        <div className="flex items-center gap-2">
            {isAtaGenerated && (
                <button
                    onClick={onToggleCollapse}
                    className="group w-8 h-8 flex items-center justify-center bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-full transition-colors"
                    title="Recolher Painel"
                >
                    <ChevronLeftIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </button>
            )}
           <button 
            onClick={onOpenDeadlinePanel} 
            title="Abrir painel de controle de prazos"
            className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
              <CalendarCheckIcon className="w-5 h-5 mr-2" />
              Prazos
          </button>
           <button 
            onClick={onOpenWebhookPanel} 
            title="Gerenciar webhooks do Microsoft Teams"
            className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
              <SendIcon className="w-5 h-5 mr-2" />
              Webhooks
          </button>
          <button 
            onClick={onOpenLoadPanel} 
            disabled={isEditing}
            title={isEditing ? "Conclua a edição para poder carregar" : "Carregar Ata Salva da Nuvem"}
            className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
              <DownloadCloudIcon className="w-5 h-5 mr-2" />
              Carregar
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">
              <SettingsIcon className="w-5 h-5 mr-2" />
              Config.
          </button>
        </div>
      </div>
      
      <CollapsibleSection title="1. Detalhes do Cabeçalho" defaultOpen={true}>
        <div>
            <label htmlFor="empreendimento" className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                Empreendimento
            </label>
            <div className="mt-1 flex items-center gap-2">
                <select
                    id="empreendimento"
                    value={props.empreendimento}
                    onChange={(e) => props.setEmpreendimento(e.target.value)}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-75"
                    disabled={props.isProjectsLoading}
                >
                    <option value="">{props.isProjectsLoading ? 'Carregando...' : 'Selecione um empreendimento'}</option>
                    {props.empreendimentos.map((proj) => (
                        <option key={proj.id} value={proj.name}>
                        {proj.name}
                        </option>
                    ))}
                </select>
                <button type="button" onClick={props.onOpenProjectPanel} title="Gerenciar Empreendimentos" className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md border border-slate-300 dark:border-slate-600">
                    <EditIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
            </div>
        </div>
        <FormInput label="Área" id="area" value={props.area} onChange={(e) => props.setArea(e.target.value)} placeholder="Departamento ou setor responsável" />
        <FormInput label="Título do Documento" id="titulo" value={props.titulo} onChange={(e) => props.setTitulo(e.target.value)} placeholder="Ex: ATA DE REUNIÃO" />
        <FormInput label="Assunto" id="assunto" value={props.assunto} onChange={(e) => props.setAssunto(e.target.value)} placeholder="Assunto principal da reunião" />
        <FormInput label="Local" id="local" value={props.local} onChange={(e) => props.setLocal(e.target.value)} placeholder="Ex: Microsoft Teams, Sala de Reunião A" />
      </CollapsibleSection>

      <CollapsibleSection title="2. Transcrição da Reunião" defaultOpen={true}>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cole o conteúdo da transcrição ou importe um arquivo DOCX ou VTT.
        </p>
        <textarea
          value={vttContent}
          onChange={(e) => setVttContent(e.target.value)}
          placeholder="Cole a transcrição ou use o botão de importação..."
          className="w-full h-48 p-3 font-mono text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-y"
        />
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.vtt,text/vtt" className="hidden" aria-hidden="true" />
        <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || !isMammothReady} title={!isMammothReady ? "Aguardando..." : "Importar arquivo .docx ou .vtt"} className={`inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 ${!isMammothReady && !isLoading ? 'animate-pulse' : ''}`}>
          <UploadCloudIcon className="-ml-1 mr-2 h-5 w-5" />
          {isMammothReady ? 'Importar Arquivo' : 'Carregando...'}
        </button>
      </CollapsibleSection>

      <div className="space-y-3 pt-4 border-t dark:border-slate-700">
        <button
          onClick={onGenerate}
          disabled={isGenerateDisabled}
          title={generateButtonTitle}
          className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed dark:focus:ring-offset-slate-800"
        >
          <SparklesIcon className="-ml-1 mr-3 h-5 w-5" />
          {isLoading ? 'Gerando...' : 'Gerar Ata com IA'}
        </button>
        <div className="flex gap-3">
          <button 
            onClick={onClear} 
            disabled={isLoading || !isAtaGenerated} 
            title={isAtaGenerated ? "Limpar campos e ata gerada para iniciar uma nova" : "Gere ou carregue uma ata para habilitar esta opção"} 
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-slate-800 disabled:opacity-50"
          >
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