import React, { useState, useEffect, useMemo } from 'react';
import type { AtaData } from '../types';
import { loadAtasFromFirebase, deleteAtaFromFirebase } from '../services/firebaseService';
import { ArchiveIcon, SearchIcon, AlertTriangleIcon, FileTextIcon, ExternalLinkIcon, TrashIcon, ChevronRightIcon } from './icons';
import ConfirmationDialog from './ConfirmationDialog';

// Helper to parse DD/MM/YYYY date strings for sorting/filtering
const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            // Basic validation to check if the constructed date is valid
            const date = new Date(year, month, day);
            if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                return date;
            }
        }
    }
    return null;
};


const AtaCard: React.FC<{
    ata: AtaData;
    onView: (ata: AtaData) => void;
    onDelete: (ata: AtaData) => void;
}> = ({ ata, onView, onDelete }) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border dark:border-slate-700 p-5 flex flex-col justify-between hover:shadow-xl hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-200">
            <div>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full">{ata.empreendimento}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{ata.data}</span>
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate mb-1" title={ata.titulo}>{ata.titulo}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2" title={ata.assunto}>{ata.assunto}</p>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                    onClick={() => onDelete(ata)}
                    title="Excluir Ata"
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onView(ata)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-blue-500"
                >
                    <ExternalLinkIcon className="w-4 h-4 mr-2" />
                    Visualizar
                </button>
            </div>
        </div>
    );
};

interface AtaRepositoryViewProps {
    onNavigateToAta: (ata: AtaData) => void;
}

