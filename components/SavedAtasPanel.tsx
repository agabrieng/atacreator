
import React from 'react';
import type { AtaData } from '../types';
import { XIcon, FileTextIcon, AlertTriangleIcon } from './icons';

interface SavedAtasPanelProps {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  atas: AtaData[];
  onClose: () => void;
  onSelect: (ata: AtaData) => void;
}

const SavedAtasPanel: React.FC<SavedAtasPanelProps> = ({
  isOpen,
  isLoading,
  error,
  atas,
  onClose,
  onSelect,
}) => {
  if (!isOpen) return null;

  const handleSelectAta = (ata: AtaData) => {
    onSelect(ata);
    onClose();
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
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Carregar Ata da Nuvem</h2>
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
                <p className="max-w-md mt-1 text-sm">Parece que você ainda não salvou nenhuma ata na nuvem.</p>
              </div>
          )}

          {!isLoading && !error && atas.length > 0 && (
            <ul className="space-y-3">
              {atas.map((ata) => (
                <li key={ata.id}>
                  <button
                    onClick={() => handleSelectAta(ata)}
                    className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    <div className="font-semibold text-blue-600 dark:text-blue-400">{ata.titulo}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{ata.empreendimento}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">Data: {ata.data} | ID: {ata.id}</div>
                  </button>
                </li>
              ))}
            </ul>
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
