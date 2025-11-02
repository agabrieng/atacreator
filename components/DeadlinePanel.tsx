import React, { useState, useEffect, useMemo } from 'react';
import type { AtaData, Task, GroupedTasks, AdminSettings } from '../types';
// FIX: Import `getTaskStatus` to resolve reference error.
import { getAllTasks, groupTasksByResponsible, getTaskStatus } from '../services/taskService';
import { saveAtaToFirebase } from '../services/firebaseService';
import { generateDailyBulletinHtml } from '../services/emailService';
import { XIcon, AlertTriangleIcon, CalendarCheckIcon, ChevronRightIcon, ExternalLinkIcon } from './icons';

interface DeadlinePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAta: (ata: AtaData) => void;
  adminSettings: AdminSettings | null;
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


const EmailPreviewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    htmlContent: string;
}> = ({ isOpen, onClose, htmlContent }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Pré-visualização do Boletim Diário</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-4 bg-gray-200 dark:bg-gray-900 text-sm font-mono rounded-t-md">
                    <p><span className="font-semibold text-gray-600 dark:text-gray-400">Para:</span> agabriengenharia@gmail.com</p>
                    <p><span className="font-semibold text-gray-600 dark:text-gray-400">Assunto:</span> Boletim Diário de Prazos - {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
                <iframe srcDoc={htmlContent} title="Email Preview" className="w-full flex-grow border-0" />
            </div>
        </div>
    );
};

const DeadlinePanel: React.FC<DeadlinePanelProps> = ({ isOpen, onClose, onSelectAta, adminSettings }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailHtml, setEmailHtml] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);

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

  const groupedTasks = useMemo(() => groupTasksByResponsible(tasks), [tasks]);
  
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
                 // Optional: re-fetch to ensure data consistency after save
                 // await fetchAndSetTasks();
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
  
  const handleGenerateEmail = () => {
    const html = generateDailyBulletinHtml(tasks, adminSettings);
    setEmailHtml(html);
    setShowEmailPreview(true);
  };

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
                 <button type="button" onClick={handleGenerateEmail} className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800">
                    Gerar Boletim do Dia
                </button>
                <button type="button" onClick={onClose} className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800">
                    Fechar
                </button>
            </div>
          </div>
        </div>
      </div>
      <EmailPreviewModal isOpen={showEmailPreview} onClose={() => setShowEmailPreview(false)} htmlContent={emailHtml} />
    </>
  );
};

export default DeadlinePanel;