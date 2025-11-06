import React, { useMemo, useState } from 'react';
import type { AtaData } from '../types';
import { XIcon, FileTextIcon, AlertTriangleIcon, ChevronRightIcon, TrashIcon, SearchIcon } from './icons';

interface SavedAtasPanelProps {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  atas: AtaData[];
  onClose: () => void;
  onSelect: (ata: AtaData) => void;
  onDelete: (ata: AtaData) => void;
}

type GroupedAtas = {
  [empreendimento: string]: {
    [assunto: string]: AtaData[];
  };
};

const SavedAtasPanel: React.FC<SavedAtasPanelProps> = ({
  isOpen,
  isLoading,
  error,
  atas,
  onClose,
  onSelect,
  onDelete,
}) => {
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAtas = useMemo(() => {
    if (!searchQuery.trim()) {
        return atas;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return atas.filter(ata => {
        const match = 
            ata.titulo?.toLowerCase().includes(lowercasedQuery) ||
            ata.assunto?.toLowerCase().includes(lowercasedQuery) ||
            ata.empreendimento?.toLowerCase().includes(lowercasedQuery) ||
            ata.data?.toLowerCase().includes(lowercasedQuery) ||
            ata.participantes.some(p => p.nome.toLowerCase().includes(lowercasedQuery)) ||
            ata.pauta.some(item => item.descricao.toLowerCase().includes(lowercasedQuery));
        return match;
    });
  }, [atas, searchQuery]);


  // FIX: Explicitly type the accumulator and initial value for the `reduce` method
  // to resolve the "Untyped function calls may not accept type arguments" error.
  const groupedAtas = useMemo(() => {
    if (!filteredAtas) return {};
    return filteredAtas.reduce((acc: GroupedAtas, ata) => {
      const empreendimento = ata.empreendimento || 'Sem Empreendimento';
      const assunto = ata.assunto || 'Sem Assunto';
      
      if (!acc[empreendimento]) {
        acc[empreendimento] = {};
      }
      if (!acc[empreendimento][assunto]) {
        acc[empreendimento][assunto] = [];
      }
      acc[empreendimento][assunto].push(ata);
      return acc;
    }, {} as GroupedAtas);
  }, [filteredAtas]);

  if (!isOpen) return null;

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAta = (ata: AtaData) => {
    onSelect(ata);
  };

  const handleDeleteClick = (e: React.MouseEvent, ata: AtaData) => {
    e.stopPropagation(); // Prevent the select action from firing
    onDelete(ata);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Carregar Ata da Nuvem</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por título, assunto, data, participante..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-300">Carregando atas da nuvem...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full text-center text-red-500">
                <AlertTriangleIcon className="w-12 h-12 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Erro ao Carregar</h3>
                <p className="max-w-md text-sm">{error}</p>
            </div>
          )}
          
          {!isLoading && !error && atas.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
                <FileTextIcon className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600" />
                <h3 className="text-lg font-semibold">Nenhuma Ata Encontrada</h3>
                <p className="max-w-md mt-1 text-sm">Parece que você ainda não salvou nenhuma ata na nuvem.</p>
              </div>
          )}

          {!isLoading && !error && filteredAtas.length === 0 && searchQuery && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
                <SearchIcon className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600" />
                <h3 className="text-lg font-semibold">Nenhum Resultado Encontrado</h3>
                <p className="max-w-md mt-1 text-sm">Não foi encontrada nenhuma ata para a sua busca.</p>
              </div>
          )}

          {!isLoading && !error && filteredAtas.length > 0 && (
             <div className="space-y-2">
                {Object.entries(groupedAtas).map(([empreendimento, assuntos]) => (
                    <div key={empreendimento} className="border border-slate-200 dark:border-slate-700 rounded-lg">
                        <button
                            onClick={() => toggleExpand(empreendimento)}
                            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-lg"
                        >
                            <span className="font-bold text-slate-700 dark:text-slate-200">{empreendimento}</span>
                            <ChevronRightIcon className={`w-5 h-5 text-slate-500 dark:text-slate-400 transform transition-transform duration-200 ${expandedKeys[empreendimento] ? 'rotate-90' : ''}`} />
                        </button>
                        {expandedKeys[empreendimento] && (
                            <div className="p-2 space-y-2">
                                {Object.entries(assuntos).map(([assunto, ataList]) => {
                                    const assuntoKey = `${empreendimento}|${assunto}`;
                                    return (
                                        <div key={assuntoKey} className="border border-slate-200 dark:border-slate-600 rounded-md">
                                            <button
                                                onClick={() => toggleExpand(assuntoKey)}
                                                className="w-full flex items-center justify-between p-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-t-md"
                                            >
                                                <span className="font-semibold text-slate-600 dark:text-slate-300">{assunto}</span>
                                                <ChevronRightIcon className={`w-4 h-4 text-slate-500 dark:text-slate-400 transform transition-transform duration-200 ${expandedKeys[assuntoKey] ? 'rotate-90' : ''}`} />
                                            </button>
                                            {expandedKeys[assuntoKey] && (
                                                <ul className="p-2 space-y-2">
                                                    {ataList.map((ata) => (
                                                        <li key={ata.id} className="group relative">
                                                            <button
                                                                onClick={() => handleSelectAta(ata)}
                                                                className="w-full text-left p-3 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg border border-blue-200 dark:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors pr-10"
                                                            >
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-semibold text-blue-700 dark:text-blue-300">Ata de {ata.data}</span>
                                                                    <span className="text-xs text-slate-500 dark:text-slate-400">ID: {ata.id?.substring(0, 8)}...</span>
                                                                </div>
                                                                <div className="text-sm text-slate-600 dark:text-slate-300 mt-1 truncate">{ata.titulo}</div>
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteClick(e, ata)}
                                                                className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                                                title={`Excluir ata "${ata.titulo}"`}
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
          )}
        </div>
         <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-right">
            <button
                type="button"
                className="inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-700 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800"
                onClick={onClose}
            >
                Fechar
            </button>
        </div>
      </div>
    </div>
  );
};

export default SavedAtasPanel;