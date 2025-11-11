import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getProjetos, addProjeto, updateProjeto, deleteProjeto } from '../services/firebaseService';
import type { Projetista, Projeto, ProjectStatus, Disciplina, Empreendimento } from '../types';
import { disciplinas } from '../types';
import { BriefcaseIcon, AlertTriangleIcon, ChevronRightIcon, PlusIcon, EditIcon, TrashIcon, XIcon, SearchIcon, FilterIcon } from './icons';
import ConfirmationDialog from './ConfirmationDialog';
import type { ItemToHighlight } from '../App';


// Define a type for the toast function prop for better type safety.
type ToastFunc = (toast: { message: string; type: 'success' | 'error' } | null) => void;

const statusConfig: Record<ProjectStatus, { text: string; classes: string }> = {
    pending: { text: 'Pendente', classes: 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200' },
    'in-progress': { text: 'Em Andamento', classes: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' },
    completed: { text: 'Concluído', classes: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' },
    overdue: { text: 'Atrasado', classes: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' },
};

const getStatusWithOverdueCheck = (status: ProjectStatus, deadline: string): ProjectStatus => {
    if (status === 'completed') {
        return 'completed';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(`${deadline}T00:00:00`);
    if (deadlineDate < today) {
        return 'overdue';
    }
    return status;
}

const ProjectControlView: React.FC<{ 
    setToast: ToastFunc; 
    projetistas: Projetista[], 
    empreendimentos: Empreendimento[],
    itemToHighlight: ItemToHighlight;
    clearHighlight: () => void;
}> = ({ setToast, projetistas, empreendimentos, itemToHighlight, clearHighlight }) => {
    const [projetos, setProjetos] = useState<Projeto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const projectRefs = useRef<Record<string, HTMLDivElement | null>>({});

    
    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmpreendimento, setSelectedEmpreendimento] = useState('all');
    const [selectedProjetista, setSelectedProjetista] = useState('all');
    const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | 'all'>('all');
    const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | 'all'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // State for user's manual interactions with accordions
    const [manualExpandedKeys, setManualExpandedKeys] = useState<Record<string, boolean>>({});
    // State for what is actually displayed as expanded/collapsed
    const [displayExpandedKeys, setDisplayExpandedKeys] = useState<Record<string, boolean>>({});
    const [pendingHighlightId, setPendingHighlightId] = useState<string | null>(null);


    // Modal/Form State
    const [isProjetoModalOpen, setIsProjetoModalOpen] = useState(false);
    const [editingProjeto, setEditingProjeto] = useState<Partial<Projeto> | null>(null);
    const [projetoToDelete, setProjetoToDelete] = useState<Projeto | null>(null);

    const isFiltering = useMemo(() => {
        return (
            searchQuery.trim() !== '' ||
            selectedEmpreendimento !== 'all' ||
            selectedProjetista !== 'all' ||
            selectedDisciplina !== 'all' ||
            selectedStatus !== 'all' ||
            startDate !== '' ||
            endDate !== ''
        );
    }, [searchQuery, selectedEmpreendimento, selectedProjetista, selectedDisciplina, selectedStatus, startDate, endDate]);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const loadedProjetos = await getProjetos();
            setProjetos(loadedProjetos);
        } catch (err: any) {
            setError(`Falha ao carregar dados: ${err.message}`);
            setToast({ message: `Falha ao carregar dados: ${err.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const projetistaMap = useMemo(() => {
        return new Map(projetistas.map(p => [p.id, p]));
    }, [projetistas]);

    const uniqueEmpreendimentos = useMemo(() => {
        return Array.from(new Set(projetos.map(p => p.empreendimento))).sort();
    }, [projetos]);

    const filteredProjetos = useMemo(() => {
        return projetos.filter(projeto => {
            const currentStatus = getStatusWithOverdueCheck(projeto.status, projeto.deadline);

            if (selectedEmpreendimento !== 'all' && projeto.empreendimento !== selectedEmpreendimento) return false;
            if (selectedProjetista !== 'all' && projeto.projetistaId !== selectedProjetista) return false;
            if (selectedDisciplina !== 'all' && projeto.disciplina !== selectedDisciplina) return false;
            if (selectedStatus !== 'all' && currentStatus !== selectedStatus) return false;

            if (startDate || endDate) {
                const deadlineDate = new Date(`${projeto.deadline}T00:00:00`);
                if (startDate) {
                    const start = new Date(`${startDate}T00:00:00`);
                    if (deadlineDate < start) return false;
                }
                if (endDate) {
                    const end = new Date(`${endDate}T00:00:00`);
                    if (deadlineDate > end) return false;
                }
            }

            if (searchQuery.trim()) {
                const lowercasedQuery = searchQuery.toLowerCase();
                const projetista = projetistaMap.get(projeto.projetistaId);
                const matches =
                    projeto.name.toLowerCase().includes(lowercasedQuery) ||
                    projeto.description.toLowerCase().includes(lowercasedQuery) ||
                    projeto.contrato.toLowerCase().includes(lowercasedQuery) ||
                    (projeto.taxonomia && projeto.taxonomia.toLowerCase().includes(lowercasedQuery)) ||
                    projeto.empreendimento.toLowerCase().includes(lowercasedQuery) ||
                    (projetista && projetista.name.toLowerCase().includes(lowercasedQuery));
                if (!matches) return false;
            }

            return true;
        });
    }, [projetos, searchQuery, selectedEmpreendimento, selectedProjetista, selectedDisciplina, selectedStatus, startDate, endDate, projetistaMap]);

    // Effect 1: Trigger expansion and set pending ID when itemToHighlight changes.
    useEffect(() => {
        if (itemToHighlight?.type === 'project') {
            const project = projetos.find(p => p.id === itemToHighlight.id);
            if (project) {
                // Set the ID that we need to highlight later.
                setPendingHighlightId(itemToHighlight.id);

                // Determine all keys needed for expansion.
                const empKey = `emp-${project.empreendimento}`;
                const projKey = `${empKey}_proj-${project.projetistaId}`;
                const discKey = `${projKey}_disc-${project.disciplina}`;
                
                // Trigger expansion for all necessary accordions.
                setManualExpandedKeys(prev => ({
                    ...prev,
                    [empKey]: true,
                    [projKey]: true,
                    [discKey]: true,
                }));
            } else if (!isLoading) {
                // Project not found after loading, clean up.
                clearHighlight();
            }
        }
    }, [itemToHighlight, projetos, isLoading]);

    // Effect 2: Sync manual/filter state to the actual display state.
    useEffect(() => {
        if (isFiltering) {
            const keysToExpand: Record<string, boolean> = {};
            if (filteredProjetos.length > 0) {
                filteredProjetos.forEach(projeto => {
                    const empKey = `emp-${projeto.empreendimento}`;
                    const projKey = `${empKey}_proj-${projeto.projetistaId}`;
                    const discKey = `${projKey}_disc-${projeto.disciplina}`;
                    keysToExpand[empKey] = true;
                    keysToExpand[projKey] = true;
                    keysToExpand[discKey] = true;
                });
            }
            setDisplayExpandedKeys(keysToExpand);
        } else {
            setDisplayExpandedKeys(manualExpandedKeys);
        }
    }, [isFiltering, filteredProjetos, manualExpandedKeys]);

    // Effect 3: Perform scroll/highlight after a re-render, based on pending ID and display state.
    useEffect(() => {
        // Only proceed if there's a pending highlight and data has loaded.
        if (pendingHighlightId && !isLoading) {
            const project = projetos.find(p => p.id === pendingHighlightId);
            if (!project) {
                setPendingHighlightId(null); // Clean up if project disappears
                return;
            }
            
            const projectElement = projectRefs.current[pendingHighlightId];
            const empKey = `emp-${project.empreendimento}`;
            const projKey = `${empKey}_proj-${project.projetistaId}`;
            const discKey = `${projKey}_disc-${project.disciplina}`;

            // CRUCIAL CHECK: Are all accordions expanded in the display state AND is the element rendered?
            if (displayExpandedKeys[empKey] && displayExpandedKeys[projKey] && displayExpandedKeys[discKey] && projectElement) {
                
                // A small timeout helps ensure the browser has painted the expanded content before scrolling.
                const scrollTimer = setTimeout(() => {
                    projectElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    projectElement.classList.add('highlight-animation');
            
                    const animationTimer = setTimeout(() => {
                        projectElement.classList.remove('highlight-animation');
                    }, 2000);
                    
                    return () => clearTimeout(animationTimer);
                }, 100);

                // Clean up state to prevent re-running.
                setPendingHighlightId(null);
                clearHighlight();
                
                return () => clearTimeout(scrollTimer);
            }
        }
    }, [pendingHighlightId, displayExpandedKeys, projetos, isLoading, clearHighlight]);


    const toggleExpand = (key: string) => {
        setManualExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Fix: Changed interface to a type alias with Record to improve type inference.
    type GroupedData = Record<string, Record<string, Record<string, Projeto[]>>>;

    const groupedData = useMemo(() => {
        const grouped: GroupedData = {};
        
        // Sort all projects by deadline first
        const sortedProjetos = [...filteredProjetos].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

        for (const projeto of sortedProjetos) {
            const emp = projeto.empreendimento || 'Sem Empreendimento';
            const projId = projeto.projetistaId;
            const disc = projeto.disciplina || 'Sem Disciplina';

            if (!grouped[emp]) grouped[emp] = {};
            if (!grouped[emp][projId]) grouped[emp][projId] = {};
            if (!grouped[emp][projId][disc]) grouped[emp][projId][disc] = [];
            
            grouped[emp][projId][disc].push(projeto);
        }
        return grouped;
    }, [filteredProjetos]);

    const resetFilters = () => {
        setSearchQuery('');
        setSelectedEmpreendimento('all');
        setSelectedProjetista('all');
        setSelectedDisciplina('all');
        setSelectedStatus('all');
        setStartDate('');
        setEndDate('');
    };

    // Handlers for Projetos
    const handleSaveProjeto = async (data: Omit<Projeto, 'id'>) => {
        try {
            if (editingProjeto && editingProjeto.id) {
                await updateProjeto(editingProjeto.id, data);
                setToast({ message: 'Projeto atualizado com sucesso!', type: 'success' });
            } else {
                await addProjeto(data);
                setToast({ message: 'Projeto adicionado com sucesso!', type: 'success' });
            }
            fetchData();
            setIsProjetoModalOpen(false);
        } catch (err: any) {
            setToast({ message: `Erro ao salvar projeto: ${err.message}`, type: 'error' });
        }
    };

     const handleDeleteProjeto = async () => {
        if (!projetoToDelete) return;
        try {
            await deleteProjeto(projetoToDelete.id);
            setToast({ message: 'Projeto excluído com sucesso!', type: 'success' });
            fetchData();
            setProjetoToDelete(null);
        } catch (err: any) {
            setToast({ message: `Erro ao excluir projeto: ${err.message}`, type: 'error' });
        }
    };
    
    // Fix: Refactored logic to be clearer and avoid type comparison error.
    const handleStatusChange = async (projeto: Projeto, newStatus: ProjectStatus) => {
        const dataToUpdate: Partial<Projeto> = { status: newStatus };
        const wasCompleted = projeto.status === 'completed';
        const isNowCompleted = newStatus === 'completed';

        if (isNowCompleted && !wasCompleted) {
            dataToUpdate.dataEntrega = new Date().toISOString().split('T')[0];
        } else if (wasCompleted && !isNowCompleted) {
            dataToUpdate.dataEntrega = null;
        }

        try {
            await updateProjeto(projeto.id, dataToUpdate);
            setProjetos(prev => prev.map(p => p.id === projeto.id ? {...p, ...dataToUpdate} : p));
        } catch (err: any) {
            setToast({ message: `Erro ao atualizar status: ${err.message}`, type: 'error' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <AlertTriangleIcon className="w-16 h-16 mb-4 text-red-500" />
                <h3 className="text-xl font-semibold mb-3 text-slate-800 dark:text-slate-100">Ocorreu um Erro</h3>
                <p className="max-w-md text-slate-600 dark:text-slate-300">{error}</p>
            </div>
        );
    }
    
    const FilterInput: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => (
        <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
            {children}
        </div>
    );
    
    return (
        <main className="container mx-auto p-4 md:p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <BriefcaseIcon className="w-8 h-8 mr-3 text-slate-500" />
                        Cronograma de Projetos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie os entregáveis das empresas projetistas contratadas.</p>
                </div>
                 <button onClick={() => { setEditingProjeto({ projetistaId: '', empreendimento: '', contrato: '', taxonomia: '', disciplina: 'Civil' }); setIsProjetoModalOpen(true); }} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm"><PlusIcon className="w-5 h-5 mr-2"/> Novo Projeto</button>
            </header>

            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    <div className="xl:col-span-2">
                        <FilterInput label="Buscar por Termo">
                             <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                                <input
                                    type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Nome, contrato, empresa..."
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </FilterInput>
                    </div>
                    <FilterInput label="Empreendimento">
                         <select value={selectedEmpreendimento} onChange={e => setSelectedEmpreendimento(e.target.value)} className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm">
                            <option value="all">Todos</option>
                            {uniqueEmpreendimentos.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </FilterInput>
                    <FilterInput label="Empresa Projetista">
                         <select value={selectedProjetista} onChange={e => setSelectedProjetista(e.target.value)} className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm">
                            <option value="all">Todas</option>
                            {projetistas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </FilterInput>
                    <FilterInput label="Disciplina">
                         <select value={selectedDisciplina} onChange={e => setSelectedDisciplina(e.target.value as any)} className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm">
                            <option value="all">Todas</option>
                            {disciplinas.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </FilterInput>
                    <FilterInput label="Status">
                         <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as any)} className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm">
                            <option value="all">Todos</option>
                            {Object.entries(statusConfig).map(([key, value]) => (<option key={key} value={key}>{value.text}</option>))}
                        </select>
                    </FilterInput>
                    <div className="sm:col-span-2 lg:col-span-4 xl:col-span-3 grid grid-cols-2 gap-4">
                        <FilterInput label="Prazo de">
                             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"/>
                        </FilterInput>
                        <FilterInput label="Prazo até">
                             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"/>
                        </FilterInput>
                    </div>
                     <div className="flex items-end">
                        <button onClick={resetFilters} className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-700 font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600">
                            Limpar Filtros
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {Object.entries(groupedData).length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                        {isFiltering ? (
                            <>
                                <SearchIcon className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600 mx-auto" />
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Nenhum Projeto Encontrado</h3>
                                <p className="max-w-md mt-1 text-sm text-slate-500 dark:text-slate-400 mx-auto">Tente ajustar seus filtros ou clique em "Limpar Filtros".</p>
                            </>
                        ) : (
                            <>
                                <BriefcaseIcon className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600 mx-auto" />
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Nenhum Projeto Cadastrado</h3>
                                <p className="max-w-md mt-1 text-sm text-slate-500 dark:text-slate-400 mx-auto">Clique em "Novo Projeto" para começar a gerenciar seus entregáveis.</p>
                            </>
                        )}
                    </div>
                ) : (
                    Object.entries(groupedData).map(([empreendimento, projetistasGroup]) => {
                        const empKey = `emp-${empreendimento}`;
                        const totalProjetosEmpreendimento = Object.values(projetistasGroup).flatMap(disciplinas => Object.values(disciplinas).flat()).length;
                        return (
                            <div key={empKey} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                                <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => toggleExpand(empKey)}>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{empreendimento}</h2>
                                    <div className="flex items-center"><span className="text-sm text-slate-500 dark:text-slate-400 mr-4">{totalProjetosEmpreendimento} projeto(s)</span><ChevronRightIcon className={`w-6 h-6 text-slate-500 transform transition-transform ${displayExpandedKeys[empKey] ? 'rotate-90' : ''}`} /></div>
                                </button>
                                {displayExpandedKeys[empKey] && (
                                    <div className="p-2 space-y-2">
                                        {Object.entries(projetistasGroup).map(([projetistaId, disciplinasGroup]) => {
                                            // FIX: Cast disciplinasGroup to its correct type to resolve TS inference error.
                                            const discGroupTyped = disciplinasGroup as Record<string, Projeto[]>;
                                            const projKey = `${empKey}_proj-${projetistaId}`;
                                            const projetista = projetistaMap.get(projetistaId);
                                            if (!projetista) return null;
                                            const totalProjetosProjetista = Object.values(discGroupTyped).flat().length;
                                            return (
                                                <div key={projKey} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg ml-4">
                                                    <button className="w-full flex items-center justify-between p-3 text-left" onClick={() => toggleExpand(projKey)}>
                                                        <div className="flex items-center"><div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden mr-3">{projetista.logo ? <img src={projetista.logo} alt={projetista.name} className="w-full h-full object-cover" /> : <BriefcaseIcon className="w-4 h-4 text-slate-500"/>}</div><h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{projetista.name}</h3></div>
                                                        <div className="flex items-center"><span className="text-xs text-slate-500 dark:text-slate-400 mr-3">{totalProjetosProjetista} projeto(s)</span><ChevronRightIcon className={`w-5 h-5 text-slate-500 transform transition-transform ${displayExpandedKeys[projKey] ? 'rotate-90' : ''}`} /></div>
                                                    </button>
                                                    {displayExpandedKeys[projKey] && (
                                                        <div className="p-2 space-y-2">
                                                            {Object.entries(discGroupTyped).map(([disciplina, projetosInDisciplina]) => {
                                                                const discKey = `${projKey}_disc-${disciplina}`;
                                                                return (
                                                                    <div key={discKey} className="bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-md ml-4">
                                                                        <button className="w-full flex items-center justify-between p-2 text-left" onClick={() => toggleExpand(discKey)}>
                                                                            <h4 className="font-semibold text-slate-600 dark:text-slate-300">{disciplina}</h4>
                                                                            <div className="flex items-center"><span className="text-xs text-slate-500 dark:text-slate-400 mr-2">{projetosInDisciplina.length} projeto(s)</span><ChevronRightIcon className={`w-4 h-4 text-slate-500 transform transition-transform ${displayExpandedKeys[discKey] ? 'rotate-90' : ''}`} /></div>
                                                                        </button>
                                                                        {displayExpandedKeys[discKey] && (
                                                                            <div className="p-4 space-y-3 border-t border-slate-100 dark:border-slate-600">
                                                                                {projetosInDisciplina.map(proj => {
                                                                                    const currentStatus = getStatusWithOverdueCheck(proj.status, proj.deadline);
                                                                                    const statusInfo = statusConfig[currentStatus];
                                                                                    return (
                                                                                        <div 
                                                                                            key={proj.id} 
                                                                                            ref={el => projectRefs.current[proj.id] = el}
                                                                                            className="grid grid-cols-[1fr,auto] gap-4 items-start p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                                                                                        >
                                                                                            <div>
                                                                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{proj.name}</p>
                                                                                                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                                                                                    <div><strong>Contrato:</strong> {proj.contrato}</div>
                                                                                                    <div><strong>Taxonomia:</strong> {proj.taxonomia || 'N/A'}</div>
                                                                                                    {proj.dataEntrega && <div><strong>Entregue em:</strong> {new Date(proj.dataEntrega).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex flex-col items-end justify-between h-full">
                                                                                                <div className="text-right">
                                                                                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Prazo Acordado</p>
                                                                                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{new Date(proj.deadline).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2 mt-2">
                                                                                                    <select value={proj.status} onChange={e => handleStatusChange(proj, e.target.value as ProjectStatus)} className={`text-xs font-bold rounded-full px-3 py-1 border-0 focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-blue-500 ${statusInfo.classes}`}>
                                                                                                        {Object.entries(statusConfig).filter(([key]) => key !== 'overdue').map(([key, value]) => (<option key={key} value={key}>{value.text}</option>))}
                                                                                                    </select>
                                                                                                    <button onClick={() => { setEditingProjeto(proj); setIsProjetoModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full"><EditIcon className="w-4 h-4" /></button>
                                                                                                    <button onClick={() => setProjetoToDelete(proj)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4" /></button>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {isProjetoModalOpen && <ProjetoFormModal initialData={editingProjeto} projetistas={projetistas} empreendimentos={empreendimentos} onSave={handleSaveProjeto} onClose={() => setIsProjetoModalOpen(false)} />}
             <ConfirmationDialog isOpen={!!projetoToDelete} onClose={() => setProjetoToDelete(null)} onConfirm={handleDeleteProjeto} title="Excluir Projeto" confirmText="Excluir">
                Tem certeza que deseja excluir o projeto <strong>"{projetoToDelete?.name}"</strong>?
            </ConfirmationDialog>
        </main>
    );
};

const ProjetoFormModal: React.FC<{ 
    initialData: Partial<Projeto> | null; 
    projetistas: Projetista[]; 
    empreendimentos: Empreendimento[];
    onSave: (data: Omit<Projeto, 'id'>) => void; 
    onClose: () => void; 
}> = ({ initialData, projetistas, empreendimentos, onSave, onClose }) => {
    const [projetistaId, setProjetistaId] = useState(initialData?.projetistaId || '');
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [deadline, setDeadline] = useState(initialData?.deadline || '');
    const [status, setStatus] = useState<ProjectStatus>(initialData?.status || 'pending');
    const [empreendimento, setEmpreendimento] = useState(initialData?.empreendimento || '');
    const [contrato, setContrato] = useState(initialData?.contrato || '');
    const [taxonomia, setTaxonomia] = useState(initialData?.taxonomia || '');
    const [disciplina, setDisciplina] = useState<Disciplina>(initialData?.disciplina || 'Civil');
    const [dataEntrega, setDataEntrega] = useState<string | null | undefined>(initialData?.dataEntrega);

    useEffect(() => {
        const selectedEmpreendimento = empreendimentos.find(e => e.name === empreendimento);
        if (selectedEmpreendimento) {
            setContrato(selectedEmpreendimento.contrato);
        } else if (!initialData?.id) { 
            // Only clear contrato if it's a new project and empreendimento is deselected
            setContrato('');
        }
    }, [empreendimento, empreendimentos, initialData]);

    const handleSave = () => {
        if (projetistaId && name.trim() && deadline && empreendimento.trim() && contrato.trim()) {
            let finalDataEntrega = dataEntrega;
            if (status === 'completed' && !finalDataEntrega) {
                finalDataEntrega = new Date().toISOString().split('T')[0];
            }
            if (status !== 'completed') {
                finalDataEntrega = null;
            }
            
            onSave({ 
                projetistaId, 
                name: name.trim(), 
                description: description.trim(), 
                deadline, 
                status,
                empreendimento: empreendimento.trim(),
                contrato: contrato.trim(),
                taxonomia: taxonomia.trim(),
                disciplina,
                dataEntrega: finalDataEntrega
            });
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{initialData?.id ? 'Editar' : 'Adicionar'} Projeto</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label htmlFor="projetista-select" className="block text-sm font-medium">Empresa Responsável<span className="text-red-500"> *</span></label>
                        <select id="projetista-select" value={projetistaId} onChange={e => setProjetistaId(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-900">
                            <option value="" disabled>Selecione uma empresa</option>
                            {projetistas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="empreendimento-select" className="block text-sm font-medium">Empreendimento<span className="text-red-500"> *</span></label>
                        <select 
                            id="empreendimento-select" 
                            value={empreendimento} 
                            onChange={e => setEmpreendimento(e.target.value)} 
                            className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                        >
                            <option value="" disabled>Selecione um empreendimento</option>
                            {empreendimentos.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="projeto-name" className="block text-sm font-medium">Nome do Projeto/Entregável<span className="text-red-500"> *</span></label>
                        <input id="projeto-name" type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                    </div>
                    <div>
                        <label htmlFor="projeto-desc" className="block text-sm font-medium">Descrição</label>
                        <textarea id="projeto-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 resize-y" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="contrato" className="block text-sm font-medium">Nº do Contrato<span className="text-red-500"> *</span></label>
                            <input 
                                id="contrato" 
                                type="text" 
                                value={contrato} 
                                readOnly 
                                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-900 cursor-not-allowed" 
                            />
                        </div>
                        <div>
                            <label htmlFor="taxonomia" className="block text-sm font-medium">Taxonomia (Código)</label>
                            <input id="taxonomia" type="text" value={taxonomia} onChange={e => setTaxonomia(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                        </div>
                        <div>
                            <label htmlFor="disciplina" className="block text-sm font-medium">Disciplina<span className="text-red-500"> *</span></label>
                            <select id="disciplina" value={disciplina} onChange={e => setDisciplina(e.target.value as Disciplina)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700">
                                {disciplinas.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="projeto-deadline" className="block text-sm font-medium">Prazo<span className="text-red-500"> *</span></label>
                            <input id="projeto-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                        </div>
                        <div>
                            <label htmlFor="projeto-status" className="block text-sm font-medium">Status</label>
                            <select id="projeto-status" value={status} onChange={e => setStatus(e.target.value as ProjectStatus)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700">
                                {Object.entries(statusConfig).filter(([key]) => key !== 'overdue').map(([key, value]) => (
                                    <option key={key} value={key}>{value.text}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {status === 'completed' && (
                        <div>
                            <label htmlFor="data-entrega" className="block text-sm font-medium">Data de Entrega<span className="text-red-500"> *</span></label>
                            <input id="data-entrega" type="date" value={dataEntrega || ''} onChange={e => setDataEntrega(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                        </div>
                    )}
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">Cancelar</button>
                    <button onClick={handleSave} disabled={!projetistaId || !name.trim() || !deadline || !empreendimento.trim() || !contrato.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-blue-400">Salvar</button>
                </div>
            </div>
        </div>
    );
};

export default ProjectControlView;