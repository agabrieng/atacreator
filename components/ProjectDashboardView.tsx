import React, { useState, useEffect, useMemo, ReactNode, useRef } from 'react';
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


const CustomTooltip: React.FC<{
  content: ReactNode;
  position: { x: number; y: number } | null;
}> = React.memo(({ content, position }) => {
  if (!position) return null;
  return (
    <div
      className="absolute bg-white dark:bg-slate-900 shadow-lg rounded-lg p-3 text-sm border border-slate-200 dark:border-slate-700 pointer-events-none z-10"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, calc(-100% - 8px))' }}
    >
      {content}
    </div>
  );
});


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
    const data = useMemo(() => {
        // FIX: Explicitly type the Map constructor to ensure correct type inference for projetistaMap.
        const projetistaMap = new Map<string, string>(projetistas.map((p: Projetista) => [p.id, p.name]));
        const counts = new Map<string, number>();

        projects.forEach((proj: Projeto) => {
            const name = projetistaMap.get(proj.projetistaId) || 'Desconhecida';
            counts.set(name, (counts.get(name) || 0) + 1);
        });

        return Array.from(counts.entries()).map(([name, total]) => ({ name, total })).sort((a,b) => b.total - a.total);
    }, [projects, projetistas]);

    const maxValue = Math.max(...data.map(d => d.total), 0);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Projetos por Empresa</h3>
            <div className="space-y-4">
                {data.length > 0 ? data.map(item => (
                    <div key={item.name} className="grid grid-cols-[auto,1fr,auto] gap-3 items-center">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.name}</span>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3.5">
                            <div
                                className="bg-blue-500 h-3.5 rounded-full"
                                style={{ width: `${maxValue > 0 ? (item.total / maxValue) * 100 : 0}%` }}
                            ></div>
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.total}</span>
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

const ProjectDeadlineTrendChart: React.FC<{ projects: Projeto[]; projetistas: Projetista[] }> = React.memo(({ projects, projetistas }) => {
    const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<string>('');
    const containerRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);

    const uniqueEmpreendimentos = useMemo(() => {
        const empreendimentoSet = new Set<string>();
        projects.forEach(p => {
            if (p.empreendimento) empreendimentoSet.add(p.empreendimento);
        });
        return Array.from(empreendimentoSet).sort();
    }, [projects]);

    useEffect(() => {
        if (uniqueEmpreendimentos.length > 0 && !selectedEmpreendimento) {
            setSelectedEmpreendimento(uniqueEmpreendimentos[0]);
        }
    }, [uniqueEmpreendimentos, selectedEmpreendimento]);

    const { data, involvedProjetistas, maxCount, projetistaMap } = useMemo(() => {
        if (!selectedEmpreendimento || projects.length === 0 || projetistas.length === 0) {
            return { data: [], involvedProjetistas: [], maxCount: 5, projetistaMap: new Map() };
        }

        const localProjetistaMap = new Map(projetistas.map(p => [p.id, p.name]));

        const filteredProjects = projects.filter(p => p.empreendimento === selectedEmpreendimento && p.deadline && !isNaN(new Date(p.deadline).getTime()));
        if (filteredProjects.length === 0) {
            return { data: [], involvedProjetistas: [], maxCount: 5, projetistaMap: localProjetistaMap };
        }
        
        const dates = filteredProjects.map(p => new Date(p.deadline));
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

        const monthlyData: Record<string, Record<string, number>> = {}; // key: 'YYYY-MM', value: { projetistaId: count }
        const projetistaSet = new Set<string>();

        filteredProjects.forEach(p => {
            const deadlineDate = new Date(p.deadline);
            const year = deadlineDate.getUTCFullYear();
            const month = deadlineDate.getUTCMonth();
            const key = `${year}-${month}`;
            
            const projetistaId = p.projetistaId;
            projetistaSet.add(projetistaId);

            if (!monthlyData[key]) monthlyData[key] = {};
            monthlyData[key][projetistaId] = (monthlyData[key][projetistaId] || 0) + 1;
        });
        
        const involvedProjetistaList = Array.from(projetistaSet);
        
        const labels: { year: number, month: number, label: string }[] = [];
        let currentDate = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1));
        const lastDate = new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), 1));

        while(currentDate <= lastDate) {
            const year = currentDate.getUTCFullYear();
            const month = currentDate.getUTCMonth();
            const monthLabel = currentDate.toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
            labels.push({ year, month, label: `${monthLabel}/${year.toString().slice(-2)}` });
            currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
        }
        
        const chartData = labels.map(({ year, month, label }) => {
            const key = `${year}-${month}`;
            const entry: any = { month: label };
            const monthlyCounts = monthlyData[key] || {};
            involvedProjetistaList.forEach(projId => {
                entry[projId] = monthlyCounts[projId] || 0;
            });
            return entry;
        });

        const allCounts = chartData.flatMap(d => involvedProjetistaList.map(projId => d[projId]));
        const currentMaxCount = Math.max(0, ...allCounts);
        const maxCount = Math.max(5, Math.ceil(currentMaxCount / 5) * 5);

        return { data: chartData, involvedProjetistas: involvedProjetistaList, maxCount, projetistaMap: localProjetistaMap };
    }, [projects, projetistas, selectedEmpreendimento]);
    
    const colors = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#64748b', '#ef4444'];
    
    const todayLineX = useMemo(() => {
        if (data.length < 2) return null;

        const today = new Date();

        const parseLabel = (label: string): { month: number; year: number } | null => {
            const monthMap: Record<string, number> = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
            const parts = label.split('/');
            if (parts.length !== 2) return null;
            const monthStr = parts[0].toLowerCase().substring(0, 3);
            const yearStr = parts[1];
            const month = monthMap[monthStr];
            if (month === undefined || isNaN(parseInt(yearStr))) return null;
            const year = 2000 + parseInt(yearStr);
            return { month, year };
        };

        const firstLabelParsed = parseLabel(data[0].month);
        const lastLabelParsed = parseLabel(data[data.length - 1].month);
        if (!firstLabelParsed || !lastLabelParsed) return null;

        const chartStartDate = new Date(Date.UTC(firstLabelParsed.year, firstLabelParsed.month, 1));
        const chartEndDate = new Date(Date.UTC(lastLabelParsed.year, lastLabelParsed.month, 1));

        const endOfRange = new Date(chartEndDate);
        endOfRange.setUTCMonth(endOfRange.getUTCMonth() + 1);

        if (today < chartStartDate || today >= endOfRange) {
            return null;
        }

        const totalTimespan = chartEndDate.getTime() - chartStartDate.getTime();
        if (totalTimespan < 0) return null;

        if (totalTimespan === 0) {
            const singleMonthDate = chartStartDate;
            const endOfSingleMonth = new Date(singleMonthDate);
            endOfSingleMonth.setUTCMonth(endOfSingleMonth.getUTCMonth() + 1);
            if (today >= singleMonthDate && today < endOfSingleMonth) {
                const totalDays = new Date(today.getUTCFullYear(), today.getUTCMonth() + 1, 0).getUTCDate();
                const dayRatio = (today.getUTCDate() - 1) / totalDays;
                const middleX = (395 + 30) / 2;
                const spread = 50;
                return middleX - (spread / 2) + (dayRatio * spread);
            }
            return null;
        }

        const todayOffset = today.getTime() - chartStartDate.getTime();
        const todayRatio = todayOffset / totalTimespan;
        
        const startX = 30;
        const endX = 395;
        const plotAreaWidth = endX - startX;
        const xPosition = todayRatio * plotAreaWidth + startX;

        return xPosition;
    }, [data]);


    const getPath = (projetistaId: string, width: number, height: number) => {
        let path = '';
        data.forEach((d, i) => {
            const x = data.length > 1 ? (i / (data.length - 1)) * (width - 65) + 30 : width / 2;
            const y = height - 20 - ((d[projetistaId] || 0) / maxCount) * (height - 40);
            path += `${i === 0 ? 'M' : 'L'}${x},${y} `;
        });
        return path;
    };

    return (
        <div className="bg-white dark:bg-slate-800 pt-6 pb-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center px-6 mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                    <TrendingUpIcon className="w-5 h-5 mr-2 text-slate-500"/>
                    Cronograma de Prazos por Empreendimento
                </h3>
                {uniqueEmpreendimentos.length > 1 && (
                    <select
                        value={selectedEmpreendimento}
                        onChange={e => setSelectedEmpreendimento(e.target.value)}
                        className="text-sm px-3 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                        {uniqueEmpreendimentos.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                    </select>
                )}
            </div>
            {involvedProjetistas.length > 0 ? (
                <>
                <div className="relative h-96" ref={containerRef}>
                    <svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
                        {/* Y-Axis Grid & Labels */}
                        {Array.from({length: 6}).map((_, i) => (
                            <g key={i}>
                                <line x1="30" x2="395" y1={`${20 + i * ((280-20)/5)}`} y2={`${20 + i * ((280-20)/5)}`} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="0.5" />
                                <text x="25" y={`${20 + i * ((280-20)/5)}`} textAnchor="end" alignmentBaseline="middle" fill="currentColor" className="text-xs text-slate-400 dark:text-slate-500">
                                  {Math.round(maxCount * (1 - i/5))}
                                </text>
                            </g>
                        ))}
                        {/* X-Axis Labels */}
                        {data.map((d, i) => {
                             const x = data.length > 1 ? (i / (data.length - 1)) * (395 - 30) + 30 : 400 / 2;
                             return (
                                <text key={i} x={x} y="295" textAnchor="middle" fill="currentColor" className="text-xs text-slate-500 dark:text-slate-400 capitalize">{d.month}</text>
                             );
                        })}
                        {/* Today Line */}
                        {todayLineX !== null && (
                            <line
                                x1={todayLineX}
                                y1="20"
                                x2={todayLineX}
                                y2="280"
                                stroke="red"
                                strokeWidth="1"
                            />
                        )}
                        {/* Lines */}
                        {involvedProjetistas.map((projId, projIndex) => (
                             <path key={projId} d={getPath(projId, 400, 300)} fill="none" stroke={colors[projIndex % colors.length]} strokeWidth="2" />
                        ))}
                        {/* Circles, Tooltips & Data Labels */}
                        {involvedProjetistas.map((projId, projIndex) => 
                            data.map((d, i) => {
                                const x = data.length > 1 ? (i / (data.length - 1)) * (400 - 65) + 30 : 400 / 2;
                                const y = 300 - 20 - ((d[projId] || 0) / maxCount) * (300 - 40);
                                const dataValue = d[projId] || 0;
                                return (
                                    <g key={`${projId}-${i}`}>
                                        <circle cx={x} cy={y} r="4" fill={colors[projIndex % colors.length]} stroke="currentColor" className="stroke-white dark:stroke-slate-800" strokeWidth="2"
                                            onMouseMove={(e) => {
                                                if (!containerRef.current) return;
                                                const containerRect = containerRef.current.getBoundingClientRect();
                                                const targetRect = e.currentTarget.getBoundingClientRect();
                                                const xPos = targetRect.left - containerRect.left + targetRect.width / 2;
                                                const yPos = targetRect.top - containerRect.top;
                                                
                                                const projetistaName = projetistaMap.get(projId) || 'Desconhecido';
                                                
                                                const content = (
                                                    <div className="text-center">
                                                        <div className="font-semibold text-slate-800 dark:text-slate-100">{projetistaName}</div>
                                                        <div className="text-slate-600 dark:text-slate-400">{`${dataValue} prazo(s) em ${d.month}`}</div>
                                                    </div>
                                                );
                                                setTooltip({ x: xPos, y: yPos, content });
                                            }}
                                            onMouseLeave={() => setTooltip(null)}
                                        />
                                        {dataValue > 0 && (
                                            <text
                                                x={x}
                                                y={y - 8}
                                                textAnchor="middle"
                                                fill="currentColor"
                                                className="text-xs text-slate-500 dark:text-slate-400 font-semibold pointer-events-none"
                                            >
                                                {dataValue}
                                            </text>
                                        )}
                                    </g>
                                );
                            })
                         )}
                    </svg>
                    <CustomTooltip position={tooltip ? {x: tooltip.x, y: tooltip.y} : null} content={tooltip?.content} />
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 px-6">
                    {involvedProjetistas.map((projId, i) => (
                        <div key={projId} className="flex items-center">
                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors[i % colors.length] }}></span>
                            <span className="text-xs text-slate-600 dark:text-slate-300">{projetistaMap.get(projId) || 'Desconhecido'}</span>
                        </div>
                    ))}
                </div>
                </>
            ) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-8 px-6">Nenhum projeto com prazo definido para este empreendimento.</p>}
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
                <div className="lg:col-span-2">
                    <ProjectsByCompanyChart projects={projetos} projetistas={projetistas} />
                </div>
                <div className="lg:col-span-1">
                     <ProjectStatusPieChart projects={projetos} />
                </div>
                <div className="lg:col-span-2">
                    <ProjectDeadlineTrendChart projects={projetos} projetistas={projetistas} />
                </div>
                <div className="lg:col-span-1">
                    <UpcomingDeadlinesList projects={projetos} projetistas={projetistas} />
                </div>
            </div>
        </div>
    );
};

export default ProjectDashboardView;