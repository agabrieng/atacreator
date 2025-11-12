import React, { useState, useMemo } from 'react';
import type { AtaData, Projeto, OnePageReportData, AdminSettings, Webhook, Empreendimento } from '../types';
import { loadAtasFromFirebase, getProjetos } from '../services/firebaseService';
import { generateOnePageReport } from '../services/geminiService';
import { exportOnePageToPdf, generateOnePageHtmlForEmail, generateOnePageAdaptiveCard } from '../services/reportService';
import { sendToTeamsWebhook } from '../services/webhookService';
import { TrendingUpIcon, AlertTriangleIcon, SparklesIcon, FilePdfIcon, CopyIcon, SendIcon, XIcon, CheckIcon, UsersIcon } from './icons';

type PeriodOption = 'today' | 'current_week' | 'last_week' | 'this_year' | 'custom';
type ToastFunc = (toast: { message: string; type: 'success' | 'error' } | null) => void;
type SendStatusInfo = { status: 'idle' | 'sending' | 'success' | 'error'; message: string };

const ReportPreviewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    reportData: OnePageReportData | null;
    webhooks: Webhook[];
    adminSettings: AdminSettings | null;
}> = ({ isOpen, onClose, reportData, webhooks, adminSettings }) => {
    const [activeTab, setActiveTab] = useState<'email' | 'teams'>('email');
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [selectedWebhooks, setSelectedWebhooks] = useState<Record<string, boolean>>({});
    const [sendStatuses, setSendStatuses] = useState<Record<string, SendStatusInfo>>({});

    const emailHtml = useMemo(() => {
        if (!reportData) return '';
        return generateOnePageHtmlForEmail(reportData, adminSettings);
    }, [reportData, adminSettings]);

    const adaptiveCard = useMemo(() => {
        if (!reportData) return {};
        return generateOnePageAdaptiveCard(reportData, adminSettings);
    }, [reportData, adminSettings]);

    if (!isOpen || !reportData) return null;

    const handleCopyToClipboard = async (content: string, type: 'text/html') => {
        try {
            const blob = new Blob([content], { type });
            await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
            return true;
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            return false;
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
    
    // FIX: Add explicit type `SendStatusInfo` to the parameter `s` of `some()`
    // to resolve TypeScript error `Property 'status' does not exist on type 'unknown'`.
    const isSending = Object.values(sendStatuses).some((s: SendStatusInfo) => s.status === 'sending');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold">Exportar e Compartilhar Relatório</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"><XIcon /></button>
                </div>
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button onClick={() => setActiveTab('email')} className={`px-4 py-3 text-sm font-semibold ${activeTab === 'email' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Pré-visualização (Email)</button>
                    <button onClick={() => setActiveTab('teams')} className={`px-4 py-3 text-sm font-semibold ${activeTab === 'teams' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Enviar para o Teams</button>
                </div>

                {activeTab === 'email' && (
                    <>
                        <iframe srcDoc={emailHtml} title="Email Preview" className="w-full flex-grow border-0 bg-slate-50" />
                        <div className="p-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={async () => {
                                if (await handleCopyToClipboard(emailHtml, 'text/html')) {
                                    setCopiedEmail(true);
                                    setTimeout(() => setCopiedEmail(false), 2000);
                                }
                            }} className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${copiedEmail ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                {copiedEmail ? <CheckIcon/> : <CopyIcon/>} {copiedEmail ? 'Copiado!' : 'Copiar para Email'}
                            </button>
                        </div>
                    </>
                )}
                {activeTab === 'teams' && (
                    <>
                    <div className="flex-grow p-6 overflow-y-auto">
                        <h4 className="font-bold mb-2">Enviar para Canais do Teams</h4>
                        <p className="text-sm text-slate-500 mb-4">Selecione os canais para enviar este relatório como um Cartão Adaptável.</p>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 -mr-2 border-t border-b py-4 dark:border-slate-700">
                           {webhooks.length > 0 ? webhooks.map(webhook => {
                                const statusInfo = sendStatuses[webhook.id];
                                return (
                                    <label key={webhook.id} className="flex items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
                                        <input type="checkbox" checked={!!selectedWebhooks[webhook.id]} onChange={e => setSelectedWebhooks(prev => ({...prev, [webhook.id]: e.target.checked}))} className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500" />
                                        <span className="ml-3 text-sm font-medium">{webhook.name}</span>
                                        {statusInfo && <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${statusInfo.status === 'success' ? 'bg-green-100 text-green-800' : statusInfo.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{statusInfo.message}</span>}
                                    </label>
                                );
                           }) : <p className="text-sm text-center text-slate-500 py-4">Nenhum webhook configurado.</p>}
                        </div>
                    </div>
                    <div className="p-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={handleSendToTeams} disabled={Object.values(selectedWebhooks).every(v => !v) || isSending} className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400">
                            <SendIcon/> Enviar
                        </button>
                    </div>
                    </>
                )}
            </div>
        </div>
    );
};


const ReportDisplay: React.FC<{ report: OnePageReportData }> = ({ report }) => (
    <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-6">
        <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Relatório Gerencial OnePage</h2>
            <p className="text-slate-500 dark:text-slate-400 font-semibold">{report.periodo}</p>
        </div>

        <section>
            <h3 className="text-lg font-bold mb-2">Sumário Executivo</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{report.sumarioExecutivo}</p>
        </section>

        {report.visaoGeralDasReunioes && (
            <section>
                <h3 className="text-lg font-bold mb-3">Visão Geral das Reuniões</h3>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    {report.visaoGeralDasReunioes.split('\n').filter(p => p.trim()).map((paragraph, index) => (
                        <p key={index} className="text-sm text-slate-600 dark:text-slate-300 mb-2 last:mb-0">
                            {paragraph}
                        </p>
                    ))}
                </div>
            </section>
        )}

        <section>
            <h3 className="text-lg font-bold mb-2">Principais Decisões</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {report.principaisDecisoes.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        </section>

        <section>
            <h3 className="text-lg font-bold mb-3">Ações Críticas</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="p-3">Ação</th><th className="p-3">Responsável</th><th className="p-3">Prazo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {report.acoesCriticas.map((item, i) => (
                            <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                                <td className="p-3">{item.acao}</td><td className="p-3">{item.responsavel}</td><td className="p-3">{item.prazo}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section>
                <h3 className="text-lg font-bold mb-2">Projetos Concluídos</h3>
                <ul className="space-y-2 text-sm">
                    {report.projetosConcluidos.map((p, i) => <li key={i} className="flex items-center gap-2"><CheckIcon className="w-4 h-4 text-green-500"/><strong>{p.nome}</strong> ({p.dataEntrega})</li>)}
                </ul>
            </section>
            <section>
                <h3 className="text-lg font-bold mb-2">Projetos em Risco/Atrasados</h3>
                <ul className="space-y-2 text-sm">
                    {report.projetosEmRisco.map((p, i) => <li key={i} className="flex items-start gap-2"><AlertTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/><div><strong>{p.nome}</strong> (Prazo: {p.prazo}) - <span className="text-slate-500">{p.motivo}</span></div></li>)}
                </ul>
            </section>
        </div>
        
        <section>
            <h3 className="text-lg font-bold mb-2">Análise de Riscos e Impedimentos</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {report.analiseRiscos.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        </section>

        <section>
            <h3 className="text-lg font-bold mb-2">Recomendações</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {report.recomendacoes.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        </section>
    </div>
);


interface OnePageReportViewProps {
    adminSettings: AdminSettings | null;
    webhooks: Webhook[];
    setToast: ToastFunc;
    empreendimentos: Empreendimento[];
}

const OnePageReportView: React.FC<OnePageReportViewProps> = ({ adminSettings, webhooks, setToast, empreendimentos }) => {
    const [period, setPeriod] = useState<PeriodOption>('current_week');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [selectedEmpreendimento, setSelectedEmpreendimento] = useState('all');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reportData, setReportData] = useState<OnePageReportData | null>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    const getPeriodRange = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let start = new Date(today);
        let end = new Date(today);

        switch (period) {
            case 'today':
                end.setHours(23, 59, 59, 999);
                break;
            case 'current_week':
                const day = today.getDay();
                const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                start = new Date(today.setDate(diff));
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                break;
            case 'last_week':
                start.setDate(today.getDate() - today.getDay() - 6);
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                break;
            case 'this_year':
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today.getFullYear(), 11, 31);
                end.setHours(23, 59, 59, 999);
                break;
            case 'custom':
                if (customStart) start = new Date(customStart + 'T00:00:00');
                if (customEnd) end = new Date(customEnd + 'T23:59:59');
                break;
        }
        return { start, end };
    };

    const handleGenerateReport = async () => {
        setIsLoading(true);
        setError(null);
        setReportData(null);
        
        try {
            const { start, end } = getPeriodRange();
            const [atas, projetos] = await Promise.all([loadAtasFromFirebase(), getProjetos()]);

            let filteredAtas = atas.filter(ata => {
                const ataDate = new Date(ata.data.split('/').reverse().join('-') + 'T00:00:00');
                return ataDate >= start && ataDate <= end;
            });

            let filteredProjetos = projetos.filter(p => {
                const deadline = new Date(p.deadline + 'T00:00:00');
                const entrega = p.dataEntrega ? new Date(p.dataEntrega + 'T00:00:00') : null;
                const inPeriod = (deadline >= start && deadline <= end) || (entrega && entrega >= start && entrega <= end);
                return inPeriod;
            });

            if (selectedEmpreendimento !== 'all') {
                filteredAtas = filteredAtas.filter(ata => ata.empreendimento === selectedEmpreendimento);
                filteredProjetos = filteredProjetos.filter(p => p.empreendimento === selectedEmpreendimento);
            }
            
            const periodString = `${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`;
            const empreendimentoFoco = selectedEmpreendimento !== 'all' ? selectedEmpreendimento : null;
            
            const generatedReport = await generateOnePageReport(filteredAtas, filteredProjetos, periodString, empreendimentoFoco);
            setReportData(generatedReport);

        } catch (err: any) {
            console.error("Error generating report:", err);
            setError(`Falha ao gerar o relatório: ${err.message}`);
            setToast({ message: `Falha ao gerar o relatório: ${err.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <>
            <main className="container mx-auto p-4 md:p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold flex items-center"><TrendingUpIcon className="w-8 h-8 mr-3 text-slate-500" /> Relatório Gerencial OnePage</h1>
                    <p className="text-slate-500">Gere um sumário executivo com insights sobre atas e projetos em um período.</p>
                </header>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div>
                            <label htmlFor="period-select" className="block text-sm font-medium">Período</label>
                            <select id="period-select" value={period} onChange={e => setPeriod(e.target.value as PeriodOption)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700">
                                <option value="today">Hoje</option>
                                <option value="current_week">Semana Atual</option>
                                <option value="last_week">Semana Passada</option>
                                <option value="this_year">Este Ano</option>
                                <option value="custom">Personalizado</option>
                            </select>
                        </div>
                        {period === 'custom' ? (
                            <div className="flex gap-2">
                                <div>
                                    <label htmlFor="start-date" className="block text-sm font-medium">De</label>
                                    <input id="start-date" type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600" />
                                </div>
                                <div>
                                    <label htmlFor="end-date" className="block text-sm font-medium">Até</label>
                                    <input id="end-date" type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600" />
                                </div>
                            </div>
                        ) : (
                            <div className="hidden lg:block"></div>
                        )}
                         <div className={period === 'custom' ? '' : 'md:col-start-2 lg:col-start-3'}>
                            <label htmlFor="empreendimento-select" className="block text-sm font-medium">Empreendimento</label>
                            <select id="empreendimento-select" value={selectedEmpreendimento} onChange={e => setSelectedEmpreendimento(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700">
                                <option value="all">Todos os Empreendimentos</option>
                                {empreendimentos.map(emp => (
                                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={handleGenerateReport} disabled={isLoading} className="w-full justify-center inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                            <SparklesIcon/> {isLoading ? 'Gerando...' : 'Gerar Relatório'}
                        </button>
                    </div>
                </div>

                {isLoading && <div className="text-center py-10"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4">Analisando dados e compilando insights...</p></div>}
                {error && <div className="text-center py-10 text-red-500"><AlertTriangleIcon className="w-12 h-12 mx-auto mb-2" /><p>{error}</p></div>}
                
                {reportData && (
                    <>
                    <div className="flex justify-end items-center gap-3 mb-4">
                        <button onClick={() => { if(adminSettings) exportOnePageToPdf(reportData, adminSettings) }} className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700" disabled={!adminSettings}><FilePdfIcon/> Exportar PDF</button>
                        <button onClick={() => setIsPreviewModalOpen(true)} className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"><UsersIcon/> Compartilhar</button>
                    </div>
                    <ReportDisplay report={reportData} />
                    </>
                )}
            </main>
            <ReportPreviewModal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} reportData={reportData} webhooks={webhooks} adminSettings={adminSettings} />
        </>
    );
};

export default OnePageReportView;