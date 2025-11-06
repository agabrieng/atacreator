import React, { useState } from 'react';
import type { Webhook } from '../types';
import { XIcon, TrashIcon, EditIcon, CheckIcon, PlusIcon, SendIcon } from './icons';
import { sendToTeamsWebhook } from '../services/webhookService';

interface WebhookPanelProps {
  isOpen: boolean;
  onClose: () => void;
  webhooks: Webhook[];
  onAdd: (name: string, url: string) => Promise<void>;
  onUpdate: (id: string, name: string, url: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const WebhookPanel: React.FC<WebhookPanelProps> = ({ isOpen, onClose, webhooks, onAdd, onUpdate, onDelete }) => {
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [testStatus, setTestStatus] = useState<Record<string, { status: 'sending' | 'success' | 'error'; message: string }>>({});

  if (!isOpen) return null;

  const handleAddWebhook = async () => {
    if (newWebhookName.trim() && newWebhookUrl.trim()) {
      await onAdd(newWebhookName.trim(), newWebhookUrl.trim());
      setNewWebhookName('');
      setNewWebhookUrl('');
    }
  };

  const handleUpdateWebhook = async () => {
    if (editingWebhook) {
      await onUpdate(editingWebhook.id, editingWebhook.name, editingWebhook.url);
      setEditingWebhook(null);
    }
  };

  const handleDeleteWebhook = (id: string) => {
    if (window.confirm('Tem certeza de que deseja excluir este webhook?')) {
      onDelete(id);
    }
  };

  const handleTestWebhook = async (webhook: Webhook) => {
    setTestStatus(prev => ({ ...prev, [webhook.id]: { status: 'sending', message: '' } }));
    
    const testPayload = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            { type: 'TextBlock', text: 'Teste de Webhook ✅', weight: 'bolder', size: 'medium' },
            { type: 'TextBlock', text: `Este é um teste para o webhook "${webhook.name}". Se você recebeu esta mensagem, a configuração está correta!`, wrap: true }
          ]
        }
      }]
    };

    const result = await sendToTeamsWebhook(webhook.url, testPayload);

    if (result.success) {
      setTestStatus(prev => ({ ...prev, [webhook.id]: { status: 'success', message: result.message } }));
    } else {
      setTestStatus(prev => ({ ...prev, [webhook.id]: { status: 'error', message: result.message } }));
    }
    setTimeout(() => setTestStatus(prev => ({ ...prev, [webhook.id]: undefined! })), 5000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 m-4 w-full max-w-lg flex flex-col h-[70vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Gerenciar Webhooks do Teams</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <XIcon className="w-6 h-6" />
            </button>
        </div>

        <div className="space-y-3 mb-4 pb-4 border-b dark:border-slate-700">
            <input type="text" value={newWebhookName} onChange={e => setNewWebhookName(e.target.value)} placeholder="Nome do Canal (ex: Engenharia)" className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"/>
            <input type="url" value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} placeholder="URL do Webhook do Microsoft Teams" className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"/>
            <button onClick={handleAddWebhook} className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400" disabled={!newWebhookName || !newWebhookUrl}>
                <PlusIcon className="w-5 h-5 mr-2" />
                Adicionar Webhook
            </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            <h3 className="text-lg font-semibold mb-2 text-slate-700 dark:text-slate-300">Webhooks Salvos</h3>
            {webhooks.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 mt-8">Nenhum webhook cadastrado.</p>
            ) : (
            <ul className="space-y-2">
                {webhooks.map(webhook => (
                    <li key={webhook.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                        {editingWebhook?.id === webhook.id ? (
                            <div className="space-y-2">
                                <input type="text" value={editingWebhook.name} onChange={e => setEditingWebhook({...editingWebhook, name: e.target.value})} className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-blue-400 rounded-md" />
                                <input type="url" value={editingWebhook.url} onChange={e => setEditingWebhook({...editingWebhook, url: e.target.value})} className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-blue-400 rounded-md" />
                                <div className="flex justify-end gap-2">
                                    <button onClick={handleUpdateWebhook} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full"><CheckIcon className="w-5 h-5" /></button>
                                    <button onClick={() => setEditingWebhook(null)} className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full"><XIcon className="w-5 h-5" /></button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-slate-800 dark:text-slate-200 font-semibold">{webhook.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{webhook.url}</p>
                                    </div>
                                    <div className="flex items-start gap-1 flex-shrink-0">
                                        <button onClick={() => handleTestWebhook(webhook)} disabled={!!testStatus[webhook.id] && testStatus[webhook.id]?.status === 'sending'} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full"><SendIcon className="w-4 h-4" /></button>
                                        <button onClick={() => setEditingWebhook(webhook)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteWebhook(webhook.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                {testStatus[webhook.id] && (
                                    <p className={`mt-2 text-xs p-1 rounded ${testStatus[webhook.id]?.status === 'success' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : testStatus[webhook.id]?.status === 'error' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'}`}>
                                        {testStatus[webhook.id]?.status === 'sending' ? 'Testando...' : `[${testStatus[webhook.id]?.status.toUpperCase()}]: ${testStatus[webhook.id]?.message}`}
                                    </p>
                                )}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
            )}
        </div>
      </div>
    </div>
  );
};

export default WebhookPanel;