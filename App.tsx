

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { AtaData, AdminSettings, Participant, PautaItem, Empreendimento, Webhook, Projetista } from './types';
import { generateAtaData } from './services/geminiService';
import { 
    saveAtaToFirebase, 
    getEmpreendimentos, 
    addEmpreendimento, 
    updateEmpreendimento, 
    deleteEmpreendimento,
    getWebhooks,
    addWebhook,
    updateWebhook,
    deleteWebhook,
    getProjetistas,
    addProjetista,
    updateProjetista,
    deleteProjetista
} from './services/firebaseService';
import { exportToPdf } from './services/exportService';
import Header from './components/Header';
import InputForm from './components/InputForm';
import MinutesDisplay from './components/MinutesDisplay';
import Loader from './components/Loader';
import ConfirmationDialog from './components/ConfirmationDialog';
import SavedAtasPanel from './components/SavedAtasPanel';
import EmpreendimentosPanel from './components/EmpreendimentosPanel';
import DeadlinePanel from './components/DeadlinePanel';
import WebhookPanel from './components/WebhookPanel';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SettingsPanel from './components/SettingsPanel';
import AtaRepositoryView from './components/AtaRepository';
import ProjectControlView from './components/ProjectControlView';
import ProjectDashboardView from './components/ProjectDashboardView';
import ProjetistasPanel from './components/ProjetistasPanel';
import { AlertTriangleIcon, EditIcon, CheckIcon, CopyIcon, UploadCloudIcon, DownloadCloudIcon, FilePdfIcon, CheckCircleIcon, XIcon, CalendarCheckIcon, SettingsIcon, SendIcon, BriefcaseIcon } from './components/icons';

const DEFAULT_COMPANY_NAME = "Minha Empresa";
const DEFAULT_SETTINGS: AdminSettings = {
    companyName: DEFAULT_COMPANY_NAME,
    companyLogo: null,
    docNumber: 'FM-GCO-RM2-002',
    revision: '00',
    propertyInfo: 'AS INFORMAÇÕES DESTE DOCUMENTO SÃO DE PROPRIEDADE DA SUA EMPRESA, SENDO PROIBIDA A UTILIZAÇÃO FORA DA SUA FINALIDADE.',
};

type View = 'dashboard' | 'ataCreator' | 'ataRepository' | 'deadlinePanel' | 'settings' | 'projectControl' | 'projectDashboard';

const ActionButton: React.FC<{
    onClick?: () => void;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
    className?: string;
}> = ({ onClick, disabled, title, children, className }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
        {children}
    </button>
);

