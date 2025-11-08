import React, { useState } from 'react';
import type { Projetista } from '../types';
import { BriefcaseIcon, CameraIcon, EditIcon, PlusIcon, TrashIcon, XIcon } from './icons';
import ConfirmationDialog from './ConfirmationDialog';

const ProjetistaFormModal: React.FC<{ 
    initialData: Projetista | null; 
    onSave: (name: string, logo: string | null) => void; 
    onClose: () => void; 
}> = ({ initialData, onSave, onClose }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [logo, setLogo] = useState<string | null>(initialData?.logo || null);

    const handleSave = () => {
        if (name.trim()) onSave(name.trim(), logo);
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setLogo(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{initialData ? 'Editar' : 'Adicionar'} Empresa Projetista</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label htmlFor="projetista-name" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Nome da Empresa</label>
                        <input id="projetista-name" type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden">
                            {logo ? <img src={logo} alt="Logo" className="w-full h-full object-contain" /> : <CameraIcon className="w-8 h-8 text-slate-400" />}
                        </div>
                        <div>
                            <label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md">
                                <CameraIcon className="w-4 h-4 mr-2" /> Carregar Logo
                            </label>
                            <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                            {logo && <button onClick={() => setLogo(null)} className="ml-2 text-xs text-red-500">Remover</button>}
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">Cancelar</button>
                    <button onClick={handleSave} disabled={!name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-blue-400">Salvar</button>
                </div>
            </div>
        </div>
    );
};

interface ProjetistasPanelProps {
  projetistas: Projetista[];
  onAdd: (name: string, logo: string | null) => Promise<void>;
  onUpdate: (id: string, name: string, logo: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const ProjetistasPanel: React.FC<ProjetistasPanelProps> = ({ projetistas, onAdd, onUpdate, onDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProjetista, setEditingProjetista] = useState<Projetista | null>(null);
    const [deletingProjetista, setDeletingProjetista] = useState<Projetista | null>(null);

    const handleOpenAddModal = () => {
        setEditingProjetista(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (projetista: Projetista) => {
        setEditingProjetista(projetista);
        setIsModalOpen(true);
    };

    const handleSave = async (name: string, logo: string | null) => {
        if (editingProjetista) {
            await onUpdate(editingProjetista.id, name, logo);
        } else {
            await onAdd(name, logo);
        }
        setIsModalOpen(false);
    };
    
    const handleConfirmDelete = async () => {
        if (deletingProjetista) {
            await onDelete(deletingProjetista.id);
            setDeletingProjetista(null);
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Empresas Projetistas</h2>
                    <button onClick={handleOpenAddModal} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Adicionar Empresa
                    </button>
                </div>
                
                <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie as empresas terceirizadas que executam os projetos.</p>

                <div className="pt-4">
                    {projetistas.length === 0 ? (
                        <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">Nenhuma empresa cadastrada.</p>
                    ) : (
                        <ul className="space-y-2">
                            {projetistas.map(p => (
                                <li key={p.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden mr-4">
                                            {p.logo ? <img src={p.logo} alt={p.name} className="w-full h-full object-cover" /> : <BriefcaseIcon className="w-5 h-5 text-slate-400"/>}
                                        </div>
                                        <p className="text-slate-800 dark:text-slate-200 font-semibold">{p.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleOpenEditModal(p)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => setDeletingProjetista(p)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {isModalOpen && <ProjetistaFormModal initialData={editingProjetista} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            </div>
            <ConfirmationDialog
                isOpen={!!deletingProjetista}
                onClose={() => setDeletingProjetista(null)}
                onConfirm={handleConfirmDelete}
                title="Excluir Empresa Projetista"
                confirmText="Excluir"
            >
                Tem certeza que deseja excluir a empresa <strong>"{deletingProjetista?.name}"</strong>? Todos os projetos associados a ela também serão excluídos permanentemente.
            </ConfirmationDialog>
        </>
    );
};

export default ProjetistasPanel;