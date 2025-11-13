import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    loadAtasFromFirebase, 
    getProjetos,
    getChatHistory,
    saveChatConversation,
    deleteChatConversation,
    updateChatConversationName
} from '../services/firebaseService';
import { chatWithAiAssistant } from '../services/geminiService';
import type { AtaData, Projeto, AdminSettings, Webhook, Message, SavedConversation } from '../types';
import { BrainCircuitIcon, SendIcon, AlertTriangleIcon, Share2Icon, FilePdfIcon, CopyIcon, UsersIcon, CheckIcon, XIcon, PlusIcon, SaveIcon, ArchiveIcon } from './icons';
import { exportAssistantResponseToPdf, generateAssistantHtmlForEmail, generateAssistantAdaptiveCard } from '../services/assistantShareService';
import { sendToTeamsWebhook } from '../services/webhookService';
import ChatHistoryPanel from './ChatHistoryPanel';

type SendStatusInfo = { status: 'idle' | 'sending' | 'success' | 'error'; message: string };


const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const renderLine = (line: string, index: number) => {
        if (line.startsWith('* ')) {
            return <li key={index}>{line.substring(2)}</li>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
            return <strong key={index}>{line.substring(2, line.length - 2)}</strong>;
        }
        return <p key={index} className="mb-2 last:mb-0">{line}</p>;
    };

    const lines = text.split('\n').filter(line => line.trim() !== '');
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];

    lines.forEach((line, index) => {
        const isListItem = line.startsWith('* ');

        if (isListItem) {
            listItems.push(renderLine(line, index));
        } else {
            if (listItems.length > 0) {
                elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2">{listItems}</ul>);
                listItems = []; 
            }
            elements.push(renderLine(line, index));
        }
    });

    if (listItems.length > 0) {
        elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2">{listItems}</ul>);
    }

    return <div className="prose prose-sm dark:prose-invert max-w-none">{elements}</div>;
};

const ShareAssistantResponseModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    emailHtml: string;
    adaptiveCard: object;
    webhooks: Webhook[];
    question: string;
}> = ({ isOpen, onClose, emailHtml, adaptiveCard, webhooks, question }) => {
    const [activeTab, setActiveTab] = useState<'email' | 'teams'>('email');
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [selectedWebhooks, setSelectedWebhooks] = useState<Record<string, boolean>>({});
    const [sendStatuses, setSendStatuses] = useState<Record<string, SendStatusInfo>>({});

    useEffect(() => {
        if (isOpen) {
            setCopiedEmail(false);
            setSendStatuses({});
            setSelectedWebhooks({});
            setActiveTab('email');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCopyToClipboard = async () => {
        try {
            const blob = new Blob([emailHtml], { type: 'text/html' });
            await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]);
            setCopiedEmail(true);
            setTimeout(() => setCopiedEmail(false), 2000);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };
    
    const handleSendToTeams = async () => {
        const webhooksToSend = webhooks.filter(w => selectedWebhooks[w.id]);
        if (webhooksToSend.length === 0) return;

        const initialStatuses: Record<string, SendStatusInfo> = {};
        webhooksToSend.forEach(w => {
            initialStatuses[w.id] = { status: 'sending', message: 'Enviando...' };
        });
        setSendStatuses(initialStatuses);

        for (const webhook of webhooksToSend) {
            const result = await sendToTeamsWebhook(webhook.url, adaptiveCard);
            setSendStatuses(prev => ({
                ...prev,
                [webhook.id]: { status: result.success ? 'success' : 'error', message: result.message }
            }));
        }
    };
    
    const isSending = Object.values(sendStatuses).some((s: SendStatusInfo) => s.status === 'sending');
    const emailSubject = `Claritas IA: ${question.substring(0, 50)}${question.length > 50 ? '...' : ''}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold">Compartilhar Resposta</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"><XIcon /></button>
                </div>
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button onClick={() => setActiveTab('email')} className={`px-4 py-3 text-sm font-semibold ${activeTab === 'email' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Pré-visualização (Email)</button>
                    <button onClick={() => setActiveTab('teams')} className={`px-4 py-3 text-sm font-semibold ${activeTab === 'teams' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Enviar para o Teams</button>
                </div>

                {activeTab === 'email' && (
                    <>
                        <div className="p-2 bg-slate-100 dark:bg-slate-900 text-sm"><span className="font-semibold">Assunto:</span> {emailSubject}</div>
                        <iframe srcDoc={emailHtml} title="Email Preview" className="w-full flex-grow border-0 bg-white dark:bg-slate-800" />
                        <div className="p-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={handleCopyToClipboard} className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${copiedEmail ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                {copiedEmail ? <CheckIcon/> : <CopyIcon/>} {copiedEmail ? 'Copiado!' : 'Copiar para Email'}
                            </button>
                        </div>
                    </>
                )}
                {activeTab === 'teams' && (
                    <>
                    <div className="flex-grow p-6 overflow-y-auto">
                        <h4 className="font-bold mb-2">Enviar para Canais do Teams</h4>
                        <p className="text-sm text-slate-500 mb-4">Selecione os canais para enviar esta resposta como um Cartão Adaptável.</p>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 -mr-2 border-t border-b py-4 dark:border-slate-700">
                           {webhooks.length > 0 ? webhooks.map(webhook => {
                                const statusInfo = sendStatuses[webhook.id];
                                return (
                                    <label key={webhook.id} className="flex items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
                                        <input type="checkbox" checked={!!selectedWebhooks[webhook.id]} onChange={e => setSelectedWebhooks(prev => ({...prev, [webhook.id]: e.target.checked}))} className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500" />
                                        <span className="ml-3 text-sm font-medium">{webhook.name}</span>
                                        {statusInfo && <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${statusInfo.status === 'success' ? 'bg-green-100 text-green-800' : statusInfo.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{statusInfo.status === 'sending' ? 'Enviando...' : (statusInfo.status === 'success' ? 'Enviado!' : 'Erro')}</span>}
                                    </label>
                                );
                           }) : <p className="text-sm text-center text-slate-500 py-4">Nenhum webhook configurado.</p>}
                        </div>
                    </div>
                    <div className="p-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={handleSendToTeams} disabled={Object.values(selectedWebhooks).every(v => !v) || isSending} className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400">
                            <SendIcon/> {isSending ? 'Enviando...' : `Enviar para (${Object.values(selectedWebhooks).filter(Boolean).length}) Canal(is)`}
                        </button>
                    </div>
                    </>
                )}
            </div>
        </div>
    );
};


interface AiAssistantViewProps {
    adminSettings: AdminSettings | null;
    webhooks: Webhook[];
    setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}

const AiAssistantView: React.FC<AiAssistantViewProps> = ({ adminSettings, webhooks, setToast }) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: "Olá! Eu sou o Assistente IA da Claritas. Tenho acesso a todas as suas atas e projetos. Como posso ajudar hoje? Você pode perguntar, por exemplo, 'Quais são as tarefas atrasadas do empreendimento X?' ou 'Resuma as principais decisões da última semana.'", sender: 'ai' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [contextData, setContextData] = useState<{ atas: AtaData[], projetos: Projeto[] } | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [messageToShare, setMessageToShare] = useState<Message | null>(null);
    const [shareContent, setShareContent] = useState({ emailHtml: '', adaptiveCard: {} });
    
    // History State
    const [history, setHistory] = useState<SavedConversation[]>([]);
    const [isHistoryVisible, setIsHistoryVisible] = useState(true);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);


    useEffect(() => {
        const fetchContextData = async () => {
            setIsLoading(true);
            try {
                const [atas, projetos] = await Promise.all([loadAtasFromFirebase(), getProjetos()]);
                setContextData({ atas, projetos });
            } catch (err: any) {
                setError(`Falha ao carregar o contexto de dados: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        const fetchHistory = async () => {
            try {
                const firebaseHistory = await getChatHistory();
                setHistory(firebaseHistory);
            } catch (e: any) {
                console.error("Failed to load AI chat history from Firebase:", e);
                setToast({ message: `Erro ao carregar histórico: ${e.message}`, type: 'error' });
                setHistory([]);
            }
        };

        fetchContextData();
        fetchHistory();
    }, [setToast]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleShareClick = (message: Message) => {
        setMessageToShare(message);
    };

    const handleExportPdfClick = async (message: Message) => {
        const questionMessage = messages[messages.findIndex(m => m.id === message.id) - 1];
        const question = questionMessage ? questionMessage.text : "Contexto da Conversa";
        await exportAssistantResponseToPdf(question, message.text, adminSettings);
    };

    useEffect(() => {
        if (messageToShare) {
            const questionMessage = messages[messages.findIndex(m => m.id === messageToShare.id) - 1];
            const question = questionMessage ? questionMessage.text : "Contexto da Conversa";
            
            const generatedEmailHtml = generateAssistantHtmlForEmail(question, messageToShare.text, adminSettings);
            const generatedAdaptiveCard = generateAssistantAdaptiveCard(question, messageToShare.text);
            
            setShareContent({ emailHtml: generatedEmailHtml, adaptiveCard: generatedAdaptiveCard });
        }
    }, [messageToShare, messages, adminSettings]);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;
        
        const userMessage: Message = { id: Date.now(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        if (!contextData) {
            setError("A base de conhecimento (atas e projetos) ainda não foi carregada. Por favor, aguarde.");
            setIsLoading(false);
            return;
        }

        try {
            const aiResponseText = await chatWithAiAssistant(input, contextData);
            const aiMessage: Message = { id: Date.now() + 1, text: aiResponseText, sender: 'ai' };
            setMessages(prev => [...prev, aiMessage]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- History Handlers ---

    const handleNewChat = () => {
        setMessages([
             { id: 1, text: "Olá! Eu sou o Assistente IA da Claritas. Tenho acesso a todas as suas atas e projetos. Como posso ajudar hoje? Você pode perguntar, por exemplo, 'Quais são as tarefas atrasadas do empreendimento X?' ou 'Resuma as principais decisões da última semana.'", sender: 'ai' }
        ]);
        setCurrentConversationId(null);
        setError(null);
    };

    const handleSaveConversation = async () => {
        if (messages.filter(m => m.sender === 'user').length === 0) return;

        try {
            if (currentConversationId) { // Update existing conversation
                const conversationToUpdate = history.find(convo => convo.id === currentConversationId);
                if (!conversationToUpdate) {
                    setToast({ message: 'Erro: Conversa não encontrada para atualizar.', type: 'error' });
                    return;
                }
                const updatedConversation = { ...conversationToUpdate, messages };
                await saveChatConversation(updatedConversation);

                setHistory(history.map(convo =>
                    convo.id === currentConversationId ? updatedConversation : convo
                ));
                setToast({ message: 'Conversa atualizada!', type: 'success' });
            } else { // Save new conversation
                const firstUserQuestion = messages.find(m => m.sender === 'user')?.text || `Conversa`;
                const newName = `${firstUserQuestion.substring(0, 30)}${firstUserQuestion.length > 30 ? '...' : ''}`;

                const newConversationData: Omit<SavedConversation, 'id'> = {
                    name: newName,
                    messages,
                    createdAt: new Date().toISOString(),
                };
                const newId = await saveChatConversation(newConversationData);
                const newConversation = { id: newId, ...newConversationData };
                
                setHistory(prev => [...prev, newConversation]);
                setCurrentConversationId(newId);
                setToast({ message: 'Conversa salva no histórico!', type: 'success' });
            }
        } catch (e: any) {
            setToast({ message: `Erro ao salvar conversa: ${e.message}`, type: 'error' });
        }
    };
    
    const handleLoadConversation = (conversationId: string) => {
        const conversation = history.find(c => c.id === conversationId);
        if (conversation) {
            setMessages(conversation.messages);
            setCurrentConversationId(conversation.id);
            setError(null);
        }
    };

    const handleRenameConversation = async (conversationId: string, newName: string) => {
        try {
            await updateChatConversationName(conversationId, newName);
            setHistory(history.map(c =>
                c.id === conversationId ? { ...c, name: newName } : c
            ));
        } catch (e: any) {
            setToast({ message: `Erro ao renomear conversa: ${e.message}`, type: 'error' });
        }
    };

    const handleDeleteConversation = async (conversationId: string) => {
        try {
            await deleteChatConversation(conversationId);
            setHistory(history.filter(c => c.id !== conversationId));
            if (currentConversationId === conversationId) {
                handleNewChat();
            }
        } catch(e: any) {
            setToast({ message: `Erro ao excluir conversa: ${e.message}`, type: 'error' });
        }
    };
    
    const canSave = messages.some(m => m.sender === 'user');
    const isSaved = currentConversationId !== null && history.some(c => c.id === currentConversationId);

    return (
        <div className="flex h-full overflow-hidden">
            <ChatHistoryPanel 
                isOpen={isHistoryVisible}
                history={history}
                onLoad={handleLoadConversation}
                onRename={handleRenameConversation}
                onDelete={handleDeleteConversation}
                onNewChat={handleNewChat}
            />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsHistoryVisible(!isHistoryVisible)} title={isHistoryVisible ? "Ocultar Histórico" : "Mostrar Histórico"} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full">
                                <ArchiveIcon className="w-5 h-5"/>
                            </button>
                            <div>
                                <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <BrainCircuitIcon className="w-8 h-8 mr-3 text-slate-500 hidden sm:block" />
                                    Assistente IA
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm hidden md:block">Converse com seus dados e obtenha insights.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <button onClick={handleSaveConversation} disabled={!canSave} title={isSaved ? "Conversa salva" : "Salvar conversa no histórico"} className={`p-2 rounded-full ${isSaved ? 'text-green-600' : 'text-slate-500'} hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed`}>
                                <SaveIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    {messages.map((message, index) => (
                        <div key={message.id} className={`flex items-end gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {message.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><BrainCircuitIcon className="w-5 h-5 text-slate-500"/></div>}
                            <div className={`max-w-xl p-4 rounded-2xl ${message.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 rounded-bl-none border dark:border-slate-700'}`}>
                                <MarkdownRenderer text={message.text} />
                                {message.sender === 'ai' && index > 0 && (
                                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/50 flex items-center gap-3">
                                        <button onClick={() => handleExportPdfClick(message)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors">
                                            <FilePdfIcon className="w-4 h-4" /> PDF
                                        </button>
                                        <button onClick={() => handleShareClick(message)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors">
                                            <Share2Icon className="w-4 h-4" /> Compartilhar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><BrainCircuitIcon className="w-5 h-5 text-slate-500"/></div>
                            <div className="max-w-xl p-3 rounded-2xl bg-white dark:bg-slate-800 rounded-bl-none border dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-0"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-150"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-300"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="flex items-start gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0"><AlertTriangleIcon className="w-5 h-5 text-red-500"/></div>
                            <div className="max-w-xl p-3 rounded-2xl bg-red-50 dark:bg-red-900/50 rounded-bl-none border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">
                                <p className="font-bold">Ocorreu um erro:</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef}></div>
                </main>
                
                <footer className="p-4 md:px-8 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Pergunte algo sobre suas atas ou projetos..."
                            className="flex-1 w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading || contextData === null}
                        />
                        <button onClick={handleSendMessage} disabled={isLoading || !input.trim() || contextData === null} className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">
                            <SendIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2">O Assistente IA pode cometer erros. Verifique informações importantes.</p>
                </footer>
            </div>
            
            <ShareAssistantResponseModal
                isOpen={!!messageToShare}
                onClose={() => setMessageToShare(null)}
                emailHtml={shareContent.emailHtml}
                adaptiveCard={shareContent.adaptiveCard}
                webhooks={webhooks}
                question={messageToShare ? (messages[messages.findIndex(m => m.id === messageToShare.id) - 1]?.text || "Resposta do Assistente") : ""}
            />
        </div>
    );
};

export default AiAssistantView;