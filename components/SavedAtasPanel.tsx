import React, { useMemo, useState } from 'react';
import type { AtaData } from '../types';
import { XIcon, FileTextIcon, AlertTriangleIcon, ChevronRightIcon, TrashIcon } from './icons';

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

  const groupedAtas = useMemo(() => {
    if (!atas) return {};
    return atas.reduce<GroupedAtas>((acc, ata) => {
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
    }, {});
  }, [atas]);

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
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Carregar Ata Salva</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando atas salvas...</p>
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
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                <FileTextIcon className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-semibold">Nenhuma Ata Encontrada</h3>
                <p className="max-w-md mt-1 text-sm">Parece que você ainda não salvou nenhuma ata.</p>
              </div>
          )}

          {!isLoading && !error && atas.length > 0 && (
             <div className="space-y-2">
                {Object.entries(groupedAtas).map(([empreendimento, assuntos]) => (
                    <div key={empreendimento} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                        <button
                            onClick={() => toggleExpand(empreendimento)}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                        >
                            <span className="font-bold text-gray-700 dark:text-gray-200">{empreendimento}</span>
                            <ChevronRightIcon className={`w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform duration-200 ${expandedKeys[empreendimento] ? 'rotate-90' : ''}`} />
                        </button>
                        {expandedKeys[empreendimento] && (
                            <div className="p-2 space-y-2">
                                {Object.entries(assuntos).map(([assunto, ataList]) => {
                                    const assuntoKey = `${empreendimento}|${assunto}`;
                                    return (
                                        <div key={assuntoKey} className="border border-gray-200 dark:border-gray-600 rounded-md">
                                            <button
                                                onClick={() => toggleExpand(assuntoKey)}
                                                className="w-full flex items-center justify-between p-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-t-md"
                                            >
                                                <span className="font-semibold text-gray-600 dark:text-gray-300">{assunto}</span>
                                                <ChevronRightIcon className={`w-4 h-4 text-gray-500 dark:text-gray-400 transform transition-transform duration-200 ${expandedKeys[assuntoKey] ? 'rotate-90' : ''}`} />
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
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">ID: {ata.id?.substring(0, 8)}...</span>
                                                                </div>
                                                                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">{ata.titulo}</div>
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteClick(e, ata)}
                                                                className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
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
         <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-right">
            <button
                type="button"
                className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
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