const AtaRepositoryView: React.FC<AtaRepositoryViewProps> = ({ onNavigateToAta }) => {
    const [atas, setAtas] = useState<AtaData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmpreendimento, setSelectedEmpreendimento] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // State for collapsible sections
    const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

    // Delete confirmation state
    const [ataToDelete, setAtaToDelete] = useState<AtaData | null>(null);

    const fetchAtas = async () => {
        try {
            setIsLoading(true);
            const loadedAtas = await loadAtasFromFirebase();
            setAtas(loadedAtas);
        } catch (err: any) {
            setError(`Falha ao carregar atas: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAtas();
    }, []);

    const uniqueEmpreendimentos = useMemo(() => {
        const empreendimentos = new Set(atas.map(ata => ata.empreendimento));
        return Array.from(empreendimentos).sort();
    }, [atas]);

    const filteredAndSortedAtas = useMemo(() => {
        return atas
            .filter(ata => {
                // Search query filter
                const query = searchQuery.toLowerCase();
                const matchesQuery = query === '' ||
                    ata.titulo.toLowerCase().includes(query) ||
                    ata.assunto.toLowerCase().includes(query) ||
                    ata.participantes.some(p => p.nome.toLowerCase().includes(query));

                // Empreendimento filter
                const matchesEmpreendimento = selectedEmpreendimento === 'all' || ata.empreendimento === selectedEmpreendimento;

                // Date filter
                const ataDate = parseDate(ata.data);
                if (!ataDate) return false; // Exclude atas with invalid dates

                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;
                if (start) start.setHours(0,0,0,0);
                if (end) end.setHours(23,59,59,999);

                const matchesDate = (!start || ataDate >= start) && (!end || ataDate <= end);

                return matchesQuery && matchesEmpreendimento && matchesDate;
            })
            .sort((a, b) => {
                const dateA = parseDate(a.data) || new Date(0);
                const dateB = parseDate(b.data) || new Date(0);
                return dateB.getTime() - dateA.getTime(); // Sort descending
            });
    }, [atas, searchQuery, selectedEmpreendimento, startDate, endDate]);
    
    type GroupedAtas = {
        [empreendimento: string]: {
            [titulo: string]: {
                [assunto: string]: {
                    [data: string]: AtaData[];
                };
            };
        };
    };

    const groupedAtas = useMemo(() => {
        return filteredAndSortedAtas.reduce((acc: GroupedAtas, ata) => {
            const empreendimento = ata.empreendimento || 'Sem Empreendimento';
            const titulo = ata.titulo || 'Sem Título';
            const assunto = ata.assunto || 'Sem Assunto';
            const data = ata.data || 'Sem Data';

            if (!acc[empreendimento]) acc[empreendimento] = {};
            if (!acc[empreendimento][titulo]) acc[empreendimento][titulo] = {};
            if (!acc[empreendimento][titulo][assunto]) acc[empreendimento][titulo][assunto] = {};
            if (!acc[empreendimento][titulo][assunto][data]) acc[empreendimento][titulo][assunto][data] = [];
            
            acc[empreendimento][titulo][assunto][data].push(ata);
            return acc;
        }, {} as GroupedAtas);
    }, [filteredAndSortedAtas]);
    
    const resetFilters = () => {
        setSearchQuery('');
        setSelectedEmpreendimento('all');
        setStartDate('');
        setEndDate('');
    };

    const toggleExpand = (key: string) => {
        setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
    };
    
    const handleDeleteRequest = (ata: AtaData) => {
        setAtaToDelete(ata);
    };

    const handleConfirmDelete = async () => {
        if (!ataToDelete || !ataToDelete.id) return;
        try {
            await deleteAtaFromFirebase(ataToDelete.id);
            setAtas(prev => prev.filter(a => a.id !== ataToDelete.id));
        } catch (error: any) {
            setError(`Erro ao excluir a ata: ${error.message}`);
        } finally {
            setAtaToDelete(null);
        }
    };

    return (
        <>
        <main className="container mx-auto p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                    <ArchiveIcon className="w-8 h-8 mr-3 text-slate-500" />
                    Repositório de Atas
                </h1>
                <p className="text-slate-500 dark:text-slate-400">Busque, filtre e gerencie todas as atas de reunião salvas.</p>
            </header>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-2">
                        <label htmlFor="search-query" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Buscar</label>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="text" 
                                id="search-query"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Título, assunto, participante..."
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="empreendimento-filter" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Empreendimento</label>
                        <select
                            id="empreendimento-filter"
                            value={selectedEmpreendimento}
                            onChange={e => setSelectedEmpreendimento(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
                        >
                            <option value="all">Todos</option>
                            {uniqueEmpreendimentos.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 lg:col-span-2">
                        <div className="flex-1">
                            <label htmlFor="start-date" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Data Início</label>
                            <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"/>
                        </div>
                        <div className="flex-1">
                            <label htmlFor="end-date" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Data Fim</label>
                            <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"/>
                        </div>
                    </div>
                     <div className="lg:col-start-5 flex items-end">
                        <button onClick={resetFilters} className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">
                            Limpar
                        </button>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-16">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-slate-600 dark:text-slate-300">Carregando atas...</p>
                </div>
            ) : error ? (
                 <div className="flex flex-col items-center justify-center h-full text-center text-red-500 py-16">
                    <AlertTriangleIcon className="w-12 h-12 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Erro ao Carregar</h3>
                    <p className="max-w-md text-sm">{error}</p>
                </div>
            ) : (
                <>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        Exibindo resultados para {filteredAndSortedAtas.length} de {atas.length} ata(s).
                    </p>
                    {filteredAndSortedAtas.length > 0 ? (
                        <div className="space-y-3">
                            {Object.entries(groupedAtas).map(([empreendimento, titulos]) => {
                                const empKey = empreendimento;
                                return (
                                <div key={empKey} className="border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <button onClick={() => toggleExpand(empKey)} className="w-full flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/60 rounded-t-lg">
                                        <span className="font-bold text-lg text-slate-800 dark:text-slate-100">{empreendimento}</span>
                                        <ChevronRightIcon className={`w-5 h-5 text-slate-500 transform transition-transform ${expandedKeys[empKey] ? 'rotate-90' : ''}`} />
                                    </button>
                                    {expandedKeys[empKey] && (
                                        <div className="p-2 space-y-2">
                                            {Object.entries(titulos).map(([titulo, assuntos]) => {
                                                const tituloKey = `${empKey}|${titulo}`;
                                                return (
                                                    <div key={tituloKey} className="border border-slate-200 dark:border-slate-600 rounded-md ml-4">
                                                        <button onClick={() => toggleExpand(tituloKey)} className="w-full flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700">
                                                            <span className="font-semibold text-slate-700 dark:text-slate-200">{titulo}</span>
                                                            <ChevronRightIcon className={`w-4 h-4 text-slate-500 transform transition-transform ${expandedKeys[tituloKey] ? 'rotate-90' : ''}`} />
                                                        </button>
                                                        {expandedKeys[tituloKey] && (
                                                            <div className="p-2 space-y-2">
                                                                {Object.entries(assuntos).map(([assunto, datas]) => {
                                                                    const assuntoKey = `${tituloKey}|${assunto}`;
                                                                    return (
                                                                        <div key={assuntoKey} className="border border-slate-200 dark:border-slate-600 rounded-md ml-4">
                                                                            <button onClick={() => toggleExpand(assuntoKey)} className="w-full flex items-center justify-between p-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600/50">
                                                                                <span className="font-medium text-slate-600 dark:text-slate-300">{assunto}</span>
                                                                                <ChevronRightIcon className={`w-4 h-4 text-slate-500 transform transition-transform ${expandedKeys[assuntoKey] ? 'rotate-90' : ''}`} />
                                                                            </button>
                                                                            {expandedKeys[assuntoKey] && (
                                                                                <div className="p-2 space-y-2">
                                                                                    {Object.entries(datas).map(([data, ataList]) => {
                                                                                        const dataKey = `${assuntoKey}|${data}`;
                                                                                        return (
                                                                                            <div key={dataKey} className="ml-4">
                                                                                                <button onClick={() => toggleExpand(dataKey)} className="w-full flex items-center justify-between p-2 text-sm font-semibold rounded-md bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/60">
                                                                                                    <span>{data}</span>
                                                                                                    <ChevronRightIcon className={`w-4 h-4 transform transition-transform ${expandedKeys[dataKey] ? 'rotate-90' : ''}`} />
                                                                                                </button>
                                                                                                {expandedKeys[dataKey] && (
                                                                                                    <div className="pt-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                                                                        {(ataList as AtaData[]).map(ata => (
                                                                                                            <AtaCard key={ata.id} ata={ata} onView={onNavigateToAta} onDelete={handleDeleteRequest} />
                                                                                                        ))}
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
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                            <FileTextIcon className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600 mx-auto" />
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Nenhuma Ata Encontrada</h3>
                            <p className="max-w-md mt-1 text-sm text-slate-500 dark:text-slate-400 mx-auto">Ajuste os filtros ou adicione novas atas para vê-las aqui.</p>
                        </div>
                    )}
                </>
            )}
        </main>
        <ConfirmationDialog
            isOpen={!!ataToDelete}
            onClose={() => setAtaToDelete(null)}
            onConfirm={handleConfirmDelete}
            title="Confirmar Exclusão"
            icon="alert"
            confirmText="Excluir"
        >
            Tem certeza de que deseja excluir permanentemente a ata{' '}
            <strong>"{ataToDelete?.titulo}"</strong> de <strong>{ataToDelete?.data}</strong>?
            Esta ação não pode ser desfeita.
        </ConfirmationDialog>
        </>
    );
};

export default AtaRepositoryView;