
import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { getProjetistas, getProjetos } from '../services/firebaseService';
import type { Projetista, Projeto, ProjectStatus } from '../types';
import { AlertTriangleIcon, BriefcaseIcon, CheckCircleIcon, PieChartIcon, TargetIcon, TrendingUpIcon } from './icons';

// --- Helper Functions ---
const getStatusWithOverdueCheck = (status: ProjectStatus, deadline: string): ProjectStatus => {
    if (status === 'completed') {
        return 'completed';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    if (deadlineDate < today) {
        return 'overdue';
    }
    return status;
}

// --- Reusable Components for this Dashboard ---

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => (
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


const ProjectStatusPieChart: React.FC<{ projects: Projeto[] }> = React.memo(({ projects }) => {
    const data = useMemo(() => {
        const statuses: Record<ProjectStatus, number> = { completed: 0, overdue: 0, 'in-progress': 0, pending: 0 };
        projects.forEach(p => {
            const currentStatus = getStatusWithOverdueCheck(p.status, p.deadline);
            statuses[currentStatus]++;
        });
        return [
            { name: 'Concluído', value: statuses.completed, color: '#10b981' }, // green-500
            { name: 'Atrasado', value: statuses.overdue, color: '#ef4444' },   // red-500
            { name: 'Em Andamento', value: statuses['in-progress'], color: '#3b82f6' }, // blue-500
            { name: 'Pendente', value: statuses.pending, color: '#64748b' }, // slate-500
        ].filter(d => d.value > 0);
    }, [projects]);

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
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <PieChartIcon className="w-5 h-5 mr-2 text-slate-500"/>Status Geral dos Projetos
            </h3>
            {total > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="relative"><svg viewBox="0 0 100 100">
                        {data.map((item, index) => {
                            const angle = (item.value / total) * 2 * Math.PI;
                            const startAngle = cumulativeAngle;
                            cumulativeAngle += angle;
                            return <path key={item.name} d={getArcPath(50, 50, 50, startAngle, cumulativeAngle, 30)} fill={item.color} onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)} style={{ transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)', transformOrigin: '50% 50%', transition: 'transform 0.2s' }}/>
                        })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-3xl font-bold">{total}</span><span className="text-xs text-slate-500">Total</span></div></div>
                    <ul className="space-y-2">
                        {data.map((item, index) => <li key={item.name} className={`flex items-center justify-between p-2 rounded-md transition-all ${hoveredIndex === index ? 'bg-slate-100 dark:bg-slate-700' : ''}`}><div className="flex items-center"><span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span><span className="text-sm">{item.name}</span></div><span className="font-bold text-sm">{item.value} ({(item.value / total * 100).toFixed(1)}%)</span></li>)}
                    </ul>
                </div>
            ) : <p className="text-sm text-center text-slate-500 py-8">Nenhum projeto para exibir.</p>}
        </div>
    );
});


const ProjectsByCompanyChart: React.FC<{ projects: Projeto[]; projetistas: Projetista[] }> = React.memo(({ projects, projetistas }) => {
    const statusOrder: ProjectStatus[] = ['completed', 'in-progress', 'pending', 'overdue'];
    const statusColors: Record<ProjectStatus, string> = { completed: '#10b981', 'in-progress': '#3b82f6', pending: '#64748b', overdue: '#ef4444' };
    
    const data = useMemo(() => {
        const projetistaMap = new Map(projetistas.map(p => [p.id, p.name]));
        const counts = new Map<string, Record<ProjectStatus, number>>();

        projects.forEach(proj => {
            const name = projetistaMap.get(proj.projetistaId) || 'Desconhecida';
            if (!counts.has(name)) {
                counts.set(name, { completed: 0, overdue: 0, 'in-progress': 0, pending: 0 });
            }
            const currentStatus = getStatusWithOverdueCheck(proj.status, proj.deadline);
            counts.get(name)![currentStatus]++;
        });

        return Array.from(counts.entries()).map(([name, statuses]) => ({ name, ...statuses, total: Object.values(statuses).reduce((a, b) => a + b, 0) })).sort((a,b) => b.total - a.total);
    }, [projects, projetistas]);

    const maxValue = Math.max(...data.map(d => d.total), 0);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Projetos por Empresa</h3>
            <div className="space-y-4">
                {data.length > 0 ? data.map(item => (
                    <div key={item.name}>
                        <div className="flex justify-between items-center mb-1"><span className="text-sm font-medium">{item.name}</span><span className="text-sm font-bold">{item.total}</span></div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 flex overflow-hidden">
                            {statusOrder.map(status => item[status] > 0 && (
                                <div key={status} className="h-4" style={{ width: `${(item[status] / item.total) * 100}%`, backgroundColor: statusColors[status] }} title={`${status.replace('-', ' ')}: ${item[status]}`}></div>
                            ))}
                        </div>
                    </div>
                )) : <p className="text-sm text-center text-slate-500 py-8">Nenhum projeto para exibir.</p>}
            </div>
        </div>
    );
});


