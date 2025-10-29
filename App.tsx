

import React, { useState, useCallback, useEffect } from 'react';
import type { AtaData, AdminSettings, Participant, PautaItem } from './types';
import { generateAtaData } from './services/geminiService';
import { saveAtaToFirestore, loadAtasFromFirestore, deleteAtaFromFirestore } from './services/firebaseService';
import { exportToDocx, exportToPdf } from './services/exportService';
import Header from './components/Header';
import InputForm from './components/InputForm';
import MinutesDisplay from './components/MinutesDisplay';
import Loader from './components/Loader';
import ConfirmationDialog from './components/ConfirmationDialog';
import SavedAtasPanel from './components/SavedAtasPanel';
import { AlertTriangleIcon, EditIcon, CheckIcon, CopyIcon, UploadCloudIcon, DownloadCloudIcon, FileWordIcon, FilePdfIcon } from './components/icons';

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


  // State for the action toolbar
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExportReady, setIsExportReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // State for loading saved atas
  const [savedAtas, setSavedAtas] = useState<AtaData[]>([]);
  const [isSavedAtasLoading, setIsSavedAtasLoading] = useState(false);
  const [showLoadPanel, setShowLoadPanel] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // State for deleting atas
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [ataToDelete, setAtaToDelete] = useState<AtaData | null>(null);


  useEffect(() => {
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

  const handleSettingsSave = useCallback((profiles: Record<string, AdminSettings>, currentCompany: string) => {
    setCompanyProfiles(profiles);
    setCurrentCompanyName(currentCompany);
    localStorage.setItem('ata-company-profiles', JSON.stringify(profiles));
    localStorage.setItem('ata-current-company-name', currentCompany);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!vttContent.trim() || !titulo.trim() || !empreendimento.trim()) {
      setError('Por favor, preencha o Título, Empreendimento e a Transcrição.');
      return;
    }
    if (!adminSettings) {
      setError("As configurações da empresa não foram carregadas. Por favor, verifique as configurações e selecione uma empresa.");
      return;
    }
    
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

    } catch (err) {
      console.error(err);
      let errorMessage = 'Ocorreu um erro ao gerar a ata. Verifique o console para mais detalhes e tente novamente.';
      if (err instanceof Error) {
        if (err.message === 'API_KEY_MISSING') {
            errorMessage = 'A chave de API não foi encontrada. Verifique se a variável de ambiente API_KEY está configurada no seu ambiente de produção.';
        } else if (err.message.includes('API key not valid')) {
            errorMessage = 'A chave de API fornecida não é válida. Por favor, verifique a variável de ambiente API_KEY nas configurações de implantação do seu serviço e tente novamente.';
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
  }, []);
  
  const onConfirmClear = () => {
      handleClear();
      setShowClearConfirmation(false);
  };

  const handleSaveToCloud = useCallback(async () => {
    if (!ata) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const docId = await saveAtaToFirestore(ata);
      const savedAta = { ...ata, id: docId };
      setAta(savedAta);
      // If we just updated a loaded ata, update the original state to prevent repeated warnings
      if (originalLoadedAta) {
          setOriginalLoadedAta(savedAta);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (error) {
      console.error("Erro ao salvar a ata no Firestore:", error);
      alert("Ocorreu um erro ao salvar a ata. Verifique o console para mais detalhes.");
    } finally {
      setIsSaving(false);
    }
  }, [ata, originalLoadedAta]);
  
  const handleOpenLoadPanel = useCallback(async () => {
    setShowLoadPanel(true);
    setIsSavedAtasLoading(true);
    setLoadError(null);
    try {
        const loadedAtas = await loadAtasFromFirestore();
        loadedAtas.sort((a, b) => {
            const dateA = a.data.split('/').reverse().join('');
            const dateB = b.data.split('/').reverse().join('');
            return dateB.localeCompare(dateA);
        });
        setSavedAtas(loadedAtas);
    } catch (error) {
        console.error("Failed to load atas from Firestore:", error);
        setLoadError("Não foi possível carregar as atas. Verifique sua conexão e a configuração do Firestore.");
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
    setIsEditing(true); // Abrir em modo de edição
  }, []);

  const handleDeleteClick = (ata: AtaData) => {
    setAtaToDelete(ata);
    setShowDeleteConfirmation(true);
  };

  const onConfirmDelete = async () => {
    if (!ataToDelete || !ataToDelete.id) return;
    try {
      await deleteAtaFromFirestore(ataToDelete.id);
      setSavedAtas(prev => prev.filter(a => a.id !== ataToDelete.id));
      if (ata?.id === ataToDelete.id) {
        handleClear();
      }
    } catch (error) {
      console.error("Failed to delete ata:", error);
      alert("Ocorreu um erro ao excluir a ata.");
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
      // When finishing editing, check if a loaded ata has been modified
      if (isEditing && originalLoadedAta) {
          if (JSON.stringify(ata) !== JSON.stringify(originalLoadedAta)) {
              setShowSaveReminder(true);
          }
      }
      setIsEditing(!isEditing);
  };


  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <InputForm
            companyProfiles={companyProfiles}
            currentCompanyName={currentCompanyName}
            onSettingsSave={handleSettingsSave}
            empreendimento={empreendimento} setEmpreendimento={setEmpreendimento}
            area={area} setArea={setArea}
            titulo={titulo} setTitulo={setTitulo}
            contrato={contrato} setContrato={setContrato}
            assunto={assunto} setAssunto={setAssunto}
            local={local} setLocal={setLocal}
            vttContent={vttContent} setVttContent={setVttContent}
            onGenerate={handleGenerateClick}
            onClear={() => setShowClearConfirmation(true)}
            isLoading={isLoading}
            isEditing={isEditing}
            onOpenLoadPanel={handleOpenLoadPanel}
          />
          <div className="relative lg:sticky top-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 min-h-[calc(100vh-10rem)]">
            {isLoading && <Loader />}
            {error && (
              <div className="flex flex-col items-center justify-center h-full text-center text-red-500">
                <AlertTriangleIcon className="w-16 h-16 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Erro ao Processar</h3>
                <p className="max-w-md">{error}</p>
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
                        onClick={handleSaveToCloud}
                        disabled={isEditing || isSaving}
                        title={isEditing ? "Conclua a edição para poder salvar" : "Salvar na Nuvem"}
                        className={`bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-blue-500 ${saveSuccess ? 'border-green-500' : ''}`}
                    >
                        {saveSuccess ? <CheckIcon className="w-5 h-5 text-green-500" /> : <UploadCloudIcon className="w-5 h-5" />}
                        <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
                    </ActionButton>
                    <div className="flex-grow"></div>
                    <ActionButton
                        onClick={() => exportToDocx(ata)}
                        disabled={isEditing || !isExportReady}
                        title={isEditing ? "Conclua a edição para exportar" : (isExportReady ? "Exportar para DOCX" : "Aguardando bibliotecas de exportação...")}
                        className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                    >
                       <FileWordIcon className="w-5 h-5" />
                       <span>DOCX</span>
                    </ActionButton>
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
                <MinutesDisplay ata={ata} setAta={setAta} isEditing={isEditing} />
              </>
            )}
          </div>
        </div>
      </main>
      <SavedAtasPanel
        isOpen={showLoadPanel}
        isLoading={isSavedAtasLoading}
        error={loadError}
        atas={savedAtas}
        onClose={() => setShowLoadPanel(false)}
        onSelect={handleSelectSavedAta}
        onDelete={handleDeleteClick}
      />
      <ConfirmationDialog
        isOpen={showClearConfirmation}
        onClose={() => setShowClearConfirmation(false)}
        onConfirm={onConfirmClear}
        title="Iniciar Nova Ata"
      >
        Tem certeza de que deseja limpar todos os campos e começar uma nova ata? Todos os dados não salvos serão perdidos.
        <br/><br/>
        <strong>Dica:</strong> Salve a ata atual na nuvem antes de limpar, caso queira recuperá-la mais tarde.
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
        Você fez alterações nesta ata. Para mantê-las, clique no botão "Salvar".
        As alterações não salvas serão perdidas ao gerar ou carregar uma nova ata.
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
