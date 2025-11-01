import React, { useState, useEffect } from 'react';
import type { Empreendimento } from '../types';
import { XIcon, TrashIcon, EditIcon, CheckIcon, PlusIcon } from './icons';
import ConfirmationDialog from './ConfirmationDialog';

interface ProjectManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Empreendimento[];
  onAdd: (name: string, contrato: string) => Promise<void>;
  onUpdate: (id: string, newName: string, newContrato: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const ProjectManagementPanel: React.FC<ProjectManagementPanelProps> = ({
  isOpen,
  onClose,
  projects,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectContrato, setNewProjectContrato] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingContrato, setEditingContrato] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState<Empreendimento | null>(null);

  type PanelState =
    | { mode: 'idle' }
    | { mode: 'adding' }
    | { mode: 'editing'; id: string }
    | { mode: 'updating'; id: string }
    | { mode: 'deleting'; id: string };

  const [panelState, setPanelState] = useState<PanelState>({ mode: 'idle' });

  useEffect(() => {
    // Ensure state is reset when panel is opened
    if (isOpen) {
      setPanelState({ mode: 'idle' });
      setNewProjectName('');
      setNewProjectContrato('');
      setEditingName('');
      setEditingContrato('');
      setConfirmingDelete(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectContrato.trim() || panelState.mode !== 'idle') return;

    setPanelState({ mode: 'adding' });
    try {
      await onAdd(newProjectName.trim(), newProjectContrato.trim());
      setNewProjectName('');
      setNewProjectContrato('');
    } finally {
      setPanelState({ mode: 'idle' });
    }
  };

  const handleStartEdit = (project: Empreendimento) => {
    if (panelState.mode !== 'idle') return;
    setPanelState({ mode: 'editing', id: project.id });
    setEditingName(project.name);
    setEditingContrato(project.contrato || '');
  };

  const handleCancelEdit = () => {
    setPanelState({ mode: 'idle' });
    setEditingName('');
    setEditingContrato('');
  };

  const handleUpdateProject = async () => {
    if (panelState.mode !== 'editing' || !editingName.trim() || !editingContrato.trim()) return;

    const currentId = panelState.id;
    setPanelState({ mode: 'updating', id: currentId });
    try {
      await onUpdate(currentId, editingName.trim(), editingContrato.trim());
      setPanelState({ mode: 'idle' });
      setEditingName('');
      setEditingContrato('');
    } catch (error) {
      console.error("Update failed, returning to edit mode.", error);
      setPanelState({ mode: 'editing', id: currentId });
    }
  };

  const handleDeleteRequest = (project: Empreendimento) => {
    if (panelState.mode !== 'idle') return;
    setConfirmingDelete(project);
  };

  const handleConfirmDelete = async () => {
    if (!confirmingDelete || panelState.mode !== 'idle') return;

    const idToDelete = confirmingDelete.id;
    setPanelState({ mode: 'deleting', id: idToDelete });
    setConfirmingDelete(null); // Close dialog

    try {
      await onDelete(idToDelete);
    } finally {
      setPanelState({ mode: 'idle' });
    }
  };


  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 m-4 w-full max-w-lg flex flex-col h-[70vh] relative" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <XIcon className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Gerenciar Empreendimentos</h2>
          
          <form onSubmit={handleAddProject} className="space-y-3 mb-4 pb-4 border-b dark:border-gray-700">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Nome do novo empreendimento"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
              disabled={panelState.mode !== 'idle'}
            />
            <input
              type="text"
              value={newProjectContrato}
              onChange={(e) => setNewProjectContrato(e.target.value)}
              placeholder="Número ou nome do contrato"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
              disabled={panelState.mode !== 'idle'}
            />
            <button type="submit" className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400" disabled={panelState.mode !== 'idle' || !newProjectName.trim() || !newProjectContrato.trim()}>
              <PlusIcon className="w-5 h-5 mr-2 -ml-1" />
              {panelState.mode === 'adding' ? 'Adicionando...' : 'Adicionar'}
            </button>
          </form>

          <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            {projects.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 mt-8">Nenhum empreendimento cadastrado.</p>
            ) : (
              <ul className="space-y-2">
                {projects.map((project) => {
                  const isEditingThis = (panelState.mode === 'editing' || panelState.mode === 'updating') && panelState.id === project.id;
                  const isUpdatingThis = panelState.mode === 'updating' && panelState.id === project.id;
                  const isDeletingThis = panelState.mode === 'deleting' && panelState.id === project.id;

                  return (
                    <li key={project.id} className={`p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md transition-opacity ${isDeletingThis ? 'opacity-50' : ''}`}>
                      {isEditingThis ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full px-2 py-1 bg-white dark:bg-gray-900 border border-blue-400 rounded-md"
                            autoFocus
                            disabled={isUpdatingThis}
                          />
                          <input
                            type="text"
                            value={editingContrato}
                            onChange={(e) => setEditingContrato(e.target.value)}
                            className="w-full px-2 py-1 bg-white dark:bg-gray-900 border border-blue-400 rounded-md"
                            disabled={isUpdatingThis}
                            onKeyDown={(e) => {if(e.key === 'Enter') handleUpdateProject()}}
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={handleUpdateProject} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full disabled:opacity-50" disabled={isUpdatingThis || !editingName.trim() || !editingContrato.trim()}>
                                <CheckIcon className="w-5 h-5" />
                            </button>
                            <button onClick={handleCancelEdit} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full" disabled={isUpdatingThis}>
                                <XIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-800 dark:text-gray-200 font-semibold">{project.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Contrato: {project.contrato}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => handleStartEdit(project)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed" disabled={panelState.mode !== 'idle'}>
                                <EditIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteRequest(project)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed" disabled={panelState.mode !== 'idle'}>
                                <TrashIcon className={`w-4 h-4 ${isDeletingThis ? 'animate-pulse' : ''}`} />
                                </button>
                            </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
      <ConfirmationDialog
        isOpen={!!confirmingDelete}
        onClose={() => setConfirmingDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        icon="alert"
        confirmText="Excluir"
      >
        Tem certeza de que deseja excluir o empreendimento <strong>"{confirmingDelete?.name}"</strong>?
        <br/><br/>
        Esta ação não pode ser desfeita.
      </ConfirmationDialog>
    </>
  );
};

export default ProjectManagementPanel;