// Toast Component for feedback
interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const isSuccess = type === 'success';

  const bgColor = isSuccess ? 'bg-green-100 dark:bg-green-900/95' : 'bg-red-100 dark:bg-red-900/95';
  const borderColor = isSuccess ? 'border-green-400 dark:border-green-700' : 'border-red-400 dark:border-red-700';
  const textColor = isSuccess ? 'text-green-800 dark:text-green-100' : 'text-red-800 dark:text-red-100';
  const Icon = isSuccess ? CheckCircleIcon : AlertTriangleIcon;
  const iconColor = isSuccess ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';

  return (
    <div className="fixed top-8 right-8 z-50 animate-fade-in-down" role="alert">
      <div className={`flex items-center p-4 rounded-lg shadow-lg border ${bgColor} ${borderColor} ${textColor}`}>
        <div className="flex-shrink-0">
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button onClick={onClose} className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSuccess ? 'hover:bg-green-200/50 dark:hover:bg-green-800/50 focus:ring-green-600 focus:ring-offset-green-100 dark:focus:ring-offset-slate-900' : 'hover:bg-red-200/50 dark:hover:bg-red-800/50 focus:ring-red-600 focus:ring-offset-red-100 dark:focus:ring-offset-slate-900'}`}>
              <span className="sr-only">Fechar</span>
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const AtaCreatorView: React.FC<{
    initialAta?: AtaData | null;
    onAtaViewed?: () => void;
    companyProfiles: Record<string, AdminSettings>;
    currentCompanyName: string;
    setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
    empreendimentos: Empreendimento[];
}> = ({ initialAta, onAtaViewed, companyProfiles, currentCompanyName, setToast, empreendimentos }) => {
  
  const adminSettings = companyProfiles[currentCompanyName] || null;

  const [empreendimento, setEmpreendimento] = useState('');
  const [area, setArea] = useState('');
  const [titulo, setTitulo] = useState('');
  const [contrato, setContrato] = useState('');
  const [assunto, setAssunto] = useState('');
  const [local, setLocal] = useState('');
  const [vttContent, setVttContent] = useState<string>('');
  
  const [ata, setAta] = useState<AtaData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [showOverwriteConfirmation, setShowOverwriteConfirmation] = useState(false);
  const [showSaveReminder, setShowSaveReminder] = useState(false);
  const [originalLoadedAta, setOriginalLoadedAta] = useState<AtaData | null>(null);
  const [showDeadlineError, setShowDeadlineError] = useState(false);
  const [invalidDeadlineFields, setInvalidDeadlineFields] = useState<Set<string>>(new Set());


  // State for the action toolbar
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExportReady, setIsExportReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // State for collapsible form
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  const hasChanges = useMemo(() => {
    if (!ata) return false;
    // A new, unsaved ata (no id) is considered "changed".
    if (!ata.id) return true;
    // If there's no original state to compare to, but it has an id, something is weird, but we assume it's changed.
    if (!originalLoadedAta) return true;
    // Compare current ata with the last saved/loaded state.
    return JSON.stringify(ata) !== JSON.stringify(originalLoadedAta);
  }, [ata, originalLoadedAta]);
  
    useEffect(() => {
        const checkLibs = () => {
            const fsReady = !!(window as any).saveAs;
            const pdfReady = typeof (window as any).jspdf?.jsPDF?.API?.autoTable === 'function';
            const allReady = fsReady && pdfReady;
            if (allReady) setIsExportReady(true);
            return allReady;
        };
        if (checkLibs()) return;
        const interval = setInterval(() => { if (checkLibs()) clearInterval(interval); }, 200);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const selectedProject = empreendimentos.find(p => p.name === empreendimento);
        if (selectedProject) {
            setContrato(selectedProject.contrato);
            setLocal(selectedProject.local);
    
            // Auto-fill other header data from localStorage cache if available
            if (selectedProject.contrato) {
                try {
                    const savedHeadersStr = localStorage.getItem('ata-header-data');
                    if (savedHeadersStr) {
                        const savedHeaders = JSON.parse(savedHeadersStr);
                        const data = savedHeaders[selectedProject.contrato];
                        if (data) {
                            setArea(data.area || '');
                            setTitulo(data.titulo || '');
                            setAssunto(data.assunto || '');
                        }
                    }
                } catch (err) {
                    console.error("Failed to load header data from localStorage", err);
                }
            }
        }
    }, [empreendimento, empreendimentos]);
    
    const handleSelectSavedAta = useCallback((selectedAta: AtaData) => {
      setAta(selectedAta);
      setOriginalLoadedAta(selectedAta); // Keep a copy for change detection
      setEmpreendimento(selectedAta.empreendimento || '');
      setArea(selectedAta.area || '');
      setTitulo(selectedAta.titulo || '');
      setContrato(selectedAta.contrato || '');
      setAssunto(selectedAta.assunto || '');
      setLocal(selectedAta.local || '');
      setVttContent('');
      setIsEditing(true); // Abrir em modo de edição
      setIsFormCollapsed(true);
    }, []);
    
    // Handle initial ata passed via props
    useEffect(() => {
        if (initialAta) {
            handleSelectSavedAta(initialAta);
            if (onAtaViewed) {
                onAtaViewed();
            }
        }
    }, [initialAta, onAtaViewed, handleSelectSavedAta]);

  
  const handleGenerate = useCallback(async () => {
    if (!adminSettings) {
      setError("As configurações da empresa não foram carregadas. Por favor, verifique as configurações e selecione uma empresa.");
      return;
    }
    
    // Save header data to localStorage for quick recall
    if (contrato.trim()) {
        try {
            const savedHeadersStr = localStorage.getItem('ata-header-data') || '{}';
            const savedHeaders = JSON.parse(savedHeadersStr);
            savedHeaders[contrato.trim()] = { empreendimento, area, titulo, contrato, assunto, local };
            localStorage.setItem('ata-header-data', JSON.stringify(savedHeaders));
        } catch (e) {
            console.error("Failed to save header data to localStorage", e);
        }
    }

    setIsLoading(true);
    setError(null);
    setAta(null);
    setOriginalLoadedAta(null); // Reset loaded ata state
    setIsEditing(false); // Reset editing mode on new generation
    setInvalidDeadlineFields(new Set()); // Clear validation state

    try {
      const generatedPart = await generateAtaData(vttContent, titulo);
      
      const updatedParticipants: Participant[] = [];
      if (generatedPart.participantes) {
        generatedPart.participantes.forEach(geminiParticipant => {
            const trimmedName = geminiParticipant.nome.trim();
            if (trimmedName) {
                updatedParticipants.push({
                    id: `${Date.now()}-${Math.random()}-${trimmedName}`,
                    nome: trimmedName,
                    empresa: geminiParticipant.empresa || '',
                    email: '',
                    status: 'P',
                });
            }
        });
      }

      // Transform the pauta from Gemini's output to the application's data structure
      const finalPauta: PautaItem[] = generatedPart.pauta.map(item => ({
          item: item.item,
          descricao: item.descricao,
          responsaveis: item.responsaveis.map(resp => ({
              id: `${Date.now()}-${Math.random()}-${resp}`,
              responsavel: resp,
              prazo: item.prazo, // Assign the common deadline to each responsible
          }))
      }));

      const finalAta: AtaData = {
        logoUrl: adminSettings.companyLogo,
        empreendimento,
        area,
        titulo,
        numeroDocumento: adminSettings.docNumber,
        revisao: adminSettings.revision,
        contrato,
        assunto,
        local,
        horario: generatedPart.horario,
        data: generatedPart.data,
        participantes: updatedParticipants,
        observacoes: generatedPart.observacoes,
        pauta: finalPauta,
        informacaoPropriedade: adminSettings.propertyInfo,
      };

      setAta(finalAta);
      setIsFormCollapsed(true);

    } catch (err) {
      console.error(err);
      let errorMessage = 'Ocorreu um erro ao gerar a ata. Verifique o console para mais detalhes e tente novamente.';
      if (err instanceof Error) {
        if (err.message === 'API_KEY_MISSING') {
            errorMessage = 'A chave de API não foi encontrada. Verifique se a variável de ambiente API_KEY está configurada no seu ambiente de produção.';
        } else if (err.message.includes('API key not valid')) {
            errorMessage = 'A chave de API do Gemini (configurada na variável de ambiente API_KEY) não é válida. Verifique se a chave está correta e se não foi confundida com a chave do Firebase. A chave para a API do Gemini é diferente e deve ser obtida no Google AI Studio.';
        } else {
            errorMessage = `Erro ao gerar ata: ${err.message}`;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [vttContent, titulo, empreendimento, area, contrato, assunto, local, adminSettings]);
  
  const handleGenerateClick = () => {
    if (ata) {
      setShowOverwriteConfirmation(true);
    } else {
      handleGenerate();
    }
  };

  const onConfirmOverwrite = () => {
      handleGenerate();
      setShowOverwriteConfirmation(false);
  };

  const handleClear = useCallback(() => {
    setEmpreendimento('');
    setArea('');
    setTitulo('');
    setContrato('');
    setAssunto('');
    setLocal('');
    setVttContent('');
    setAta(null);
    setOriginalLoadedAta(null); // Reset loaded ata state
    setError(null);
    setIsEditing(false); // Reset editing state
    setInvalidDeadlineFields(new Set()); // Clear validation state
    setIsFormCollapsed(false);
  }, []);
  
  const onConfirmClear = () => {
      handleClear();
      setShowClearConfirmation(false);
  };

  const handleSave = useCallback(async () => {
    if (!ata) return;
    setIsSaving(true);
    try {
      const docId = await saveAtaToFirebase(ata);
      const savedAta = { ...ata, id: docId };
      setAta(savedAta);
      setOriginalLoadedAta(savedAta); // Always update original state after a save
      setToast({ message: 'Ata salva com sucesso na nuvem!', type: 'success' });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (error: any) {
      console.error("Erro ao salvar a ata no Firebase:", error);
      setToast({ message: `Erro ao salvar a ata: ${error.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [ata, setToast]);
  
  const handleCopy = useCallback(() => {
      if (!ata) return;
      navigator.clipboard.writeText(JSON.stringify(ata, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  }, [ata]);

  const handleToggleEditing = () => {
    // When user wants to FINISH editing
    if (isEditing) {
        if (ata) {
            const missingDeadlines = new Set<string>();
            ata.pauta.forEach((pautaItem, pautaIndex) => {
                pautaItem.responsaveis.forEach(responsavel => {
                    if (!responsavel.prazo || responsavel.prazo.trim() === '') {
                        missingDeadlines.add(`${pautaIndex}-${responsavel.id}`);
                    }
                });
            });

            if (missingDeadlines.size > 0) {
                setInvalidDeadlineFields(missingDeadlines);
                setShowDeadlineError(true);
                return; // Keep editing mode active
            }
        }
        
        // Check if a loaded ata has been modified
        if (originalLoadedAta) {
            if (JSON.stringify(ata) !== JSON.stringify(originalLoadedAta)) {
                setShowSaveReminder(true);
            }
        }
        setIsEditing(false);
        setInvalidDeadlineFields(new Set()); // Clear on successful exit
    } else {
        // When user wants to START editing
        setIsEditing(true);
        setInvalidDeadlineFields(new Set()); // Clear when entering edit mode
    }
  };


  return (
    <>
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className={`grid grid-cols-1 ${ata ? `lg:grid lg:grid-cols-[${isFormCollapsed ? 'auto_1fr' : 'minmax(450px,_5fr)_7fr'}]` : 'lg:grid-cols-2'} gap-8 items-start`}>
            <div className="transition-all duration-300 ease-in-out">
                <InputForm
                    empreendimento={empreendimento} setEmpreendimento={setEmpreendimento}
                    empreendimentos={empreendimentos}
                    area={area} setArea={setArea}
                    titulo={titulo} setTitulo={setTitulo}
                    assunto={assunto} setAssunto={setAssunto}
                    local={local} setLocal={setLocal}
                    vttContent={vttContent} setVttContent={setVttContent}
                    onGenerate={handleGenerateClick}
                    onClear={() => setShowClearConfirmation(true)}
                    isLoading={isLoading}
                    isEditing={isEditing}
                    isGenerateDisabled={isLoading || isEditing || !empreendimento.trim() || !area.trim() || !titulo.trim() || !assunto.trim() || !local.trim() || !vttContent.trim()}
                    isAtaGenerated={!!ata}
                    isCollapsed={isFormCollapsed && !!ata}
                    onToggleCollapse={() => setIsFormCollapsed(!isFormCollapsed)}
                />
            </div>
          <div className="relative lg:sticky top-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 min-h-[calc(100vh-10rem)] transition-all duration-300 ease-in-out">
            {(isLoading && !error) && <Loader />}
            {error && (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <AlertTriangleIcon className="w-16 h-16 mb-4 text-red-500" />
                <h3 className="text-xl font-semibold mb-3 text-slate-800 dark:text-slate-100">Ocorreu um Erro</h3>
                <div className="max-w-2xl w-full bg-red-50 dark:bg-slate-700/50 text-red-700 dark:text-red-300 p-4 rounded-lg text-left font-mono text-sm overflow-auto">
                    <pre className="whitespace-pre-wrap break-words">{error}</pre>
                </div>
              </div>
            )}
            {!isLoading && !error && (
              <>
                {ata && (
                  <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                     <ActionButton
                        onClick={handleToggleEditing}
                        title={isEditing ? "Concluir Edição" : "Editar Ata"}
                        className={isEditing ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-blue-500'}
                    >
                        {isEditing ? <CheckIcon className="w-5 h-5" /> : <EditIcon className="w-5 h-5" />}
                        <span>{isEditing ? "Concluir" : "Editar"}</span>
                    </ActionButton>
                    <ActionButton
                        onClick={handleCopy}
                        disabled={isEditing}
                        title={isEditing ? "Conclua a edição para poder copiar" : "Copiar Dados (JSON)"}
                        className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-blue-500"
                    >
                         {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                        <span>Copiar</span>
                    </ActionButton>
                    <ActionButton
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        title={saveSuccess ? "Ata salva com sucesso!" : !hasChanges ? "Nenhuma alteração para salvar" : isSaving ? "Salvando..." : "Salvar na nuvem"}
                        className={saveSuccess
                            ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-blue-500'
                        }
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" role="status">
                                <span className="sr-only">Salvando...</span>
                            </div>
                        ) : saveSuccess ? (
                            <CheckCircleIcon className="w-5 h-5" />
                        ) : (
                            <UploadCloudIcon className="w-5 h-5" />
                        )}
                        <span>{isSaving ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar na Nuvem'}</span>
                    </ActionButton>
                    <div className="flex-grow"></div>
                    <ActionButton
                        onClick={() => exportToPdf(ata)}
                        disabled={isEditing || !isExportReady}
                        title={isEditing ? "Conclua a edição para exportar" : (isExportReady ? "Exportar para PDF" : "Aguardando bibliotecas de exportação...")}
                        className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                    >
                       <FilePdfIcon className="w-5 h-5" />
                       <span>PDF</span>
                    </ActionButton>
                  </div>
                )}
                <MinutesDisplay ata={ata} setAta={setAta} isEditing={isEditing} invalidDeadlineFields={invalidDeadlineFields} />
              </>
            )}
          </div>
        </div>
      </main>
      <ConfirmationDialog
        isOpen={showClearConfirmation}
        onClose={() => setShowClearConfirmation(false)}
        onConfirm={onConfirmClear}
        title="Iniciar Nova Ata"
      >
        Tem certeza de que deseja limpar todos os campos e começar uma nova ata? Todos os dados não salvos serão perdidos.
        <br/><br/>
        <strong>Dica:</strong> Salve a ata atual antes de limpar, caso queeira recuperá-la mais tarde.
      </ConfirmationDialog>
      <ConfirmationDialog
        isOpen={showOverwriteConfirmation}
        onClose={() => setShowOverwriteConfirmation(false)}
        onConfirm={onConfirmOverwrite}
        title="Gerar Nova Ata"
      >
        Você tem certeza que deseja gerar uma nova ata? A ata atual será descartada e todas as alterações não salvas serão perdidas.
      </ConfirmationDialog>
      <ConfirmationDialog
        isOpen={showSaveReminder}
        onClose={() => setShowSaveReminder(false)}
        onConfirm={() => setShowSaveReminder(false)}
        title="Salvar Alterações"
        icon="info"
        confirmText="Entendido"
        hideCancel={true}
      >
        Você fez alterações nesta ata. Para mantê-las, clique no botão "Salvar na Nuvem".
        As alterações não salvas serão perdidas ao gerar ou carregar uma nova ata.
      </ConfirmationDialog>
      <ConfirmationDialog
        isOpen={showDeadlineError}
        onClose={() => setShowDeadlineError(false)}
        onConfirm={() => setShowDeadlineError(false)}
        title="Prazos Pendentes"
        icon="alert"
        confirmText="Entendido"
        hideCancel={true}
      >
        Todos os responsáveis devem ter um prazo definido. Por favor, preencha as datas pendentes destacadas em vermelho antes de concluir a edição.
      </ConfirmationDialog>
    </>
  );
};

const DeadlineView: React.FC<{ 
    onNavigateToAta: (ata: AtaData) => void;
    adminSettings: AdminSettings | null;
    webhooks: Webhook[];
}> = ({ onNavigateToAta, adminSettings, webhooks }) => {
    return (
        <main className="container mx-auto p-4 md:p-8 h-full">
            <DeadlinePanel
                onSelectAta={onNavigateToAta}
                adminSettings={adminSettings}
                webhooks={webhooks}
            />
        </main>
    );
};

const SettingsView: React.FC<{
    allProfiles: Record<string, AdminSettings>;
    currentCompanyName: string;
    onSave: (profiles: Record<string, AdminSettings>, currentCompany: string) => void;
    setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
    webhooks: Webhook[];
    onAddWebhook: (name: string, url: string) => Promise<void>;
    onUpdateWebhook: (id: string, newName: string, newUrl: string) => Promise<void>;
    onDeleteWebhook: (id: string) => Promise<void>;
    projetistas: Projetista[];
    onAddProjetista: (name: string, logo: string | null) => Promise<void>;
    onUpdateProjetista: (id: string, name: string, logo: string | null) => Promise<void>;
    onDeleteProjetista: (id: string) => Promise<void>;
    empreendimentos: Empreendimento[];
    onAddEmpreendimento: (data: Omit<Empreendimento, 'id'>) => Promise<void>;
    onUpdateEmpreendimento: (id: string, data: Partial<Omit<Empreendimento, 'id'>>) => Promise<void>;
    onDeleteEmpreendimento: (id: string) => Promise<void>;
}> = ({ 
    allProfiles, currentCompanyName, onSave, setToast, 
    webhooks, onAddWebhook, onUpdateWebhook, onDeleteWebhook, 
    projetistas, onAddProjetista, onUpdateProjetista, onDeleteProjetista,
    empreendimentos, onAddEmpreendimento, onUpdateEmpreendimento, onDeleteEmpreendimento
}) => {
    const [activeTab, setActiveTab] = useState<'profiles' | 'empreendimentos' | 'projetistas' | 'webhooks'>('profiles');

    const handleSaveWithToast = (profiles: Record<string, AdminSettings>, currentCompany: string) => {
        onSave(profiles, currentCompany);
        setToast({ message: 'Configurações salvas com sucesso!', type: 'success' });
    };
    
    return (
        <main className="container mx-auto p-4 md:p-8">
             <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                    <SettingsIcon className="w-8 h-8 mr-3 text-slate-500" />
                    Configurações
                </h1>
                <p className="text-slate-500 dark:text-slate-400">Gerencie os perfis da sua empresa, integrações e outras configurações gerais.</p>
            </header>
            
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('profiles')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'profiles'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600'
                        }`}
                    >
                        Perfis de Empresa
                    </button>
                    <button
                        onClick={() => setActiveTab('empreendimentos')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'empreendimentos'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600'
                        }`}
                    >
                        Empreendimentos
                    </button>
                    <button
                        onClick={() => setActiveTab('projetistas')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'projetistas'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600'
                        }`}
                    >
                        Empresas Projetistas
                    </button>
                    <button
                        onClick={() => setActiveTab('webhooks')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'webhooks'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600'
                        }`}
                    >
                        Webhooks do Teams
                    </button>
                </nav>
            </div>

            <div className="max-w-4xl mx-auto">
                 {activeTab === 'profiles' && (
                    <SettingsPanel 
                        allProfiles={allProfiles} 
                        currentCompanyName={currentCompanyName} 
                        onSave={handleSaveWithToast}
                    />
                 )}
                  {activeTab === 'empreendimentos' && (
                    <EmpreendimentosPanel
                        empreendimentos={empreendimentos}
                        onAdd={onAddEmpreendimento}
                        onUpdate={onUpdateEmpreendimento}
                        onDelete={onDeleteEmpreendimento}
                        setToast={setToast}
                    />
                 )}
                 {activeTab === 'projetistas' && (
                    <ProjetistasPanel
                        projetistas={projetistas}
                        onAdd={onAddProjetista}
                        onUpdate={onUpdateProjetista}
                        onDelete={onDeleteProjetista}
                    />
                 )}
                 {activeTab === 'webhooks' && (
                    <WebhookPanel
                        webhooks={webhooks}
                        onAdd={onAddWebhook}
                        onUpdate={onUpdateWebhook}
                        onDelete={onDeleteWebhook}
                    />
                 )}
            </div>
        </main>
    );
};


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const savedState = localStorage.getItem('sidebarCollapsed');
      return savedState ? JSON.parse(savedState) : false;
    } catch {
      return false;
    }
  });

  const [ataToView, setAtaToView] = useState<AtaData | null>(null);
  
  // State lifted to App
  const [companyProfiles, setCompanyProfiles] = useState<Record<string, AdminSettings>>({});
  const [currentCompanyName, setCurrentCompanyName] = useState<string>('');
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [projetistas, setProjetistas] = useState<Projetista[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Load company profiles from localStorage
    try {
      const savedProfilesStr = localStorage.getItem('ata-company-profiles');
      let profiles: Record<string, AdminSettings> = {};
      if (savedProfilesStr) {
        profiles = JSON.parse(savedProfilesStr);
      }
      if (Object.keys(profiles).length === 0) {
        profiles[DEFAULT_COMPANY_NAME] = DEFAULT_SETTINGS;
      }
      setCompanyProfiles(profiles);

      const savedCurrentCompany = localStorage.getItem('ata-current-company-name');
      if (savedCurrentCompany && profiles[savedCurrentCompany]) {
        setCurrentCompanyName(savedCurrentCompany);
      } else {
        setCurrentCompanyName(Object.keys(profiles)[0]);
      }
    } catch (e) {
      console.error("Failed to load settings from localStorage", e);
      setCompanyProfiles({ [DEFAULT_COMPANY_NAME]: DEFAULT_SETTINGS });
      setCurrentCompanyName(DEFAULT_COMPANY_NAME);
    }
    
    const fetchData = async () => {
        try {
            const [loadedWebhooks, loadedProjetistas, loadedEmpreendimentos] = await Promise.all([
                getWebhooks(),
                getProjetistas(),
                getEmpreendimentos()
            ]);
            setWebhooks(loadedWebhooks);
            setProjetistas(loadedProjetistas);
            setEmpreendimentos(loadedEmpreendimentos);
        } catch (error: any) {
            console.error("Failed to load initial data from Firebase", error);
            setToast({ message: `Falha ao carregar dados iniciais: ${error.message}`, type: 'error' });
        }
    };
    
    fetchData();
  }, []);
  
  useEffect(() => {
    if (toast) {
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSettingsSave = useCallback((profiles: Record<string, AdminSettings>, currentCompany: string) => {
    setCompanyProfiles(profiles);
    setCurrentCompanyName(currentCompany);
    localStorage.setItem('ata-company-profiles', JSON.stringify(profiles));
    localStorage.setItem('ata-current-company-name', currentCompany);
  }, []);

  // --- Empreendimento Handlers ---
  const handleAddEmpreendimento = async (data: Omit<Empreendimento, 'id'>) => {
    try {
        const newId = await addEmpreendimento(data);
        const newEmpreendimento = { id: newId, ...data };
        setEmpreendimentos(prev => [...prev, newEmpreendimento].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error: any) {
        console.error("Failed to add empreendimento:", error);
        setToast({ message: `Falha ao adicionar empreendimento: ${error.message}`, type: 'error' });
        throw error; // Re-throw to be caught in the panel
    }
  };

  const handleUpdateEmpreendimento = async (id: string, data: Partial<Omit<Empreendimento, 'id'>>) => {
    try {
        await updateEmpreendimento(id, data);
        setEmpreendimentos(prev => prev.map(p => p.id === id ? { ...p, ...data } : p).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error: any) {
        console.error("Failed to update empreendimento:", error);
        setToast({ message: `Falha ao atualizar empreendimento: ${error.message}`, type: 'error' });
        throw error; // Re-throw to be caught in the panel
    }
  };
  
  const handleDeleteEmpreendimento = async (id: string) => {
    try {
        await deleteEmpreendimento(id);
        setEmpreendimentos(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
        console.error("Failed to delete empreendimento:", error);
        setToast({ message: `Falha ao excluir empreendimento: ${error.message}`, type: 'error' });
        throw error; // Re-throw to be caught in the panel
    }
  };
  
  // --- Webhook Handlers ---
  const handleAddWebhook = async (name: string, url: string) => {
    try {
        const newId = await addWebhook(name, url);
        const newWebhook = { id: newId, name, url };
        setWebhooks(prev => [...prev, newWebhook].sort((a, b) => a.name.localeCompare(b.name)));
        setToast({ message: 'Webhook adicionado com sucesso!', type: 'success' });
    } catch (error: any) {
        console.error("Failed to add webhook:", error);
        setToast({ message: `Falha ao adicionar webhook: ${error.message}`, type: 'error' });
    }
  };
  
  const handleUpdateWebhook = async (id: string, name: string, url: string) => {
    try {
        await updateWebhook(id, name, url);
        setWebhooks(prev => prev.map(w => w.id === id ? { ...w, name, url } : w).sort((a, b) => a.name.localeCompare(b.name)));
        setToast({ message: 'Webhook atualizado com sucesso!', type: 'success' });
    } catch (error: any) {
        console.error("Failed to update webhook:", error);
        setToast({ message: `Falha ao atualizar webhook: ${error.message}`, type: 'error' });
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
        await deleteWebhook(id);
        setWebhooks(prev => prev.filter(w => w.id !== id));
        setToast({ message: 'Webhook excluído com sucesso!', type: 'success' });
    } catch (error: any) {
        console.error("Failed to delete webhook:", error);
        setToast({ message: `Falha ao excluir webhook: ${error.message}`, type: 'error' });
    }
  };

  // --- Projetista Handlers ---
    const handleAddProjetista = async (name: string, logo: string | null) => {
        try {
            const newId = await addProjetista(name, logo);
            const newProjetista = { id: newId, name, logo };
            setProjetistas(prev => [...prev, newProjetista].sort((a, b) => a.name.localeCompare(b.name)));
            setToast({ message: 'Empresa adicionada com sucesso!', type: 'success' });
        } catch (err: any) {
            setToast({ message: `Erro ao adicionar empresa: ${err.message}`, type: 'error' });
        }
    };
    
    const handleUpdateProjetista = async (id: string, name: string, logo: string | null) => {
        try {
            await updateProjetista(id, name, logo);
            setProjetistas(prev => prev.map(p => p.id === id ? { ...p, name, logo } : p).sort((a, b) => a.name.localeCompare(b.name)));
            setToast({ message: 'Empresa atualizada com sucesso!', type: 'success' });
        } catch (err: any) {
            setToast({ message: `Erro ao atualizar empresa: ${err.message}`, type: 'error' });
        }
    };

    const handleDeleteProjetista = async (id: string) => {
        try {
            await deleteProjetista(id);
            setProjetistas(prev => prev.filter(p => p.id !== id));
            setToast({ message: 'Empresa e projetos associados excluídos com sucesso!', type: 'success' });
        } catch (err: any) {
             setToast({ message: `Erro ao excluir empresa: ${err.message}`, type: 'error' });
        }
    };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prevState => {
      const newState = !prevState;
      try {
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
      } catch (error) {
        console.error("Failed to save sidebar state to localStorage", error);
      }
      return newState;
    });
  };
  
  const handleNavigateToAta = (ata: AtaData) => {
    setAtaToView(ata);
    setCurrentView('ataCreator');
  };

  const handleAtaViewed = () => {
    setAtaToView(null);
  }
  
  const adminSettings = companyProfiles[currentCompanyName] || null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans flex">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={toggleSidebar}
      />
      <div className={`flex-1 w-full transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'pl-20' : 'pl-64'}`}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'ataCreator' && <AtaCreatorView initialAta={ataToView} onAtaViewed={handleAtaViewed} companyProfiles={companyProfiles} currentCompanyName={currentCompanyName} setToast={setToast} empreendimentos={empreendimentos} />}
        {currentView === 'ataRepository' && <AtaRepositoryView onNavigateToAta={handleNavigateToAta} />}
        {currentView === 'deadlinePanel' && <DeadlineView onNavigateToAta={handleNavigateToAta} adminSettings={adminSettings} webhooks={webhooks} />}
        {currentView === 'projectControl' && <ProjectControlView setToast={setToast} projetistas={projetistas} empreendimentos={empreendimentos} />}
        {currentView === 'projectDashboard' && <ProjectDashboardView />}
        {currentView === 'settings' && <SettingsView 
            allProfiles={companyProfiles} 
            currentCompanyName={currentCompanyName} 
            onSave={handleSettingsSave} 
            setToast={setToast}
            webhooks={webhooks}
            onAddWebhook={handleAddWebhook}
            onUpdateWebhook={handleUpdateWebhook}
            onDeleteWebhook={handleDeleteWebhook}
            projetistas={projetistas}
            onAddProjetista={handleAddProjetista}
            onUpdateProjetista={handleUpdateProjetista}
            onDeleteProjetista={handleDeleteProjetista}
            empreendimentos={empreendimentos}
            onAddEmpreendimento={handleAddEmpreendimento}
            onUpdateEmpreendimento={handleUpdateEmpreendimento}
            onDeleteEmpreendimento={handleDeleteEmpreendimento}
        />}
      </div>
    </div>
  );
};

export default App;