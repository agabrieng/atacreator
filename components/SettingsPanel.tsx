
import React, { useState, useEffect } from 'react';
import type { AdminSettings } from '../types';
import { CameraIcon, XIcon, TrashIcon } from './icons';

interface SettingsPanelProps {
  allProfiles: Record<string, AdminSettings>;
  currentCompanyName: string;
  onSave: (allProfiles: Record<string, AdminSettings>, currentCompany: string) => void;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ allProfiles, currentCompanyName, onSave, onClose }) => {
  const [selectedCompany, setSelectedCompany] = useState(currentCompanyName);
  const [isCreating, setIsCreating] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [currentSettings, setCurrentSettings] = useState<AdminSettings>(allProfiles[currentCompanyName]);

  useEffect(() => {
    if(!isCreating) {
        setCurrentSettings(allProfiles[selectedCompany]);
    }
  }, [selectedCompany, allProfiles, isCreating]);

  const handleCompanySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '__new__') {
      setIsCreating(true);
      setNewCompanyName('');
      setCurrentSettings({
        companyName: '',
        companyLogo: null,
        docNumber: '',
        revision: '',
        propertyInfo: ''
      });
    } else {
      setIsCreating(false);
      setSelectedCompany(value);
    }
  };

  const handleSave = () => {
    let finalProfiles = { ...allProfiles };
    let finalCompanyName = selectedCompany;

    if (isCreating) {
      if (!newCompanyName.trim()) {
        alert("O nome da nova empresa não pode estar vazio.");
        return;
      }
      finalCompanyName = newCompanyName.trim();
      if (finalProfiles[finalCompanyName]) {
        alert("Já existe uma empresa com esse nome.");
        return;
      }
      finalProfiles[finalCompanyName] = { ...currentSettings, companyName: finalCompanyName };
    } else {
      finalProfiles[selectedCompany] = currentSettings;
    }
    
    onSave(finalProfiles, finalCompanyName);
    onClose();
  };

  const handleDelete = () => {
    if (Object.keys(allProfiles).length <= 1) {
        alert("Você não pode excluir o único perfil de empresa.");
        return;
    }
    if (window.confirm(`Tem certeza de que deseja excluir o perfil da empresa "${selectedCompany}"?`)) {
        const newProfiles = { ...allProfiles };
        delete newProfiles[selectedCompany];
        const newCurrentCompany = Object.keys(newProfiles)[0];
        onSave(newProfiles, newCurrentCompany);
        onClose();
    }
  };

  const handleInputChange = (field: keyof Omit<AdminSettings, 'companyName' | 'companyLogo'>, value: string) => {
    setCurrentSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentSettings(prev => ({ ...prev, companyLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveLogo = () => {
    setCurrentSettings(prev => ({ ...prev, companyLogo: null }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 m-4 w-full max-w-lg space-y-4 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <XIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Configurações Gerais</h2>
        
        <div className="space-y-2">
            <label htmlFor="company-select" className="block text-sm font-medium text-gray-600 dark:text-gray-300">Perfil da Empresa</label>
            <div className="flex items-center gap-2">
                <select id="company-select" value={isCreating ? '__new__' : selectedCompany} onChange={handleCompanySelect} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    {Object.keys(allProfiles).map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                    <option value="__new__">Adicionar Nova Empresa...</option>
                </select>
                {!isCreating && (
                    <button onClick={handleDelete} title="Excluir perfil selecionado" className="p-2 text-red-500 hover:text-red-700 bg-red-100 dark:bg-red-900/50 rounded-md">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>

        {isCreating ? (
            <div>
                <label htmlFor="new-company-name" className="block text-sm font-medium text-gray-600 dark:text-gray-300">Nome da Nova Empresa</label>
                <input id="new-company-name" type="text" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Digite o nome da empresa" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
            </div>
        ) : (
            <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Nome da Empresa</label>
                <input type="text" value={currentSettings?.companyName || ''} disabled className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
            </div>
        )}
        
        <div className="flex items-center space-x-4 pt-2">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center overflow-hidden">
                {currentSettings?.companyLogo ? <img src={currentSettings.companyLogo} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-xs text-gray-500">Logo</span>}
            </div>
            <div>
                 <label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <CameraIcon className="-ml-1 mr-2 h-5 w-5" />
                    Carregar Logo
                </label>
                <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                {currentSettings?.companyLogo && <button onClick={handleRemoveLogo} className="ml-2 text-xs text-red-500 hover:text-red-700">Remover</button>}
            </div>
        </div>

        <div>
            <label htmlFor="doc-number" className="block text-sm font-medium text-gray-600 dark:text-gray-300">Nº do Documento Padrão</label>
            <input id="doc-number" type="text" value={currentSettings?.docNumber || ''} onChange={(e) => handleInputChange('docNumber', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
        </div>
        <div>
            <label htmlFor="revision" className="block text-sm font-medium text-gray-600 dark:text-gray-300">Revisão Padrão</label>
            <input id="revision" type="text" value={currentSettings?.revision || ''} onChange={(e) => handleInputChange('revision', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
        </div>
        <div>
            <label htmlFor="property-info" className="block text-sm font-medium text-gray-600 dark:text-gray-300">Informação de Propriedade (Rodapé)</label>
            <textarea id="property-info" value={currentSettings?.propertyInfo || ''} onChange={(e) => handleInputChange('propertyInfo', e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm resize-y" />
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
