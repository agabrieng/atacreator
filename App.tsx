import React, { useState, useCallback, useEffect } from 'react';
import type { AtaData, AdminSettings, Participant, PautaItem, Empreendimento, Webhook } from './types';
import { generateAtaData } from './services/geminiService';
import { 
    saveAtaToFirebase, 
    loadAtasFromFirebase, 
    deleteAtaFromFirebase, 
    getEmpreendimentos, 
    addEmpreendimento, 
    updateEmpreendimento, 
    deleteEmpreendimento,
    getWebhooks,
    addWebhook,
    updateWebhook,
    deleteWebhook
} from './services/firebaseService';
import { exportToPdf } from './services/exportService';
import Header from './components/Header';
import InputForm from './components/InputForm';
import MinutesDisplay from './components/MinutesDisplay';
import Loader from './components/Loader';
import ConfirmationDialog from './components/ConfirmationDialog';
import SavedAtasPanel from './components/SavedAtasPanel';
import ProjectManagementPanel from './components/ProjectManagementPanel';
import DeadlinePanel from './components/DeadlinePanel';
import WebhookPanel from './components/WebhookPanel';
import { AlertTriangleIcon, EditIcon, CheckIcon, CopyIcon, UploadCloudIcon, DownloadCloudIcon, FilePdfIcon, CheckCircleIcon, XIcon } from './components/icons';

