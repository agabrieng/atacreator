
import React, { useState, useEffect } from 'react';
import type { AdminSettings } from '../types';
import { CameraIcon, XIcon } from './icons';

interface SettingsPanelProps {
  settings: AdminSettings;
  onSave: (newSettings: AdminSettings) => void;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSave, onClose }) => {
  const [currentSettings, setCurrentSettings] = useState<AdminSettings>(settings);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);

  const handleSave = () => {
    localStorage.setItem('ata-admin-settings', JSON.stringify(currentSettings));
    onSave(currentSettings);
    onClose();
  };
  
  const handleInputChange = (field: keyof AdminSettings, value: string) => {
    setCurrentSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleInputChange('companyLogo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 m-4 w-full max-w-lg space-y-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <XIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Configurações Gerais</h2>
        
        <div className="flex items-center space-x-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center overflow-hidden">
                {currentSettings.companyLogo ? (
                    <img src={currentSettings.companyLogo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                    <span className="text-xs text-gray-500">Logo</span>
                )}
            </div>
            <div>
                 <label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <CameraIcon className="-ml-1 mr-2 h-5 w-5" />
                    Carregar Logo
                </label>
                <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                {currentSettings.companyLogo && (
                    <button onClick={() => handleInputChange('companyLogo', null)} className="ml-2 text-xs text-red-500 hover:text-red-700">Remover</button>
                )}
            </div>
        </div>

        <div>
            <label htmlFor="doc-number" className="block text-sm font-medium text-gray-600 dark:text-gray-300">Nº do Documento Padrão</label>
            <input id="doc-number" type="text" value={currentSettings.docNumber} onChange={(e) => handleInputChange('docNumber', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
        </div>
        <div>
            <label htmlFor="revision" className="block text-sm font-medium text-gray-600 dark:text-gray-300">Revisão Padrão</label>
            <input id="revision" type="text" value={currentSettings.revision} onChange={(e) => handleInputChange('revision', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
        </div>
        <div>
            <label htmlFor="property-info" className="block text-sm font-medium text-gray-600 dark:text-gray-300">Informação de Propriedade (Rodapé)</label>
            <textarea id="property-info" value={currentSettings.propertyInfo} onChange={(e) => handleInputChange('propertyInfo', e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm resize-y" />
        </div>

        <div className="flex justify-end pt-4 border-t dark:border-gray-700">
            <button onClick={handleSave} className="px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                Salvar e Fechar
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
