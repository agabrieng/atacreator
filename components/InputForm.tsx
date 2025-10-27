
import React, { useRef, useState, useEffect } from 'react';
import { PlayIcon, SparklesIcon, XIcon, UploadCloudIcon, SettingsIcon, PlusIcon, TrashIcon } from './icons';
import type { AdminSettings, Participant } from '../types';
import SettingsPanel from './SettingsPanel';
import CollapsibleSection from './CollapsibleSection';

interface InputFormProps {
  adminSettings: AdminSettings;
  setAdminSettings: (value: AdminSettings) => void;
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
  participantes: Participant[];
  setParticipantes: (value: Participant[]) => void;
  vttContent: string;
  setVttContent: (value: string) => void;
  onGenerate: () => void;
  onUseSample: () => void;
  onClear: () => void;
  isLoading: boolean;
}

const FormInput: React.FC<{ label: string; id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }> = ({ label, id, value, onChange, placeholder }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-600 dark:text-gray-300">
          {label}
        </label>
        <input
          id={id}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
    </div>
);


const InputForm: React.FC<InputFormProps> = (props) => {
  const { onGenerate, onUseSample, onClear, isLoading, participantes, setParticipantes, vttContent, setVttContent } = props;
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
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Por favor, selecione um arquivo .docx válido.');
      if (event.target) event.target.value = '';
      return;
    }
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
    if (event.target) event.target.value = '';
  };

  const addParticipant = () => {
    setParticipantes([...participantes, { id: Date.now().toString(), empresa: '', nome: '', email: '', status: 'P' }]);
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const newParticipants = [...participantes];
    (newParticipants[index] as any)[field] = value;
    setParticipantes(newParticipants);
  };
  
  const removeParticipant = (id: string) => {
    setParticipantes(participantes.filter(p => p.id !== id));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Informações da Ata</h2>
        <button onClick={() => setIsSettingsOpen(true)} className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
            <SettingsIcon className="w-5 h-5 mr-2" />
            Configurações
        </button>
      </div>
      
      <CollapsibleSection title="1. Detalhes do Cabeçalho" defaultOpen={true}>
        <FormInput label="Empreendimento" id="empreendimento" value={props.empreendimento} onChange={(e) => props.setEmpreendimento(e.target.value)} placeholder="Nome do projeto ou obra" />
        <FormInput label="Área" id="area" value={props.area} onChange={(e) => props.setArea(e.target.value)} placeholder="Departamento ou setor responsável" />
        <FormInput label="Título do Documento" id="titulo" value={props.titulo} onChange={(e) => props.setTitulo(e.target.value)} placeholder="Ex: ATA DE REUNIÃO" />
        <FormInput label="Contrato" id="contrato" value={props.contrato} onChange={(e) => props.setContrato(e.target.value)} placeholder="Número ou nome do contrato" />
        <FormInput label="Assunto" id="assunto" value={props.assunto} onChange={(e) => props.setAssunto(e.target.value)} placeholder="Assunto principal da reunião" />
        <FormInput label="Local" id="local" value={props.local} onChange={(e) => props.setLocal(e.target.value)} placeholder="Ex: Microsoft Teams, Sala de Reunião A" />
      </CollapsibleSection>
      
      <CollapsibleSection title="2. Participantes" defaultOpen={true}>
        <div className="space-y-3">
            {participantes.map((p, index) => (
                <div key={p.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border dark:border-gray-700 rounded-md relative">
                    <button onClick={() => removeParticipant(p.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                    <FormInput label="Empresa" id={`p-empresa-${p.id}`} value={p.empresa} onChange={(e) => updateParticipant(index, 'empresa', e.target.value)} />
                    <FormInput label="Nome" id={`p-nome-${p.id}`} value={p.nome} onChange={(e) => updateParticipant(index, 'nome', e.target.value)} />
                    <FormInput label="E-mail" id={`p-email-${p.id}`} value={p.email} onChange={(e) => updateParticipant(index, 'email', e.target.value)} />
                    <div>
                        <label htmlFor={`p-status-${p.id}`} className="block text-sm font-medium text-gray-600 dark:text-gray-300">Status</label>
                        <select id={`p-status-${p.id}`} value={p.status} onChange={(e) => updateParticipant(index, 'status', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="P">P - Presença</option>
                            <option value="A">A - Ausência</option>
                            <option value="PA">PA - Presença com Atraso</option>
                            <option value="AJ">AJ - Ausência Justificada</option>
                        </select>
                    </div>
                </div>
            ))}
        </div>
        <button onClick={addParticipant} className="mt-3 inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800">
            <PlusIcon className="w-5 h-5 mr-2" />
            Adicionar Participante
        </button>
      </CollapsibleSection>

      <CollapsibleSection title="3. Transcrição da Reunião" defaultOpen={true}>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Cole o conteúdo da transcrição ou importe um arquivo DOCX.
        </p>
        <textarea
          value={vttContent}
          onChange={(e) => setVttContent(e.target.value)}
          placeholder="Cole a transcrição ou use o botão de importação..."
          className="w-full h-48 p-3 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-y"
        />
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" aria-hidden="true" />
      </CollapsibleSection>

      <div className="space-y-3 pt-4 border-t dark:border-gray-700">
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
        >
          <SparklesIcon className="-ml-1 mr-3 h-5 w-5" />
          {isLoading ? 'Gerando...' : 'Gerar Ata com IA'}
        </button>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || !isMammothReady} title={!isMammothReady ? "Aguardando..." : "Importar .docx"} className={`sm:col-span-1 col-span-2 inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 ${!isMammothReady && !isLoading ? 'animate-pulse' : ''}`}>
            <UploadCloudIcon className="-ml-1 mr-2 h-5 w-5" />
            {isMammothReady ? 'Importar DOCX' : 'Carregando...'}
          </button>
          <button onClick={onUseSample} disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
            <PlayIcon className="-ml-1 mr-2 h-5 w-5" />
            Exemplo
          </button>
          <button onClick={onClear} disabled={isLoading} title="Limpar campos" className="inline-flex items-center justify-center p-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {isSettingsOpen && <SettingsPanel settings={props.adminSettings} onSave={props.setAdminSettings} onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
};

export default InputForm;