const DEFAULT_COMPANY_NAME = "Minha Empresa";
const DEFAULT_SETTINGS: AdminSettings = {
    companyName: DEFAULT_COMPANY_NAME,
    companyLogo: null,
    docNumber: 'FM-GCO-RM2-002',
    revision: '00',
    propertyInfo: 'AS INFORMAÇÕES DESTE DOCUMENTO SÃO DE PROPRIEDADE DA SUA EMPRESA, SENDO PROIBIDA A UTILIZAÇÃO FORA DA SUA FINALIDADE.',
};

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
        className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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
            <button onClick={onClose} className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSuccess ? 'hover:bg-green-200/50 dark:hover:bg-green-800/50 focus:ring-green-600 focus:ring-offset-green-100 dark:focus:ring-offset-green-900' : 'hover:bg-red-200/50 dark:hover:bg-red-800/50 focus:ring-red-600 focus:ring-offset-red-100 dark:focus:ring-offset-red-900'}`}>
              <span className="sr-only">Fechar</span>
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [companyProfiles, setCompanyProfiles] = useState<Record<string, AdminSettings>>({});
  const [currentCompanyName, setCurrentCompanyName] = useState<string>('');
  
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
  
  // State for loading saved atas
  const [savedAtas, setSavedAtas] = useState<AtaData[]>([]);
  const [isSavedAtasLoading, setIsSavedAtasLoading] = useState(false);
  const [showLoadPanel, setShowLoadPanel] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // State for deleting atas
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [ataToDelete, setAtaToDelete] = useState<AtaData | null>(null);

  // State for Projects (Empreendimentos)
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(false);
  
  // State for collapsible form
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // State for Deadline Panel
  const [isDeadlinePanelOpen, setIsDeadlinePanelOpen] = useState(false);
  
  // State for Webhooks
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isWebhookPanelOpen, setIsWebhookPanelOpen] = useState(false);

  // State for Toast notifications
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
    
    // Load empreendimentos from Firebase
    const fetchEmpreendimentos = async () => {
        try {
            setIsProjectsLoading(true);
            const loadedEmpreendimentos = await getEmpreendimentos();
            setEmpreendimentos(loadedEmpreendimentos);
        } catch (error: any) {
            console.error("Failed to load empreendimentos from Firebase", error);
            setError(`Falha ao carregar a lista de empreendimentos: ${error.message}`);
        } finally {
            setIsProjectsLoading(false);
        }
    };
    
    // Load webhooks from Firebase
    const fetchWebhooks = async () => {
        try {
            const loadedWebhooks = await getWebhooks();
            setWebhooks(loadedWebhooks);
        } catch (error: any) {
            console.error("Failed to load webhooks from Firebase", error);
            setToast({ message: `Falha ao carregar webhooks: ${error.message}`, type: 'error' });
        }
    };
    
    fetchEmpreendimentos();
    fetchWebhooks();
  }, []);
  
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
            const newContrato = selectedProject.contrato;
            setContrato(newContrato);
    
            // Auto-fill other header data from localStorage cache if available
            if (newContrato) {
                try {
                    const savedHeadersStr = localStorage.getItem('ata-header-data');
                    if (savedHeadersStr) {
                        const savedHeaders = JSON.parse(savedHeadersStr);
                        const data = savedHeaders[newContrato];
                        if (data) {
                            setArea(data.area || '');
                            setTitulo(data.titulo || '');
                            setAssunto(data.assunto || '');
                            setLocal(data.local || '');
                        }
                    }
                } catch (err) {
                    console.error("Failed to load header data from localStorage", err);
                }
            }
        }
    }, [empreendimento, empreendimentos]);
    
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
  
  // --- Webhook Handlers ---
  const handleAddWebhook = async (name: string, url: string) => {
    try {
        const newId = await addWebhook(name, url);
        const newWebhook = { id: newId, name, url };
        setWebhooks(prev => [...prev, newWebhook].sort((a, b) => a.name.localeCompare(b.name)));
        setToast({ message: 'Webhook adicionado com sucesso!', type: 'success' });
    } catch (error) {
        console.error("Failed to add webhook:", error);
        setToast({ message: 'Falha ao adicionar webhook.', type: 'error' });
    }
  };
  
  const handleUpdateWebhook = async (id: string, name: string, url: string) => {
    try {
        await updateWebhook(id, name, url);
        setWebhooks(prev => prev.map(w => w.id === id ? { ...w, name, url } : w).sort((a, b) => a.name.localeCompare(b.name)));
        setToast({ message: 'Webhook atualizado com sucesso!', type: 'success' });
    } catch (error) {
        console.error("Failed to update webhook:", error);
        setToast({ message: 'Falha ao atualizar webhook.', type: 'error' });
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
        await deleteWebhook(id);
        setWebhooks(prev => prev.filter(w => w.id !== id));
        setToast({ message: 'Webhook excluído com sucesso!', type: 'success' });
    } catch (error) {
        console.error("Failed to delete webhook:", error);
        setToast({ message: 'Falha ao excluir webhook.', type: 'error' });
    }
  };


  // --- Project Management Handlers ---
  const handleAddProject = async (name: string, contrato: string) => {
    try {
        const newId = await addEmpreendimento(name, contrato);
        const newProject = { id: newId, name, contrato };
        setEmpreendimentos(prev => [...prev, newProject].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
        console.error("Failed to add project:", error);
        alert("Falha ao adicionar empreendimento no Firebase.");
    }
  };

  const handleUpdateProject = async (id: string, newName: string, newContrato: string) => {
    try {
        await updateEmpreendimento(id, newName, newContrato);
        setEmpreendimentos(prev => prev.map(p => p.id === id ? { ...p, name: newName, contrato: newContrato } : p).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
        console.error("Failed to update project:", error);
        alert("Falha ao atualizar empreendimento no Firebase.");
    }
  };
  
  const handleDeleteProject = async (id: string) => {
    try {
        const projectToDelete = empreendimentos.find(p => p.id === id);
        if (!projectToDelete) return;

        await deleteEmpreendimento(id);
        
        setEmpreendimentos(prev => prev.filter(p => p.id !== id));

        if (empreendimento === projectToDelete.name) {
            setEmpreendimento('');
        }
    } catch (error) {
        console.error("Failed to delete project:", error);
        alert("Falha ao excluir empreendimento do Firebase.");
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!vttContent.trim() || !titulo.trim() || !empreendimento.trim()) {
      setError('Por favor, preencha o Título, Empreendimento e a Transcrição.');
      return;
    }
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
      if (originalLoadedAta) {
          setOriginalLoadedAta(savedAta);
      }
      setToast({ message: 'Ata salva com sucesso na nuvem!', type: 'success' });
    } catch (error) {
      console.error("Erro ao salvar a ata no Firebase:", error);
      setToast({ message: 'Erro ao salvar a ata. Tente novamente.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [ata, originalLoadedAta]);
  
  const handleOpenLoadPanel = useCallback(async () => {
    setShowLoadPanel(true);
    setIsSavedAtasLoading(true);
    setLoadError(null);
    try {
        const loadedAtas = await loadAtasFromFirebase();
        // Sorting can be done here if a consistent date/time field is available
        // For now, Firebase returns them ordered by last update
        setSavedAtas(loadedAtas);
    } catch (error: any) {
        console.error("Failed to load atas from Firebase:", error);
        setLoadError(`Não foi possível carregar as atas do Firebase: ${error.message}`);
    } finally {
        setIsSavedAtasLoading(false);
    }
  }, []);

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
    setShowLoadPanel(false);
    setIsDeadlinePanelOpen(false); // Close deadline panel if open
    setIsEditing(true); // Abrir em modo de edição
    setIsFormCollapsed(true);
  }, []);

  const handleViewAtaFromDeadlinePanel = useCallback((selectedAta: AtaData) => {
    setAta(selectedAta);
    setOriginalLoadedAta(selectedAta);
    setEmpreendimento(selectedAta.empreendimento || '');
    setArea(selectedAta.area || '');
    setTitulo(selectedAta.titulo || '');
    setContrato(selectedAta.contrato || '');
    setAssunto(selectedAta.assunto || '');
    setLocal(selectedAta.local || '');
    setVttContent('');
    setShowLoadPanel(false);
    setIsDeadlinePanelOpen(false); 
    setIsEditing(false); // Open in read-only mode
    setIsFormCollapsed(true);
  }, []);

  const handleDeleteClick = (ata: AtaData) => {
    setAtaToDelete(ata);
    setShowDeleteConfirmation(true);
  };

  const onConfirmDelete = async () => {
    if (!ataToDelete || !ataToDelete.id) return;
    try {
      await deleteAtaFromFirebase(ataToDelete.id);
      setSavedAtas(prev => prev.filter(a => a.id !== ataToDelete.id));
      if (ata?.id === ataToDelete.id) {
        handleClear();
      }
    } catch (error) {
      console.error("Failed to delete ata:", error);
      alert("Ocorreu um erro ao excluir a ata do Firebase.");
    } finally {
      setShowDeleteConfirmation(false);
      setAtaToDelete(null);
    }
  };
  
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
    <div className="min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className={`grid grid-cols-1 ${ata ? `lg:grid lg:grid-cols-[${isFormCollapsed ? 'auto_1fr' : 'minmax(450px,_5fr)_7fr'}]` : 'lg:grid-cols-2'} gap-8 items-start`}>
            <div className="transition-all duration-300 ease-in-out">
                <InputForm
                    companyProfiles={companyProfiles}
                    currentCompanyName={currentCompanyName}
                    onSettingsSave={handleSettingsSave}
                    empreendimento={empreendimento} setEmpreendimento={setEmpreendimento}
                    empreendimentos={empreendimentos}
                    isProjectsLoading={isProjectsLoading}
                    onOpenProjectPanel={() => setIsProjectPanelOpen(true)}
                    area={area} setArea={setArea}
                    titulo={titulo} setTitulo={setTitulo}
                    assunto={assunto} setAssunto={setAssunto}
                    local={local} setLocal={setLocal}
                    vttContent={vttContent} setVttContent={setVttContent}
                    onGenerate={handleGenerateClick}
                    onClear={() => setShowClearConfirmation(true)}
                    isLoading={isLoading}
                    isEditing={isEditing}
                    onOpenLoadPanel={handleOpenLoadPanel}
                    onOpenDeadlinePanel={() => setIsDeadlinePanelOpen(true)}
                    onOpenWebhookPanel={() => setIsWebhookPanelOpen(true)}
                    isAtaGenerated={!!ata}
                    isCollapsed={isFormCollapsed && !!ata}
                    onToggleCollapse={() => setIsFormCollapsed(!isFormCollapsed)}
                />
            </div>
          <div className="relative lg:sticky top-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 min-h-[calc(100vh-10rem)] transition-all duration-300 ease-in-out">
            {(isLoading && !error) && <Loader />}
            {error && (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <AlertTriangleIcon className="w-16 h-16 mb-4 text-red-500" />
                <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">Ocorreu um Erro</h3>
                <div className="max-w-2xl w-full bg-red-50 dark:bg-gray-700/50 text-red-700 dark:text-red-300 p-4 rounded-lg text-left font-mono text-sm overflow-auto">
                    <pre className="whitespace-pre-wrap break-words">{error}</pre>
                </div>
              </div>
            )}
            {!isLoading && !error && (
              <>
                {ata && (
                  <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                     <ActionButton
                        onClick={handleToggleEditing}
                        title={isEditing ? "Concluir Edição" : "Editar Ata"}
                        className={isEditing ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-blue-500'}
                    >
                        {isEditing ? <CheckIcon className="w-5 h-5" /> : <EditIcon className="w-5 h-5" />}
                        <span>{isEditing ? "Concluir" : "Editar"}</span>
                    </ActionButton>
                    <ActionButton
                        onClick={handleCopy}
                        disabled={isEditing}
                        title={isEditing ? "Conclua a edição para poder copiar" : "Copiar Dados (JSON)"}
                        className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-blue-500"
                    >
                         {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                        <span>Copiar</span>
                    </ActionButton>
                    <ActionButton
                        onClick={handleSave}
                        disabled={isEditing || isSaving}
                        title={isEditing ? "Conclua a edição para poder salvar" : "Salvar na nuvem"}
                        className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-blue-500"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" role="status">
                                <span className="sr-only">Salvando...</span>
                            </div>
                        ) : (
                            <UploadCloudIcon className="w-5 h-5" />
                        )}
                        <span>{isSaving ? 'Salvando...' : 'Salvar na Nuvem'}</span>
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <SavedAtasPanel
        isOpen={showLoadPanel}
        isLoading={isSavedAtasLoading}
        error={loadError}
        atas={savedAtas}
        onClose={() => setShowLoadPanel(false)}
        onSelect={handleSelectSavedAta}
        onDelete={handleDeleteClick}
      />
       <ProjectManagementPanel
        isOpen={isProjectPanelOpen}
        onClose={() => setIsProjectPanelOpen(false)}
        projects={empreendimentos}
        onAdd={handleAddProject}
        onUpdate={handleUpdateProject}
        onDelete={handleDeleteProject}
      />
      <DeadlinePanel
        isOpen={isDeadlinePanelOpen}
        onClose={() => setIsDeadlinePanelOpen(false)}
        onSelectAta={handleViewAtaFromDeadlinePanel}
        adminSettings={adminSettings}
        webhooks={webhooks}
      />
      <WebhookPanel
        isOpen={isWebhookPanelOpen}
        onClose={() => setIsWebhookPanelOpen(false)}
        webhooks={webhooks}
        onAdd={handleAddWebhook}
        onUpdate={handleUpdateWebhook}
        onDelete={handleDeleteWebhook}
      />
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
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={onConfirmDelete}
        title="Confirmar Exclusão"
        icon="alert"
        confirmText="Excluir"
      >
        Tem certeza de que deseja excluir permanentemente a ata{' '}
        <strong>"{ataToDelete?.titulo}"</strong> de <strong>{ataToDelete?.data}</strong>?
        <br/><br/>
        Esta ação não pode ser desfeita.
      </ConfirmationDialog>
    </div>
  );
};

export default App;