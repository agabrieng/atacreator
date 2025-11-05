import React, { useState, useEffect, useMemo } from 'react';
import type { AtaData, Task, GroupedTasks, AdminSettings, Webhook } from '../types';
import { getAllTasks, groupTasksByResponsible, getTaskStatus } from '../services/taskService';
import { saveAtaToFirebase } from '../services/firebaseService';
import { generateDailyBulletinHtml, generateTeamsHtml, generateTeamsAdaptiveCard } from '../services/emailService';
import { sendToTeamsWebhook } from '../services/webhookService';
import { XIcon, AlertTriangleIcon, CalendarCheckIcon, ChevronRightIcon, ExternalLinkIcon, SparklesIcon, CopyIcon, CheckIcon, UsersIcon, SendIcon } from './icons';

interface DeadlinePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAta: (ata: AtaData) => void;
  adminSettings: AdminSettings | null;
  webhooks: Webhook[];
}

const statusStyles = {
    overdue: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    'due-today': 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
    upcoming: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    'no-deadline': 'bg-transparent text-gray-500 dark:text-gray-400',
    completed: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
};
const statusText = {
    overdue: 'Atrasado',
    'due-today': 'Entrega Hoje',
    upcoming: 'Próximo',
    'no-deadline': 'Sem Prazo',
    completed: 'Concluído'
};

// --- Date Conversion Helpers ---
const convertToInputDate = (prazo: string | null): string => {
    if (!prazo) return '';
    const parts = prazo.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        if (day?.length === 2 && month?.length === 2 && year?.length === 4) {
            return `${year}-${month}-${day}`;
        }
    }
    if (prazo.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return prazo;
    }
    return '';
};

const convertToDisplayDate = (inputDate: string): string => {
    if (!inputDate) return '';
    const parts = inputDate.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }
    return inputDate;
};

// Define a type alias for the send status object to avoid type inference issues.
type SendStatusInfo = {
    status: 'idle' | 'sending' | 'success' | 'error';
    message: string;
};

const BulletinPreviewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    htmlContent: string;
    teamsHtmlContent: string;
    adaptiveCardPayload: object;
    webhooks: Webhook[];
    subject: string;
}> = ({ isOpen, onClose, htmlContent, teamsHtmlContent, adaptiveCardPayload, webhooks, subject }) => {
    const [copiedHtml, setCopiedHtml] = useState(false);
    const [copiedTeams, setCopiedTeams] = useState(false);
    const [activeTab, setActiveTab] = useState<'email' | 'teams'>('email');
    const [selectedWebhooks, setSelectedWebhooks] = useState<Record<string, boolean>>({});
    const [sendStatuses, setSendStatuses] = useState<Record<string, SendStatusInfo>>({});

    useEffect(() => {
        // Reset state when modal is opened/closed or content changes
        if(isOpen) {
            setActiveTab('email');
            setCopiedHtml(false);
            setCopiedTeams(false);
            setSendStatuses({});
            // Deselect all webhooks by default to prevent accidental sends.
            setSelectedWebhooks({});
        }
    }, [isOpen, webhooks]);

    if (!isOpen) return null;

    const handleCopyHtmlToClipboard = async () => {
        try {
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const clipboardItem = new ClipboardItem({ 'text/html': blob });
            await navigator.clipboard.write([clipboardItem]);
            setCopiedHtml(true);
            setTimeout(() => setCopiedHtml(false), 2500);
        } catch (err) {
            console.error('Failed to copy HTML to clipboard:', err);
            alert('Falha ao copiar. Por favor, tente copiar o conteúdo manualmente.');
        }
    };

    const handleCopyTeamsToClipboard = async () => {
        if (!teamsHtmlContent) return;
        try {
            const blob = new Blob([teamsHtmlContent], { type: 'text/html' });
            const clipboardItem = new ClipboardItem({ 'text/html': blob });
            await navigator.clipboard.write([clipboardItem]);
            setCopiedTeams(true);
            setTimeout(() => setCopiedTeams(false), 2500);
        } catch (err) {
            console.error('Failed to copy Teams HTML to clipboard:', err);
            alert('Falha ao copiar HTML para o Teams.');
        }
    };
    
    const handleSendToTeams = async () => {
        const webhooksToSend = webhooks.filter(w => selectedWebhooks[w.id]);
        if (webhooksToSend.length === 0) {
            alert('Selecione pelo menos um webhook para enviar.');
            return;
        }

        const initialStatuses: Record<string, SendStatusInfo> = {};
        webhooksToSend.forEach(w => {
            initialStatuses[w.id] = { status: 'sending', message: 'Enviando...' };
        });
        setSendStatuses(initialStatuses);

        for (const webhook of webhooksToSend) {
            const result = await sendToTeamsWebhook(webhook.url, adaptiveCardPayload);
            setSendStatuses(prev => ({
                ...prev,
                [webhook.id]: {
                    status: result.success ? 'success' : 'error',
                    message: result.message
                }
            }));
        }
    };

    // Add type annotation to `s` to resolve error when accessing `s.status`.
    const isSending = Object.values(sendStatuses).some((s: SendStatusInfo) => s.status === 'sending');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Pré-visualização e Envio do Boletim</h3>
                     <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><XIcon className="w-6 h-6" /></button>
                </div>
                
                 <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button onClick={() => setActiveTab('email')} className={`px-4 py-3 text-sm font-semibold ${activeTab === 'email' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Email</button>
                    <button onClick={() => setActiveTab('teams')} className={`px-4 py-3 text-sm font-semibold ${activeTab === 'teams' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Microsoft Teams</button>
                </div>

                {activeTab === 'email' && (
                    <>
                        <div className="p-4 bg-gray-200 dark:bg-gray-900 text-sm font-mono rounded-t-md">
                            <p><span className="font-semibold text-gray-600 dark:text-gray-400">Assunto:</span> {subject}</p>
                        </div>
                        <iframe srcDoc={htmlContent} title="Email Preview" className="w-full flex-grow border-0" />
                        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-between items-center border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">Use "Copiar para Email" para colar em clientes como Outlook, e "Copiar para Teams" para colar em chats.</p>
                             <div className="flex flex-row-reverse gap-3">
                                <button onClick={onClose} className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">Fechar</button>
                                <button onClick={handleCopyTeamsToClipboard} className={`inline-flex items-center justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium ${copiedTeams ? 'bg-green-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}><UsersIcon className="w-5 h-5 mr-2" />{copiedTeams ? 'Copiado!' : 'Copiar para Teams'}</button>
                                <button onClick={handleCopyHtmlToClipboard} className={`inline-flex items-center justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium ${copiedHtml ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}><CopyIcon className="w-5 h-5 mr-2" />{copiedHtml ? 'Copiado!' : 'Copiar para Email'}</button>
                            </div>
                        </div>
                    </>
                )}
                {activeTab === 'teams' && (
                     <>
                        <div className="flex-grow p-6 overflow-y-auto">
                            <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Enviar para Canais do Teams</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Selecione os canais para onde deseja enviar este boletim como um Cartão Adaptável.</p>
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 -mr-2 border-t border-b py-4 dark:border-gray-700">
                                {webhooks.length > 0 ? webhooks.map(webhook => {
                                    const statusInfo: SendStatusInfo | undefined = sendStatuses[webhook.id];
                                    return (
                                        <label key={webhook.id} htmlFor={`webhook-${webhook.id}`} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                                            <input id={`webhook-${webhook.id}`} type="checkbox" checked={!!selectedWebhooks[webhook.id]} onChange={e => setSelectedWebhooks(prev => ({...prev, [webhook.id]: e.target.checked}))} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                            <span className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200">{webhook.name}</span>
                                            {statusInfo && (
                                                 <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                                                     statusInfo.status === 'sending' ? 'bg-blue-100 text-blue-800' :
                                                     statusInfo.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                 }`}>{statusInfo.status === 'sending' ? 'Enviando...' : statusInfo.status === 'success' ? 'Enviado!' : 'Erro!'}</span>
                                            )}
                                        </label>
                                    );
                                }) : <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">Nenhum webhook configurado. Adicione webhooks no painel de configurações.</p>}
                            </div>
                            {Object.values(sendStatuses).map((status: SendStatusInfo, i) => (
                                status.status === 'error' ? <p key={i} className="text-xs text-red-600 mt-2">{status.message}</p> : null
                            ))}
                        </div>
                         <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end items-center gap-3 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
                            <button onClick={onClose} className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">Fechar</button>
                            <button onClick={handleSendToTeams} disabled={isSending || webhooks.length === 0} className="inline-flex items-center justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">
                                {isSending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> : <SendIcon className="w-5 h-5 mr-2" />}
                                {isSending ? 'Enviando...' : `Enviar para (${Object.values(selectedWebhooks).filter(Boolean).length}) Canal(is)`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const BulletinFilterModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onGenerate: () => void;
    empreendimentos: string[];
    assuntos: string[];
    responsaveis: string[];
    selectedEmpreendimento: string;
    setSelectedEmpreendimento: (value: string) => void;
    selectedAssunto: string;
    setSelectedAssunto: (value: string) => void;
    selectedResponsavel: string;
    setSelectedResponsavel: (value: string) => void;
    selectedPeriod: string;
    setSelectedPeriod: (value: string) => void;
    customStartDate: string;
    setCustomStartDate: (value: string) => void;
    customEndDate: string;
    setCustomEndDate: (value: string) => void;
}> = ({ isOpen, onClose, onGenerate, empreendimentos, assuntos, responsaveis, selectedEmpreendimento, setSelectedEmpreendimento, selectedAssunto, setSelectedAssunto, selectedResponsavel, setSelectedResponsavel, selectedPeriod, setSelectedPeriod, customStartDate, setCustomStartDate, customEndDate, setCustomEndDate }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-gray-100 flex items-center">
                           <SparklesIcon className="w-5 h-5 mr-2 text-blue-500"/>
                            Gerar Boletim Direcionado
                        </h3>
                         <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label htmlFor="period-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Filtrar por Período do Prazo
                            </label>
                            <select
                                id="period-filter"
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                                <option value="today">Até a data de hoje</option>
                                <option value="current_week">Semana atual</option>
                                <option value="next_week">Próxima semana</option>
                                <option value="current_month">Mês atual</option>
                                <option value="custom">Personalizado</option>
                            </select>
                        </div>
                        {selectedPeriod === 'custom' && (
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <label htmlFor="start-date" className="block text-xs font-medium text-gray-500 dark:text-gray-400">De</label>
                                    <input
                                        type="date"
                                        id="start-date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-1 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="end-date" className="block text-xs font-medium text-gray-500 dark:text-gray-400">Até</label>
                                    <input
                                        type="date"
                                        id="end-date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-1 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <label htmlFor="empreendimento-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Filtrar por Empreendimento
                            </label>
                            <select
                                id="empreendimento-filter"
                                value={selectedEmpreendimento}
                                onChange={(e) => setSelectedEmpreendimento(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                                <option value="all">Todos os Empreendimentos</option>
                                {empreendimentos.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="assunto-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Filtrar por Assunto da Ata
                            </label>
                            <select
                                id="assunto-filter"
                                value={selectedAssunto}
                                onChange={(e) => setSelectedAssunto(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                                <option value="all">Todos os Assuntos</option>
                                {assuntos.map(assunto => <option key={assunto} value={assunto}>{assunto}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="responsavel-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Filtrar por Responsável
                            </label>
                            <select
                                id="responsavel-filter"
                                value={selectedResponsavel}
                                onChange={(e) => setSelectedResponsavel(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                                <option value="all">Todos os Responsáveis</option>
                                {responsaveis.map(resp => <option key={resp} value={resp}>{resp}</option>)}
                            </select>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 pt-2">
                           O boletim incluirá tarefas não concluídas que correspondam aos filtros de período, empreendimento, assunto e responsável selecionados.
                        </p>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex flex-row-reverse gap-3 rounded-b-xl">
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        onClick={onGenerate}
                    >
                        Gerar Boletim
                    </button>
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};


const DeadlinePanel: React.FC<DeadlinePanelProps> = ({ isOpen, onClose, onSelectAta, adminSettings, webhooks }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [showBulletinPreview, setShowBulletinPreview] = useState(false);
  const [emailHtml, setEmailHtml] = useState('');
  const [teamsHtml, setTeamsHtml] = useState('');
  const [adaptiveCard, setAdaptiveCard] = useState<object>({});
  const [showCompleted, setShowCompleted] = useState(true);
  const [isBulletinModalOpen, setIsBulletinModalOpen] = useState(false);
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<string>('all');
  const [selectedAssunto, setSelectedAssunto] = useState<string>('all');
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');


  const fetchAndSetTasks = async () => {
    try {
        setIsLoading(true);
        setError(null);
        const fetchedTasks = await getAllTasks();
        setTasks(fetchedTasks);
      } catch (err: any) {
        console.error("Failed to load tasks:", err);
        setError(`Não foi possível carregar as tarefas: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
  }

  useEffect(() => {
    if (isOpen) {
        fetchAndSetTasks();
    }
  }, [isOpen]);

  const nonCompletedTasks = useMemo(() => {
    return tasks.filter(task => !task.completed);
  }, [tasks]);

  const groupedTasks = useMemo(() => groupTasksByResponsible(tasks), [tasks]);
  
  const uniqueEmpreendimentos = useMemo(() => {
      const empreendimentos = new Set(nonCompletedTasks.map(task => task.sourceAta.empreendimento));
      return Array.from(empreendimentos).sort();
  }, [nonCompletedTasks]);

  const uniqueAssuntos = useMemo(() => {
      let tasksToConsider = nonCompletedTasks;
      if (selectedEmpreendimento !== 'all') {
          tasksToConsider = tasksToConsider.filter(task => task.sourceAta.empreendimento === selectedEmpreendimento);
      }
      const assuntos = new Set(tasksToConsider.map(task => task.sourceAta.assunto));
      return Array.from(assuntos).sort();
  }, [nonCompletedTasks, selectedEmpreendimento]);
  
  const filteredResponsaveis = useMemo(() => {
    let tasksToConsider = nonCompletedTasks;
    if (selectedEmpreendimento !== 'all') {
      tasksToConsider = tasksToConsider.filter(task => task.sourceAta.empreendimento === selectedEmpreendimento);
    }
    if (selectedAssunto !== 'all') {
        tasksToConsider = tasksToConsider.filter(task => task.sourceAta.assunto === selectedAssunto);
    }
    const responsaveis = new Set(tasksToConsider.map(task => task.responsible));
    return Array.from(responsaveis).sort();
  }, [nonCompletedTasks, selectedEmpreendimento, selectedAssunto]);

  useEffect(() => {
    if (selectedEmpreendimento !== 'all' && !uniqueEmpreendimentos.includes(selectedEmpreendimento)) {
        setSelectedEmpreendimento('all');
    }
  }, [uniqueEmpreendimentos, selectedEmpreendimento]);

  useEffect(() => {
    if (selectedAssunto !== 'all' && !uniqueAssuntos.includes(selectedAssunto)) {
        setSelectedAssunto('all');
    }
  }, [uniqueAssuntos, selectedAssunto]);

  useEffect(() => {
    if (selectedResponsavel !== 'all' && !filteredResponsaveis.includes(selectedResponsavel)) {
        setSelectedResponsavel('all');
    }
  }, [filteredResponsaveis, selectedResponsavel]);

  const handleUpdateTask = async (updatedTask: Task) => {
    // Optimistic UI update
    const originalTasks = tasks;
    setTasks(prevTasks => prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t));

    // Prepare data for Firebase
    const ataToUpdate = { ...updatedTask.originalAta };
    const pautaItem = ataToUpdate.pauta[updatedTask.pautaItemIndex];
    if (pautaItem) {
        const responsavel = pautaItem.responsaveis.find(r => r.id === updatedTask.responsavelId);
        if (responsavel) {
            responsavel.completed = updatedTask.completed;
            responsavel.completionDate = updatedTask.completionDate;

            try {
                await saveAtaToFirebase(ataToUpdate);
            } catch (error) {
                console.error("Failed to save task update:", error);
                alert("Falha ao salvar a atualização da tarefa. A alteração foi desfeita.");
                // Revert UI on failure
                setTasks(originalTasks);
            }
        }
    }
  };

  const handleToggleCompletion = (task: Task) => {
    const isNowCompleted = !task.completed;
    const newCompletionDate = isNowCompleted ? convertToDisplayDate(new Date().toISOString().split('T')[0]) : null;

    handleUpdateTask({
        ...task,
        completed: isNowCompleted,
        completionDate: newCompletionDate,
        status: isNowCompleted ? 'completed' : getTaskStatus(task.deadlineDate, false),
    });
  };

  const handleDateChange = (task: Task, newDate: string) => {
    handleUpdateTask({
        ...task,
        completionDate: convertToDisplayDate(newDate),
    });
  }

  if (!isOpen) return null;

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const handleGenerateBulletin = () => {
    let tasksForBulletin = tasks.filter(task => !task.completed);

    if (selectedEmpreendimento !== 'all') {
        tasksForBulletin = tasksForBulletin.filter(task => task.sourceAta.empreendimento === selectedEmpreendimento);
    }
    if (selectedAssunto !== 'all') {
        tasksForBulletin = tasksForBulletin.filter(task => task.sourceAta.assunto === selectedAssunto);
    }
    if (selectedResponsavel !== 'all') {
        tasksForBulletin = tasksForBulletin.filter(task => task.responsible === selectedResponsavel);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getWeekRange = (date: Date) => {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    };
    
    const parseDateInput = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        const [year, month, day] = dateStr.split('-').map(Number);
        if (year && month && day) {
            return new Date(year, month - 1, day);
        }
        return null;
    }

    switch (selectedPeriod) {
        case 'today':
            tasksForBulletin = tasksForBulletin.filter(task => task.deadlineDate && task.deadlineDate <= today);
            break;
        case 'current_week': {
            const { start, end } = getWeekRange(today);
            tasksForBulletin = tasksForBulletin.filter(task => task.deadlineDate && task.deadlineDate >= start && task.deadlineDate <= end);
            break;
        }
        case 'next_week': {
            const nextWeekDate = new Date(today);
            nextWeekDate.setDate(today.getDate() + 7);
            const { start, end } = getWeekRange(nextWeekDate);
            tasksForBulletin = tasksForBulletin.filter(task => task.deadlineDate && task.deadlineDate >= start && task.deadlineDate <= end);
            break;
        }
        case 'current_month': {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
            tasksForBulletin = tasksForBulletin.filter(task => task.deadlineDate && task.deadlineDate >= start && task.deadlineDate <= end);
            break;
        }
        case 'custom': {
            const start = parseDateInput(customStartDate);
            const end = parseDateInput(customEndDate);
            if (end) end.setHours(23, 59, 59, 999);

            tasksForBulletin = tasksForBulletin.filter(task => {
                if (!task.deadlineDate) return false;
                const isAfterStart = start ? task.deadlineDate >= start : true;
                const isBeforeEnd = end ? task.deadlineDate <= end : true;
                return isAfterStart && isBeforeEnd;
            });
            break;
        }
        default:
             tasksForBulletin = tasksForBulletin.filter(task => task.deadlineDate && task.deadlineDate <= today);
             break;
    }

    const getPeriodDescription = () => {
        switch (selectedPeriod) {
            case 'today': return `Pendências até ${new Date().toLocaleDateString('pt-BR')}`;
            case 'current_week': return 'Pendências da Semana Atual';
            case 'next_week': return 'Pendências da Próxima Semana';
            case 'current_month': return 'Pendências do Mês Atual';
            case 'custom': {
                if (customStartDate && customEndDate) return `Pendências de ${convertToDisplayDate(customStartDate)} a ${convertToDisplayDate(customEndDate)}`;
                if (customStartDate) return `Pendências a partir de ${convertToDisplayDate(customStartDate)}`;
                if (customEndDate) return `Pendências até ${convertToDisplayDate(customEndDate)}`;
                return 'Pendências (Período Personalizado)';
            }
            default: return `Pendências até ${new Date().toLocaleDateString('pt-BR')}`;
        }
    }
    const periodDescription = getPeriodDescription();

    const html = generateDailyBulletinHtml(tasksForBulletin, adminSettings, selectedEmpreendimento, selectedAssunto, selectedResponsavel, periodDescription);
    const teamsFriendlyHtml = generateTeamsHtml(tasksForBulletin, adminSettings, selectedEmpreendimento, selectedAssunto, selectedResponsavel, periodDescription);
    const cardPayload = generateTeamsAdaptiveCard(tasksForBulletin, adminSettings, selectedEmpreendimento, selectedAssunto, selectedResponsavel, periodDescription);
    setEmailHtml(html);
    setTeamsHtml(teamsFriendlyHtml);
    setAdaptiveCard(cardPayload);
    setShowBulletinPreview(true);
    setIsBulletinModalOpen(false); // Close filter modal after generating
  };

  const subjectLineFilters: string[] = [];
  if (selectedEmpreendimento && selectedEmpreendimento !== 'all') {
      subjectLineFilters.push(`Empreendimento: ${selectedEmpreendimento}`);
  }
  if (selectedAssunto && selectedAssunto !== 'all') {
    subjectLineFilters.push(`Assunto: ${selectedAssunto}`);
  }
  if (selectedResponsavel && selectedResponsavel !== 'all') {
      subjectLineFilters.push(`Responsável: ${selectedResponsavel}`);
  }
  const subjectSuffix = subjectLineFilters.length > 0 ? ` - ${subjectLineFilters.join(' | ')}` : '';
  const emailSubject = `Boletim de Acompanhamento de Prazos - ${new Date().toLocaleDateString('pt-BR')}${subjectSuffix}`;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh]" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center"><CalendarCheckIcon className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400"/>Painel de Prazos</h2>
            <div className="flex items-center gap-4">
                 <label htmlFor="show-completed-toggle" className="flex items-center cursor-pointer">
                    <span className="mr-3 text-sm font-medium text-gray-700 dark:text-gray-300">Ocultar Concluídas</span>
                    <div className="relative">
                        <input type="checkbox" id="show-completed-toggle" className="sr-only" checked={!showCompleted} onChange={() => setShowCompleted(!showCompleted)} />
                        <div className="block bg-gray-200 dark:bg-gray-600 w-10 h-6 rounded-full"></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${!showCompleted ? 'transform translate-x-full bg-blue-500' : ''}`}></div>
                    </div>
                </label>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><XIcon className="w-6 h-6" /></button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-4">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">Analisando todos os prazos...</p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center h-full text-center text-red-500">
                <AlertTriangleIcon className="w-12 h-12 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Erro ao Carregar</h3>
                <p className="max-w-md text-sm">{error}</p>
              </div>
            )}
            {!isLoading && !error && tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                <CalendarCheckIcon className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-semibold">Nenhuma Tarefa Encontrada</h3>
                <p className="max-w-md mt-1 text-sm">Não há tarefas com responsáveis e prazos definidos nas atas salvas.</p>
              </div>
            )}
            {!isLoading && !error && tasks.length > 0 && (
              <div className="space-y-3">
                {Object.entries(groupedTasks).map(([responsible, taskList]: [string, Task[]]) => {
                    const filteredTasks = taskList.filter(t => showCompleted || !t.completed);
                    if (filteredTasks.length === 0) return null;

                    return (
                        <div key={responsible} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                            <button onClick={() => toggleExpand(responsible)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <span className="font-bold text-gray-800 dark:text-gray-200">{responsible} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({filteredTasks.length} {filteredTasks.length > 1 ? 'tarefas' : 'tarefa'})</span></span>
                            <ChevronRightIcon className={`w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform ${expandedKeys[responsible] ? 'rotate-90' : ''}`} />
                            </button>
                            {expandedKeys[responsible] && (
                            <div className="p-2 space-y-2">
                                {filteredTasks.map(task => (
                                <div key={task.id} className={`p-3 rounded-lg border transition-colors ${task.completed ? 'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600' : 'bg-white dark:bg-gray-700/60 border-gray-200 dark:border-gray-600'}`}>
                                    <div className="flex items-start gap-3">
                                        <input type="checkbox" checked={task.completed} onChange={() => handleToggleCompletion(task)} className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <div className="flex-grow">
                                            <p className={`text-gray-800 dark:text-gray-200 text-sm leading-relaxed ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>{task.description}</p>
                                        </div>
                                        <div className="flex-shrink-0 text-right w-28">
                                            <div className={`px-2 py-1 text-xs font-bold rounded-full inline-block ${statusStyles[task.status]}`}>
                                                {statusText[task.status]}
                                            </div>
                                            <p className={`text-sm font-semibold mt-1 ${task.completed ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>{task.deadline}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600/50 flex justify-between items-center">
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            <p><span className="font-semibold">Origem:</span> {task.sourceAta.empreendimento} / {task.sourceAta.title} ({task.sourceAta.date})</p>
                                            {task.completed && (
                                                <div className="flex items-center mt-1">
                                                    <span className="font-semibold mr-2">Data de Conclusão:</span>
                                                    <input 
                                                        type="date" 
                                                        value={convertToInputDate(task.completionDate)} 
                                                        onChange={(e) => handleDateChange(task, e.target.value)}
                                                        className="p-1 text-xs rounded border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => onSelectAta(task.originalAta)} className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                            Ver Ata <ExternalLinkIcon className="w-3 h-3 ml-1"/>
                                        </button>
                                    </div>
                                </div>
                                ))}
                            </div>
                            )}
                        </div>
                    );
                })}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total de {tasks.length} tarefas encontradas.</p>
            <div className="flex gap-3">
                 <button type="button" onClick={() => setIsBulletinModalOpen(true)} className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800">
                    Gerar Boletim do Dia
                </button>
                <button type="button" onClick={onClose} className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800">
                    Fechar
                </button>
            </div>
          </div>
        </div>
      </div>
      <BulletinFilterModal
        isOpen={isBulletinModalOpen}
        onClose={() => setIsBulletinModalOpen(false)}
        onGenerate={handleGenerateBulletin}
        empreendimentos={uniqueEmpreendimentos}
        assuntos={uniqueAssuntos}
        responsaveis={filteredResponsaveis}
        selectedEmpreendimento={selectedEmpreendimento}
        setSelectedEmpreendimento={setSelectedEmpreendimento}
        selectedAssunto={selectedAssunto}
        setSelectedAssunto={setSelectedAssunto}
        selectedResponsavel={selectedResponsavel}
        setSelectedResponsavel={setSelectedResponsavel}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />
      <BulletinPreviewModal 
        isOpen={showBulletinPreview} 
        onClose={() => setShowBulletinPreview(false)} 
        htmlContent={emailHtml} 
        teamsHtmlContent={teamsHtml}
        adaptiveCardPayload={adaptiveCard}
        webhooks={webhooks}
        subject={emailSubject} 
      />
    </>
  );
};

export default DeadlinePanel;