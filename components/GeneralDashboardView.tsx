import React, { useState, useEffect, useMemo } from 'react';
import { getProjetistas, getProjetos } from '../services/firebaseService';
import { getAllTasks } from '../services/taskService';
import type { AtaData, Projeto, ProjectStatus, Task, Projetista } from '../types';
import { LayoutDashboardIcon, AlertTriangleIcon, TargetIcon, BriefcaseIcon, CalendarCheckIcon, PieChartIcon, XIcon } from './icons';
import MinutesDisplay from './MinutesDisplay';
import TimelineGanttChart from './TimelineGanttChart';
import type { ItemToHighlight } from '../App';


const getProjectStatusWithOverdueCheck = (status: ProjectStatus, deadline: string): ProjectStatus => {
    if (status === 'completed') {
        return 'completed';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(`${deadline}T00:00:00`);
    if (deadlineDate < today) {
        return 'overdue';
    }
    return status;
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
            <div className={`rounded-full p-3 ${color}`}>
                <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
            </div>
        </div>
    );
};

const StatusPieChart: React.FC<{ tasks: Task[]; projects: Projeto[] }> = React.memo(({ tasks, projects }) => {
    const data = useMemo(() => {
        const statuses = { completed: 0, overdue: 0, 'in-progress': 0, pending: 0 };
        
        tasks.forEach(task => {
            if (task.status === 'completed') statuses.completed++;
            else if (task.status === 'overdue') statuses.overdue++;
            else statuses['in-progress']++; // Count due-today and upcoming as in-progress
        });

        projects.forEach(p => {
            const currentStatus = getProjectStatusWithOverdueCheck(p.status, p.deadline);
            if (currentStatus === 'completed') statuses.completed++;
            else if (currentStatus === 'overdue') statuses.overdue++;
            else if (currentStatus === 'in-progress') statuses['in-progress']++;
            else if (currentStatus === 'pending') statuses.pending++;
        });

        return [
            { name: 'Concluído', value: statuses.completed, color: '#10b981' }, // green-500
            { name: 'Em Andamento', value: statuses['in-progress'], color: '#3b82f6' }, // blue-500
            { name: 'Atrasado', value: statuses.overdue, color: '#ef4444' }, // red-500
            { name: 'Pendente', value: statuses.pending, color: '#64748b' }, // slate-500
        ].filter(d => d.value > 0);
    }, [tasks, projects]);

    const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const getArcPath = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number, innerRadius: number) => {
        const start = { x: cx + radius * Math.cos(startAngle), y: cy + radius * Math.sin(startAngle) };
        const end = { x: cx + radius * Math.cos(endAngle), y: cy + radius * Math.sin(endAngle) };
        const innerStart = { x: cx + innerRadius * Math.cos(startAngle), y: cy + innerRadius * Math.sin(startAngle) };
        const innerEnd = { x: cx + innerRadius * Math.cos(endAngle), y: cy + innerRadius * Math.sin(endAngle) };
        const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y} Z`;
    };
    
    let cumulativeAngle = -Math.PI / 2;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 h-full">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <PieChartIcon className="w-5 h-5 mr-2 text-slate-500"/>Status Geral dos Itens
            </h3>
            {total > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center h-full">
                     <div className="relative">
                        <svg viewBox="0 0 100 100">
                            {data.map((item, index) => {
                                const angle = (item.value / total) * 2 * Math.PI;
                                const startAngle = cumulativeAngle;
                                cumulativeAngle += angle;
                                const isHovered = index === hoveredIndex;
                                return (
                                    <path
                                        key={item.name}
                                        d={getArcPath(50, 50, 50, startAngle, cumulativeAngle, 30)}
                                        fill={item.color}
                                        onMouseEnter={() => setHoveredIndex(index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                        className="transition-transform duration-200"
                                        style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)', transformOrigin: '50% 50%'}}
                                    />
                                );
                            })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-bold text-slate-800 dark:text-slate-100">{total}</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">Itens</span>
                        </div>
                    </div>
                    <ul className="space-y-2">
                        {data.map((item, index) => (
                            <li key={item.name} className={`flex items-center justify-between p-2 rounded-md transition-all ${hoveredIndex === index ? 'bg-slate-100 dark:bg-slate-700' : ''}`}>
                                <div className="flex items-center">
                                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.name}</span>
                                </div>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.value} ({(item.value / total * 100).toFixed(0)}%)</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : <p className="text-sm text-center text-slate-500 py-8">Nenhum item para exibir.</p>}
        </div>
    );
});

type CombinedItem = {
    type: 'task' | 'project';
    id: string;
    description: string;
    empreendimento: string;
    deadline: Date;
    data: Task | Projeto;
};

const GeneralDashboardView: React.FC<{ 
    onNavigateToAta: (ata: AtaData) => void;
    onHighlightItem: (type: 'task' | 'project', id: string) => void;
}> = ({ onNavigateToAta, onHighlightItem }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Projeto[]>([]);
    const [projetistas, setProjetistas] = useState<Projetista[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewingAta, setViewingAta] = useState<AtaData | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [loadedTasks, loadedProjects, loadedProjetistas] = await Promise.all([
                    getAllTasks(), 
                    getProjetos(),
                    getProjetistas()
                ]);
                setTasks(loadedTasks);
                setProjects(loadedProjects);
                setProjetistas(loadedProjetistas);
            } catch (err: any) {
                setError(`Falha ao carregar dados: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const projetistaMap = useMemo(() => {
        return new Map(projetistas.map(p => [p.id, p]));
    }, [projetistas]);

    const stats = useMemo(() => {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const pendingProjects = projects.filter(p => getProjectStatusWithOverdueCheck(p.status, p.deadline) === 'pending').length;
        const activeProjects = projects.filter(p => p.status === 'in-progress' || p.status === 'pending');
        const overdueTasks = tasks.filter(t => t.status === 'overdue').length;
        const overdueProjects = projects.filter(p => getProjectStatusWithOverdueCheck(p.status, p.deadline) === 'overdue').length;

        const deliveriesNext7DaysTasks = tasks.filter(t => !t.completed && t.deadlineDate && t.deadlineDate >= today && t.deadlineDate <= nextWeek).length;
        const deliveriesNext7DaysProjects = projects.filter(p => p.status !== 'completed' && new Date(p.deadline) >= today && new Date(p.deadline) <= nextWeek).length;

        return {
            pendingItems: pendingProjects,
            activeProjects: activeProjects.length,
            totalOverdue: overdueTasks + overdueProjects,
            deliveriesNext7Days: deliveriesNext7DaysTasks + deliveriesNext7DaysProjects,
        };
    }, [tasks, projects]);

    const { overdueItems, todayItems, upcomingItems } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const combined: CombinedItem[] = [
            ...tasks.filter(t => !t.completed && t.deadlineDate).map(t => ({
                type: 'task' as const,
                id: t.id,
                description: t.description.split('\n')[0],
                empreendimento: t.sourceAta.empreendimento,
                deadline: t.deadlineDate!,
                data: t
            })),
            ...projects.filter(p => p.status !== 'completed').map(p => ({
                type: 'project' as const,
                id: p.id,
                description: p.name,
                empreendimento: p.empreendimento,
                deadline: new Date(`${p.deadline}T00:00:00`),
                data: p
            }))
        ];
        
        const overdue = combined.filter(item => item.deadline < today).sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
        const forToday = combined.filter(item => item.deadline.getTime() === today.getTime());
        const upcoming = combined.filter(item => item.deadline > today).sort((a,b) => a.deadline.getTime() - b.deadline.getTime()).slice(0, 5);
        
        return { overdueItems: overdue, todayItems: forToday, upcomingItems: upcoming };
    }, [tasks, projects]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    if (error) {
        return <div className="flex flex-col items-center justify-center h-full text-center p-4"><AlertTriangleIcon className="w-16 h-16 mb-4 text-red-500" /><h3 className="text-xl font-semibold mb-3">Ocorreu um Erro</h3><p className="max-w-md">{error}</p></div>;
    }

    const renderFocusItem = (item: CombinedItem) => {
        const projetistaName = item.type === 'project' 
            ? projetistaMap.get((item.data as Projeto).projetistaId)?.name
            : null;

        return (
            <div key={item.id} className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className={`mt-1 w-5 h-5 rounded-full flex-shrink-0 ${item.type === 'task' ? 'bg-blue-500' : 'bg-green-500'}`} title={item.type === 'task' ? 'Tarefa de ATA' : 'Projeto de Entregáveis'}></div>
                <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">{item.description}</p>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center flex-wrap">
                        <span>{item.empreendimento} &bull; </span>
                        {item.type === 'task' ? (
                            <>
                                <span className="font-semibold ml-1 text-blue-600 dark:text-blue-400">Tarefa de ATA</span>
                                <button onClick={() => setViewingAta((item.data as Task).originalAta)} className="ml-2 text-blue-500 hover:underline">Ver ATA</button>
                            </>
                        ) : (
                            <>
                                <span className="font-semibold ml-1 text-green-600 dark:text-green-400">
                                    Projeto de Entregáveis
                                </span>
                                {projetistaName && <span className="ml-1">- {projetistaName}</span>}
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="p-4 md:p-8 space-y-8">
                <header>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center"><LayoutDashboardIcon className="w-8 h-8 mr-3 text-slate-500" /> Painel Geral</h1>
                    <p className="text-slate-500 dark:text-slate-400">Sua central de comando com insights sobre ATAs e projetos.</p>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Projetos Pendentes" value={stats.pendingItems} icon={TargetIcon} color="bg-yellow-500" />
                    <StatCard title="Projetos Ativos" value={stats.activeProjects} icon={BriefcaseIcon} color="bg-blue-500" />
                    <StatCard title="Total de Itens Atrasados" value={stats.totalOverdue} icon={AlertTriangleIcon} color="bg-red-500" />
                    <StatCard title="Entregas (Próximos 7 Dias)" value={stats.deliveriesNext7Days} icon={CalendarCheckIcon} color="bg-green-500" />
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                    <TimelineGanttChart tasks={tasks} projects={projects} onItemClick={onHighlightItem} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Foco do Dia</h3>
                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">
                                <span className="font-semibold">Legenda:</span>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span>Tarefa de ATA</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Projeto de Entregáveis</span></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center"><div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div> Atrasado ({overdueItems.length})</h4>
                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 -mr-2">{overdueItems.length > 0 ? overdueItems.map(renderFocusItem) : <p className="text-sm text-slate-500 pt-2">Nenhum item atrasado!</p>}</div>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-orange-600 dark:text-orange-400 mb-2 flex items-center"><div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div> Para Hoje ({todayItems.length})</h4>
                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 -mr-2">{todayItems.length > 0 ? todayItems.map(renderFocusItem) : <p className="text-sm text-slate-500 pt-2">Nenhum item com prazo para hoje.</p>}</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Próximos Prazos</h3>
                            <div className="space-y-4">
                                {upcomingItems.length > 0 ? upcomingItems.map(item => (
                                    <div key={item.id} className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className={`w-10 h-10 flex flex-col items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700`}>
                                                <span className={`text-xs font-bold uppercase text-slate-500 dark:text-slate-400`}>{item.deadline.toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')}</span>
                                                <span className={`text-base font-bold text-slate-800 dark:text-slate-200`}>{item.deadline.getUTCDate()}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium leading-tight">{item.description}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.empreendimento} &bull; <span className={`font-semibold ${item.type === 'task' ? 'text-blue-500' : 'text-green-500'}`}>{item.type === 'task' ? 'Tarefa' : 'Projeto'}</span></p>
                                        </div>
                                    </div>
                                )) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-8">Nenhum prazo futuro encontrado.</p>}
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <StatusPieChart tasks={tasks} projects={projects} />
                    </div>
                </div>
            </div>

            {viewingAta && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-fade-in-down" style={{ animationDuration: '0.2s' }}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh]">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate pr-4">{viewingAta.titulo}</h3>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => { if (viewingAta) onNavigateToAta(viewingAta); setViewingAta(null); }} 
                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    title="Abrir em tela cheia para editar"
                                >
                                    Abrir para Editar
                                </button>
                                <button onClick={() => setViewingAta(null)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 sm:p-6 overflow-y-auto">
                            <MinutesDisplay ata={viewingAta} setAta={() => {}} isEditing={false} invalidDeadlineFields={new Set()} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GeneralDashboardView;