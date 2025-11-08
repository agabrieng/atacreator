import React, { useState, useEffect, useMemo } from 'react';
import { getProjetos, addProjeto, updateProjeto, deleteProjeto } from '../services/firebaseService';
import type { Projetista, Projeto, ProjectStatus, Disciplina } from '../types';
import { disciplinas } from '../types';
import { BriefcaseIcon, AlertTriangleIcon, ChevronRightIcon, PlusIcon, EditIcon, TrashIcon, XIcon } from './icons';
import ConfirmationDialog from './ConfirmationDialog';

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
    const deadlineDate = new Date(deadline);
    if (deadlineDate < today) {
        return 'overdue';
    }
    return status;
}

const ProjectControlView: React.FC<{ setToast: ToastFunc; projetistas: Projetista[] }> = ({ setToast, projetistas }) => {
    const [projetos, setProjetos] = useState<Projeto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

    // Modal/Form State
    const [isProjetoModalOpen, setIsProjetoModalOpen] = useState(false);
    const [editingProjeto, setEditingProjeto] = useState<Partial<Projeto> | null>(null);
    const [projetoToDelete, setProjetoToDelete] = useState<Projeto | null>(null);

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

    const toggleExpand = (key: string) => {
        setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const projetistaMap = useMemo(() => {
        return new Map(projetistas.map(p => [p.id, p]));
    }, [projetistas]);

    // Fix: Changed interface to a type alias with Record to improve type inference.
    type GroupedData = Record<string, Record<string, Record<string, Projeto[]>>>;

    const groupedData = useMemo(() => {
        const grouped: GroupedData = {};
        
        // Sort all projects by deadline first
        const sortedProjetos = [...projetos].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

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
    }, [projetos]);

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
    
    return (
        <main className="container mx-auto p-4 md:p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <BriefcaseIcon className="w-8 h-8 mr-3 text-slate-500" />
                        Acompanhamento de Projetos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie os entregáveis das empresas projetistas contratadas.</p>
                </div>
                 <button onClick={() => { setEditingProjeto({ projetistaId: '', empreendimento: '', contrato: '', taxonomia: '', disciplina: 'Civil' }); setIsProjetoModalOpen(true); }} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm"><PlusIcon className="w-5 h-5 mr-2"/> Novo Projeto</button>
            </header>

            <div className="space-y-4">
                {Object.entries(groupedData).length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                        <BriefcaseIcon className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600 mx-auto" />
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Nenhum Projeto Cadastrado</h3>
                        <p className="max-w-md mt-1 text-sm text-slate-500 dark:text-slate-400 mx-auto">Clique em "Novo Projeto" para começar a gerenciar seus entregáveis.</p>
                    </div>
                ) : (
                    Object.entries(groupedData).map(([empreendimento, projetistasGroup]) => {
                        const empKey = `emp-${empreendimento}`;
                        const totalProjetosEmpreendimento = Object.values(projetistasGroup).flatMap(disciplinas => Object.values(disciplinas).flat()).length;
                        return (
                            <div key={empKey} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                                <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => toggleExpand(empKey)}>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{empreendimento}</h2>
                                    <div className="flex items-center"><span className="text-sm text-slate-500 dark:text-slate-400 mr-4">{totalProjetosEmpreendimento} projeto(s)</span><ChevronRightIcon className={`w-6 h-6 text-slate-500 transform transition-transform ${expandedKeys[empKey] ? 'rotate-90' : ''}`} /></div>
                                </button>
                                {expandedKeys[empKey] && (
                                    <div className="p-2 space-y-2">
                                        {Object.entries(projetistasGroup).map(([projetistaId, disciplinasGroup]) => {
                                            const projKey = `${empKey}_proj-${projetistaId}`;
                                            const projetista = projetistaMap.get(projetistaId);
                                            if (!projetista) return null;
                                            const totalProjetosProjetista = Object.values(disciplinasGroup).flat().length;
                                            return (
                                                <div key={projKey} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg ml-4">
                                                    <button className="w-full flex items-center justify-between p-3 text-left" onClick={() => toggleExpand(projKey)}>
                                                        <div className="flex items-center"><div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden mr-3">{projetista.logo ? <img src={projetista.logo} alt={projetista.name} className="w-full h-full object-cover" /> : <BriefcaseIcon className="w-4 h-4 text-slate-500"/>}</div><h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{projetista.name}</h3></div>
                                                        <div className="flex items-center"><span className="text-xs text-slate-500 dark:text-slate-400 mr-3">{totalProjetosProjetista} projeto(s)</span><ChevronRightIcon className={`w-5 h-5 text-slate-500 transform transition-transform ${expandedKeys[projKey] ? 'rotate-90' : ''}`} /></div>
                                                    </button>
                                                    {expandedKeys[projKey] && (
                                                        <div className="p-2 space-y-2">
                                                            {Object.entries(disciplinasGroup).map(([disciplina, projetosInDisciplina]) => {
                                                                const discKey = `${projKey}_disc-${disciplina}`;
                                                                return (
                                                                    <div key={discKey} className="bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-md ml-4">
                                                                        <button className="w-full flex items-center justify-between p-2 text-left" onClick={() => toggleExpand(discKey)}>
                                                                            <h4 className="font-semibold text-slate-600 dark:text-slate-300">{disciplina}</h4>
                                                                            <div className="flex items-center"><span className="text-xs text-slate-500 dark:text-slate-400 mr-2">{projetosInDisciplina.length} projeto(s)</span><ChevronRightIcon className={`w-4 h-4 text-slate-500 transform transition-transform ${expandedKeys[discKey] ? 'rotate-90' : ''}`} /></div>
                                                                        </button>
                                                                        {expandedKeys[discKey] && (
                                                                            <div className="p-4 space-y-3 border-t border-slate-100 dark:border-slate-600">
                                                                                {projetosInDisciplina.map(proj => {
                                                                                    const currentStatus = getStatusWithOverdueCheck(proj.status, proj.deadline);
                                                                                    const statusInfo = statusConfig[currentStatus];
                                                                                    return (
                                                                                        <div key={proj.id} className="grid grid-cols-[1fr,auto] gap-4 items-start p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
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

            {isProjetoModalOpen && <ProjetoFormModal initialData={editingProjeto} projetistas={projetistas} onSave={handleSaveProjeto} onClose={() => setIsProjetoModalOpen(false)} />}
             <ConfirmationDialog isOpen={!!projetoToDelete} onClose={() => setProjetoToDelete(null)} onConfirm={handleDeleteProjeto} title="Excluir Projeto" confirmText="Excluir">
                Tem certeza que deseja excluir o projeto <strong>"{projetoToDelete?.name}"</strong>?
            </ConfirmationDialog>
        </main>
    );
};

const ProjetoFormModal: React.FC<{ initialData: Partial<Projeto> | null; projetistas: Projetista[]; onSave: (data: Omit<Projeto, 'id'>) => void; onClose: () => void; }> = ({ initialData, projetistas, onSave, onClose }) => {
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
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{initialData?.id ? 'Editar' : 'Adicionar'} Projeto</h3>
                    <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                         <div>
                            <label htmlFor="projetista-select" className="block text-sm font-medium">Empresa Responsável<span className="text-red-500"> *</span></label>
                            <select id="projetista-select" value={projetistaId} onChange={e => setProjetistaId(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-900">
                                <option value="" disabled>Selecione uma empresa</option>
                                {projetistas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="empreendimento" className="block text-sm font-medium">Empreendimento<span className="text-red-500"> *</span></label>
                            <input id="empreendimento" type="text" value={empreendimento} onChange={e => setEmpreendimento(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
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
                                <input id="contrato" type="text" value={contrato} onChange={e => setContrato(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
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
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">Cancelar</button>
                    <button onClick={handleSave} disabled={!projetistaId || !name.trim() || !deadline || !empreendimento.trim() || !contrato.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-blue-400">Salvar</button>
                </div>
            </div>
        </div>
    );
};


export default ProjectControlView;