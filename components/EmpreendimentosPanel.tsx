import React, { useState, useEffect } from 'react';
import type { Empreendimento } from '../types';
import { getStates, getCitiesByState } from '../services/ibgeService';
import { BriefcaseIcon, PlusIcon, EditIcon, TrashIcon, XIcon } from './icons';
import ConfirmationDialog from './ConfirmationDialog';

type ToastFunc = (toast: { message: string; type: 'success' | 'error' } | null) => void;

interface EmpreendimentoFormModalProps {
    initialData: Partial<Empreendimento> | null;
    onSave: (data: Omit<Empreendimento, 'id'>) => Promise<void>;
    onClose: () => void;
}

const EmpreendimentoFormModal: React.FC<EmpreendimentoFormModalProps> = ({ initialData, onSave, onClose }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [contrato, setContrato] = useState(initialData?.contrato || '');
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [gestor, setGestor] = useState(initialData?.gestor || '');
    const [liderTecnico, setLiderTecnico] = useState(initialData?.liderTecnico || '');
    const [planejador, setPlanejador] = useState(initialData?.planejador || '');
    const [engenheiroResidente, setEngenheiroResidente] = useState(initialData?.engenheiroResidente || '');
    
    // State for API data
    const [states, setStates] = useState<{ sigla: string; nome: string }[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    const [isLoadingStates, setIsLoadingStates] = useState(true);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    // Fetch states on mount
    useEffect(() => {
        const fetchStates = async () => {
            setIsLoadingStates(true);
            try {
                const ibgeStates = await getStates();
                setStates(ibgeStates);
            } catch (error) {
                console.error("Failed to load states from IBGE API", error);
                // Optionally, set an error state to inform the user
            } finally {
                setIsLoadingStates(false);
            }
        };
        fetchStates();
    }, []);

    // Parse initial location when states are loaded
    useEffect(() => {
        if (initialData?.local && states.length > 0) {
            const [city, stateAbbr] = initialData.local.split(' - ');
            if (stateAbbr && states.some(s => s.sigla === stateAbbr)) {
                setSelectedState(stateAbbr);
                // Set the city here; the city list will be fetched by the next useEffect
                setSelectedCity(city);
            }
        }
    }, [initialData, states]);
    
    // Fetch cities when state changes
    useEffect(() => {
        if (selectedState) {
            const fetchCities = async () => {
                setIsLoadingCities(true);
                setCities([]);
                try {
                    const ibgeCities = await getCitiesByState(selectedState);
                    setCities(ibgeCities);
                } catch (error)
 {
                    console.error(`Failed to load cities for ${selectedState}`, error);
                } finally {
                    setIsLoadingCities(false);
                }
            };
            fetchCities();
        }
    }, [selectedState]);


    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedState(e.target.value);
        setSelectedCity(''); // Reset city when state changes
    };

    const handleSave = () => {
        if (!name.trim() || !contrato.trim() || !selectedState || !selectedCity) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        onSave({
            name: name.trim(),
            contrato: contrato.trim(),
            local: `${selectedCity} - ${selectedState}`,
            gestor: gestor.trim(),
            liderTecnico: liderTecnico.trim(),
            planejador: planejador.trim(),
            engenheiroResidente: engenheiroResidente.trim()
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{initialData?.id ? 'Editar' : 'Adicionar'} Empreendimento</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label htmlFor="emp-name" className="block text-sm font-medium">Nome<span className="text-red-500"> *</span></label>
                        <input id="emp-name" type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                    </div>
                    <div>
                        <label htmlFor="emp-contrato" className="block text-sm font-medium">Contrato<span className="text-red-500"> *</span></label>
                        <input id="emp-contrato" type="text" value={contrato} onChange={e => setContrato(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="emp-state" className="block text-sm font-medium">Estado<span className="text-red-500"> *</span></label>
                            <select id="emp-state" value={selectedState} onChange={handleStateChange} disabled={isLoadingStates} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-900">
                                {isLoadingStates ? (
                                    <option>Carregando estados...</option>
                                ) : (
                                    <>
                                        <option value="" disabled>Selecione...</option>
                                        {states.map(s => <option key={s.sigla} value={s.sigla}>{s.nome}</option>)}
                                    </>
                                )}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="emp-city" className="block text-sm font-medium">Cidade<span className="text-red-500"> *</span></label>
                            <select id="emp-city" value={selectedCity} onChange={e => setSelectedCity(e.target.value)} disabled={!selectedState || isLoadingCities} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-900">
                                {isLoadingCities ? (
                                    <option>Carregando cidades...</option>
                                ) : (
                                    <>
                                        <option value="" disabled>Selecione...</option>
                                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                                    </>
                                )}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="emp-gestor" className="block text-sm font-medium">Gestor</label>
                            <input id="emp-gestor" type="text" value={gestor} onChange={e => setGestor(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                        </div>
                        <div>
                            <label htmlFor="emp-lider" className="block text-sm font-medium">Líder Técnico</label>
                            <input id="emp-lider" type="text" value={liderTecnico} onChange={e => setLiderTecnico(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                        </div>
                        <div>
                            <label htmlFor="emp-planejador" className="block text-sm font-medium">Planejador</label>
                            <input id="emp-planejador" type="text" value={planejador} onChange={e => setPlanejador(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                        </div>
                        <div>
                            <label htmlFor="emp-engenheiro" className="block text-sm font-medium">Engenheiro Residente</label>
                            <input id="emp-engenheiro" type="text" value={engenheiroResidente} onChange={e => setEngenheiroResidente(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md">Salvar</button>
                </div>
            </div>
        </div>
    );
};


interface EmpreendimentosPanelProps {
  empreendimentos: Empreendimento[];
  onAdd: (data: Omit<Empreendimento, 'id'>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Omit<Empreendimento, 'id'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  setToast: ToastFunc;
}

const EmpreendimentosPanel: React.FC<EmpreendimentosPanelProps> = ({ empreendimentos, onAdd, onUpdate, onDelete, setToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmpreendimento, setEditingEmpreendimento] = useState<Partial<Empreendimento> | null>(null);
    const [deletingEmpreendimento, setDeletingEmpreendimento] = useState<Empreendimento | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleOpenAddModal = () => {
        setEditingEmpreendimento(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (empreendimento: Empreendimento) => {
        setEditingEmpreendimento(empreendimento);
        setIsModalOpen(true);
    };

    const handleSave = async (data: Omit<Empreendimento, 'id'>) => {
        setIsSaving(true);
        try {
            if (editingEmpreendimento && editingEmpreendimento.id) {
                await onUpdate(editingEmpreendimento.id, data);
                setToast({ message: 'Empreendimento atualizado com sucesso!', type: 'success' });
            } else {
                await onAdd(data);
                setToast({ message: 'Empreendimento adicionado com sucesso!', type: 'success' });
            }
            setIsModalOpen(false);
        } catch (error) {
            // Error toast is already handled in App.tsx
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleConfirmDelete = async () => {
        if (deletingEmpreendimento) {
            try {
                await onDelete(deletingEmpreendimento.id);
                setToast({ message: 'Empreendimento excluído com sucesso!', type: 'success' });
                setDeletingEmpreendimento(null);
            } catch (error) {
                // Error toast is already handled in App.tsx
            }
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Empreendimentos</h2>
                    <button onClick={handleOpenAddModal} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Novo Empreendimento
                    </button>
                </div>
                
                <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie os projetos/obras onde as reuniões acontecem.</p>

                <div className="pt-4">
                    {empreendimentos.length === 0 ? (
                        <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">Nenhum empreendimento cadastrado.</p>
                    ) : (
                        <ul className="space-y-2">
                            {empreendimentos.map(p => (
                                <li key={p.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-800 dark:text-slate-200 font-semibold">{p.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{p.contrato} &bull; {p.local}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleOpenEditModal(p)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => setDeletingEmpreendimento(p)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            {isModalOpen && <EmpreendimentoFormModal initialData={editingEmpreendimento} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            <ConfirmationDialog
                isOpen={!!deletingEmpreendimento}
                onClose={() => setDeletingEmpreendimento(null)}
                onConfirm={handleConfirmDelete}
                title="Excluir Empreendimento"
                confirmText="Excluir"
            >
                Tem certeza que deseja excluir o empreendimento <strong>"{deletingEmpreendimento?.name}"</strong>?
            </ConfirmationDialog>
        </>
    );
};

export default EmpreendimentosPanel;