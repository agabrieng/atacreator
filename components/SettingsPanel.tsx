import React, { useState, useEffect } from 'react';
import type { AdminSettings, DocumentSettings } from '../types';
import { CameraIcon, XIcon, TrashIcon } from './icons';

interface SettingsPanelProps {
  allProfiles: Record<string, AdminSettings>;
  currentCompanyName: string;
  onSave: (allProfiles: Record<string, AdminSettings>, currentCompany: string) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ allProfiles, currentCompanyName, onSave }) => {
  const [selectedCompany, setSelectedCompany] = useState(currentCompanyName);
  const [isCreating, setIsCreating] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [currentSettings, setCurrentSettings] = useState<AdminSettings | null>(null);
  const [activeDocType, setActiveDocType] = useState<'ata' | 'onepage'>('ata');

  useEffect(() => {
    if (isCreating) {
        setCurrentSettings({
            companyName: '',
            companyLogo: null,
            documentSettings: {
                ata: { title: 'ATA DE REUNIÃO', docNumber: '', revision: '', propertyInfo: '' },
                onepage: { title: 'RELATÓRIO GERENCIAL ONEPAGE', docNumber: '', revision: '', propertyInfo: '' }
            }
        });
        return;
    }

    const profile = allProfiles[selectedCompany];
    if (profile) {
        // Ensure settings are complete by merging with defaults
        const ensuredSettings: AdminSettings = {
            companyName: profile.companyName,
            companyLogo: profile.companyLogo,
            documentSettings: {
                ata: { 
                    title: 'ATA DE REUNIÃO', 
                    docNumber: '', 
                    revision: '', 
                    propertyInfo: '', 
                    ...profile.documentSettings?.ata 
                },
                onepage: { 
                    title: 'RELATÓRIO GERENCIAL ONEPAGE',
                    docNumber: '', 
                    revision: '', 
                    propertyInfo: '', 
                    ...profile.documentSettings?.onepage 
                },
            }
        };
        setCurrentSettings(ensuredSettings);
    } else {
        setCurrentSettings(null);
    }
  }, [selectedCompany, allProfiles, isCreating]);

  const handleCompanySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '__new__') {
      setIsCreating(true);
      setNewCompanyName('');
    } else {
      setIsCreating(false);
      setSelectedCompany(value);
    }
  };

  const handleSave = () => {
    if (!currentSettings) return;

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
    if(isCreating) {
        setIsCreating(false);
        setSelectedCompany(finalCompanyName);
    }
  };

  const handleDelete = () => {
    if (Object.keys(allProfiles).length <= 1) {
        alert("Você не pode excluir o único perfil de empresa.");
        return;
    }
    if (window.confirm(`Tem certeza de que deseja excluir o perfil da empresa "${selectedCompany}"?`)) {
        const newProfiles = { ...allProfiles };
        delete newProfiles[selectedCompany];
        const newCurrentCompany = Object.keys(newProfiles)[0];
        onSave(newProfiles, newCurrentCompany);
        setSelectedCompany(newCurrentCompany);
    }
  };

  const handleInputChange = (field: keyof DocumentSettings, value: string) => {
    setCurrentSettings(prev => {
        if (!prev) return prev;
        
        const newSettings = { ...prev };
        newSettings.documentSettings = { ...(newSettings.documentSettings || { ata: {} as DocumentSettings, onepage: {} as DocumentSettings }) };
        newSettings.documentSettings[activeDocType] = { 
            ...(newSettings.documentSettings[activeDocType] || {} as DocumentSettings),
            [field]: value
        };

        return newSettings;
    });
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentSettings(prev => (prev ? { ...prev, companyLogo: reader.result as string } : null));
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveLogo = () => {
    setCurrentSettings(prev => (prev ? { ...prev, companyLogo: null } : null));
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 w-full space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Perfis de Empresa</h2>
      
      <div className="space-y-2">
          <label htmlFor="company-select" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Perfil Ativo</label>
          <div className="flex items-center gap-2">
              <select id="company-select" value={isCreating ? '__new__' : selectedCompany} onChange={handleCompanySelect} className="block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
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
              <label htmlFor="new-company-name" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Nome da Nova Empresa</label>
              <input id="new-company-name" type="text" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Digite o nome da empresa" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" />
          </div>
      ) : (
          <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Nome da Empresa</label>
              <input type="text" value={currentSettings?.companyName || ''} disabled className="mt-1 block w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" />
          </div>
      )}
      
      <div className="flex items-center space-x-4 pt-2">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-center overflow-hidden">
              {currentSettings?.companyLogo ? <img src={currentSettings.companyLogo} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-xs text-slate-500">Logo</span>}
          </div>
          <div>
               <label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                  <CameraIcon className="-ml-1 mr-2 h-5 w-5" />
                  Carregar Logo
              </label>
              <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              {currentSettings?.companyLogo && <button onClick={handleRemoveLogo} className="ml-2 text-xs text-red-500 hover:text-red-700">Remover</button>}
          </div>
      </div>
        
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">Configuração de Documentos</h3>
          <div className="border-b border-slate-200 dark:border-slate-700 mb-4">
              <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                  <button onClick={() => setActiveDocType('ata')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeDocType === 'ata' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200'}`}>
                      Ata de Reunião
                  </button>
                  <button onClick={() => setActiveDocType('onepage')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeDocType === 'onepage' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200'}`}>
                      Relatório OnePage
                  </button>
              </nav>
          </div>

          <div className="space-y-4">
              <div>
                  <label htmlFor="doc-title" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Título Padrão do Documento</label>
                  <input id="doc-title" type="text" value={currentSettings?.documentSettings?.[activeDocType]?.title || ''} onChange={(e) => handleInputChange('title', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" />
              </div>
              <div>
                  <label htmlFor="doc-number" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Nº do Documento Padrão</label>
                  <input id="doc-number" type="text" value={currentSettings?.documentSettings?.[activeDocType]?.docNumber || ''} onChange={(e) => handleInputChange('docNumber', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" />
              </div>
              <div>
                  <label htmlFor="revision" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Revisão Padrão</label>
                  <input id="revision" type="text" value={currentSettings?.documentSettings?.[activeDocType]?.revision || ''} onChange={(e) => handleInputChange('revision', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" />
              </div>
              <div>
                  <label htmlFor="property-info" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Informação de Propriedade (Rodapé)</label>
                  <textarea id="property-info" value={currentSettings?.documentSettings?.[activeDocType]?.propertyInfo || ''} onChange={(e) => handleInputChange('propertyInfo', e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm resize-y" />
              </div>
          </div>
      </div>

      <div className="flex justify-end pt-4 border-t dark:border-slate-700">
          <button onClick={handleSave} className="px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
              Salvar Alterações
          </button>
      </div>
    </div>
  );
};

export default SettingsPanel;