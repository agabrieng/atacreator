import React, { useState } from 'react';
import { EditIcon, TrashIcon, CheckIcon, XIcon, PlusIcon } from './icons';
import type { SavedConversation } from '../types';

interface ChatHistoryPanelProps {
    isOpen: boolean;
    history: SavedConversation[];
    onLoad: (id: string) => void;
    onRename: (id: string, newName: string) => void;
    onDelete: (id: string) => void;
    onNewChat: () => void;
}

const HistoryItem: React.FC<{
    conversation: SavedConversation;
    onLoad: (id: string) => void;
    onRename: (id: string, newName: string) => void;
    onDelete: (id: string) => void;
}> = ({ conversation, onLoad, onRename, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(conversation.name);

    const handleSaveRename = () => {
        if (name.trim() && name.trim() !== conversation.name) {
            onRename(conversation.id, name.trim());
        }
        setIsEditing(false);
    };

    return (
        <li className="p-3 bg-white dark:bg-slate-700/50 rounded-lg group border border-slate-200 dark:border-slate-600/50">
            {isEditing ? (
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                        className="flex-grow p-1 text-sm bg-white dark:bg-slate-900 border border-blue-500 rounded-md"
                        autoFocus
                    />
                    <button onClick={handleSaveRename} className="p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full"><CheckIcon className="w-4 h-4" /></button>
                    <button onClick={() => { setIsEditing(false); setName(conversation.name); }} className="p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full"><XIcon className="w-4 h-4" /></button>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <button onClick={() => onLoad(conversation.id)} className="text-left flex-grow truncate">
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{conversation.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(conversation.createdAt).toLocaleDateString('pt-BR')}</p>
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full"><EditIcon className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(conversation.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                </div>
            )}
        </li>
    );
};


const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({ isOpen, history, onLoad, onRename, onDelete, onNewChat }) => {
    const sortedHistory = [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <aside 
            className={`flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out ${isOpen ? 'w-80' : 'w-0'}`}
        >
            <div className={`h-full flex flex-col overflow-hidden ${isOpen ? 'p-4' : 'p-0'}`}>
                 <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Histórico</h2>
                </div>
                
                <button 
                    onClick={onNewChat}
                    className="w-full flex items-center justify-center gap-2 p-2 mb-4 text-sm font-semibold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex-shrink-0"
                >
                    <PlusIcon className="w-4 h-4" />
                    Nova Conversa
                </button>

                <div className="flex-grow overflow-y-auto -mr-4 pr-4">
                     {sortedHistory.length > 0 ? (
                        <ul className="space-y-2">
                            {sortedHistory.map(convo => (
                                <HistoryItem
                                    key={convo.id}
                                    conversation={convo}
                                    onLoad={onLoad}
                                    onRename={onRename}
                                    onDelete={onDelete}
                                />
                            ))}
                        </ul>
                     ) : (
                        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8">Nenhuma conversa salva.</p>
                     )}
                </div>
            </div>
        </aside>
    );
};

export default ChatHistoryPanel;