const UpcomingDeadlinesList: React.FC<{ projects: Projeto[]; projetistas: Projetista[] }> = React.memo(({ projects, projetistas }) => {
    const upcoming = useMemo(() => {
        const projetistaMap = new Map(projetistas.map(p => [p.id, p.name]));
        return projects
            .filter(p => p.status !== 'completed')
            .map(p => ({ ...p, deadlineDate: new Date(p.deadline), projetistaName: projetistaMap.get(p.projetistaId) || 'Desconhecida' }))
            .sort((a, b) => a.deadlineDate.getTime() - b.deadlineDate.getTime())
            .slice(0, 7);
    }, [projects, projetistas]);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
             <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Próximos Prazos</h3>
             <div className="space-y-4">
                {upcoming.length > 0 ? upcoming.map(p => {
                    const status = getStatusWithOverdueCheck(p.status, p.deadline);
                    const isOverdue = status === 'overdue';
                    return (
                        <div key={p.id} className="flex items-start space-x-3">
                            <div className={`flex-shrink-0 mt-1 w-10 h-10 flex flex-col items-center justify-center rounded-lg ${isOverdue ? 'bg-red-100 dark:bg-red-900/50' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                <span className={`text-xs font-bold uppercase ${isOverdue ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>{p.deadlineDate?.toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')}</span>
                                <span className={`text-base font-bold ${isOverdue ? 'text-red-800 dark:text-red-200' : 'text-slate-800 dark:text-slate-200'}`}>{p.deadlineDate?.getUTCDate()}</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium leading-tight">{p.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{p.projetistaName}</p>
                            </div>
                        </div>
                    );
                }) : <p className="text-sm text-center text-slate-500 py-8">Nenhum prazo pendente.</p>}
             </div>
        </div>
    );
});


const ProjectDashboardView: React.FC = () => {
    const [projetistas, setProjetistas] = useState<Projetista[]>([]);
    const [projetos, setProjetos] = useState<Projeto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [loadedProjetistas, loadedProjetos] = await Promise.all([getProjetistas(), getProjetos()]);
                setProjetistas(loadedProjetistas);
                setProjetos(loadedProjetos);
            } catch (err: any) {
                setError(`Falha ao carregar dados do dashboard: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const stats = useMemo(() => {
        const overdue = projetos.filter(p => getStatusWithOverdueCheck(p.status, p.deadline) === 'overdue').length;
        const inProgress = projetos.filter(p => p.status === 'in-progress' && getStatusWithOverdueCheck(p.status, p.deadline) !== 'overdue').length;
        const completed = projetos.filter(p => p.status === 'completed').length;
        return {
            total: projetos.length,
            overdue,
            inProgress,
            completed
        };
    }, [projetos]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <AlertTriangleIcon className="w-16 h-16 mb-4 text-red-500" />
                <h3 className="text-xl font-semibold mb-3">Ocorreu um Erro</h3>
                <p className="max-w-md text-slate-600 dark:text-slate-300">{error}</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Dashboard de Projetos</h1>
                <p className="text-slate-500 dark:text-slate-400">Insights sobre o andamento dos projetos contratados.</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total de Projetos" value={stats.total} icon={BriefcaseIcon} color="bg-blue-500" />
                <StatCard title="Projetos Atrasados" value={stats.overdue} icon={AlertTriangleIcon} color="bg-red-500" />
                <StatCard title="Em Andamento" value={stats.inProgress} icon={TargetIcon} color="bg-yellow-500" />
                <StatCard title="Projetos Concluídos" value={stats.completed} icon={CheckCircleIcon} color="bg-green-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <ProjectsByCompanyChart projects={projetos} projetistas={projetistas} />
                </div>
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <ProjectStatusPieChart projects={projetos} />
                    <UpcomingDeadlinesList projects={projetos} projetistas={projetistas} />
                </div>
            </div>
        </div>
    );
};

export default ProjectDashboardView;
