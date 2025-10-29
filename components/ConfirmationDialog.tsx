

import React from 'react';
import { AlertTriangleIcon, InfoIcon } from './icons';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  icon?: 'alert' | 'info';
  confirmText?: string;
  cancelText?: string;
  hideCancel?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    children, 
    icon = 'alert', 
    confirmText = 'Confirmar', 
    cancelText = 'Cancelar', 
    hideCancel = false 
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start">
            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${icon === 'alert' ? 'bg-red-100 dark:bg-red-900/50' : 'bg-blue-100 dark:bg-blue-900/50'} sm:mx-0 sm:h-10 sm:w-10`}>
              {icon === 'alert' && <AlertTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />}
              {icon === 'info' && <InfoIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
            </div>
            <div className="ml-4 text-left flex-1">
              <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-gray-100" id="modal-title">
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {children}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex flex-row-reverse gap-3 rounded-b-xl">
          <button
            type="button"
            className={`inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${icon === 'alert' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          {!hideCancel && (
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;