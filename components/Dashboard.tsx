import React, { useState, useEffect, useMemo, ReactNode, useRef } from 'react';
import { loadAtasFromFirebase } from '../services/firebaseService';
import type { AtaData, Task } from '../types';
import { getAllTasks } from '../services/taskService';
import { FileTextIcon, AlertTriangleIcon, TargetIcon, CalendarCheckIcon, PieChartIcon, TrendingUpIcon } from './icons';

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

const TaskStatusPieChart: React.FC<{ tasks: Task[] }> = React.memo(({ tasks }) => {
    const data = useMemo(() => {
        const statuses = { completed: 0, overdue: 0, 'due-today': 0, upcoming: 0 };
        tasks.forEach(task => {
            if (statuses[task.status] !== undefined) {
                statuses[task.status]++;
            }
        });
        return [
            { name: 'Concluído', value: statuses.completed, color: '#10b981' },
            { name: 'Atrasado', value: statuses.overdue, color: '#ef4444' },
            { name: 'Entrega Hoje', value: statuses['due-today'], color: '#f97316' },
            { name: 'Próximo', value: statuses.upcoming, color: '#3b82f6' },
        ].filter(d => d.value > 0);
    }, [tasks]);

    const totalTasks = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const getArcPath = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number, innerRadius: number) => {
        const start = {
            x: cx + radius * Math.cos(startAngle),
            y: cy + radius * Math.sin(startAngle),
        };
        const end = {
            x: cx + radius * Math.cos(endAngle),
            y: cy + radius * Math.sin(endAngle),
        };
        const innerStart = {
            x: cx + innerRadius * Math.cos(startAngle),
            y: cy + innerRadius * Math.sin(startAngle),
        };
        const innerEnd = {
            x: cx + innerRadius * Math.cos(endAngle),
            y: cy + innerRadius * Math.sin(endAngle),
        };
        const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y} Z`;
    };
    
    let cumulativeAngle = -Math.PI / 2;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <PieChartIcon className="w-5 h-5 mr-2 text-slate-500"/>
                Status das Tarefas
            </h3>
            {totalTasks > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="relative">
                        <svg viewBox="0 0 100 100">
                            {data.map((item, index) => {
                                const angle = (item.value / totalTasks) * 2 * Math.PI;
                                const startAngle = cumulativeAngle;
                                cumulativeAngle += angle;
                                const endAngle = cumulativeAngle;
                                const isHovered = index === hoveredIndex;
                                return (
                                    <path
                                        key={item.name}
                                        d={getArcPath(50, 50, 50, startAngle, endAngle, 30)}
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
                            <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{totalTasks}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
                        </div>
                    </div>
                    <ul className="space-y-2">
                        {data.map((item, index) => (
                            <li key={item.name} className={`flex items-center justify-between p-2 rounded-md transition-all ${hoveredIndex === index ? 'bg-slate-100 dark:bg-slate-700' : ''}`}>
                                <div className="flex items-center">
                                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.name}</span>
                                </div>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.value} ({(item.value / totalTasks * 100).toFixed(1)}%)</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-8">Nenhuma tarefa para exibir.</p>}
        </div>
    );
});

const TasksPerProjectChart: React.FC<{ tasks: Task[] }> = React.memo(({ tasks }) => {
    const data = useMemo(() => {
        const counts: Record<string, number> = {};
        tasks.forEach(task => {
            const isPending = task.status === 'overdue' || task.status === 'due-today' || task.status === 'upcoming';
            if (isPending) {
                const empreendimento = task.sourceAta.empreendimento || 'Não Especificado';
                counts[empreendimento] = (counts[empreendimento] || 0) + 1;
            }
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
    }, [tasks]);

    const maxValue = Math.max(...data.map(d => d.count), 0);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Tarefas Pendentes por Empreendimento</h3>
            <div className="space-y-4">
                {data.length > 0 ? data.map(({ name, count }) => (
                    <div key={name} className="grid grid-cols-[auto,1fr,auto] gap-4 items-center">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300" title={name}>{name}</span>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                            <div
                                className="bg-blue-500 h-3 rounded-full"
                                style={{ width: `${maxValue > 0 ? (count / maxValue) * 100 : 0}%` }}
                            ></div>
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{count}</span>
                    </div>
                )) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-8">Nenhuma tarefa pendente para exibir.</p>}
            </div>
        </div>
    );
});

const UpcomingTasksList: React.FC<{ tasks: Task[] }> = React.memo(({ tasks }) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
             <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Próximas Tarefas</h3>
             <div className="space-y-4">
                {tasks.length > 0 ? tasks.map(task => (
                    <div key={task.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                            <div className="w-10 h-10 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{task.deadlineDate?.toLocaleString('pt-BR', { month: 'short' })}</span>
                                <span className="text-base font-bold text-slate-800 dark:text-slate-200">{task.deadlineDate?.getDate()}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight">{task.description.split('\n')[0]}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{task.responsible} &bull; {task.sourceAta.empreendimento}</p>
                        </div>
                    </div>
                )) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-8">Nenhuma tarefa futura encontrada.</p>}
             </div>
        </div>
    );
});

const TaskEvolutionChart: React.FC<{ tasks: Task[] }> = React.memo(({ tasks }) => {
    const { data, projects, maxCount } = useMemo(() => {
        const monthlyData: Record<string, Record<string, number>> = {};
        const projects = new Set<string>();
        const currentYear = new Date().getFullYear();

        const tasksWithResponsible = tasks.filter(task => task.responsible && task.responsible.trim() !== '');

        tasksWithResponsible.forEach(task => {
            const ataDate = task.originalAta.data ? new Date(task.originalAta.data.split('/').reverse().join('-')) : null;
            if (ataDate && ataDate.getFullYear() === currentYear) {
                const month = ataDate.getMonth();
                const empreendimento = task.sourceAta.empreendimento || 'Não Especificado';
                projects.add(empreendimento);
                const key = `${month}`;
                if (!monthlyData[key]) monthlyData[key] = {};
                monthlyData[key][empreendimento] = (monthlyData[key][empreendimento] || 0) + 1;
            }
        });
        
        const months = Array.from({ length: 12 }, (_, i) => new Date(2000, i).toLocaleString('pt-BR', { month: 'short' }).replace('.', ''));
        const projectList = Array.from(projects);
        
        const chartData = months.map((month, i) => {
            const entry: any = { month };
            projectList.forEach(p => {
                entry[p] = monthlyData[`${i}`]?.[p] || 0;
            });
            return entry;
        });

        const maxCount = Math.max(5, ...chartData.map(d => Math.max(...projectList.map(p => d[p]))));

        return { data: chartData, projects: projectList, maxCount };
    }, [tasks]);

    const colors = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899'];
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const getPath = (project: string, width: number, height: number) => {
        let path = '';
        data.forEach((d, i) => {
            const x = (i / 11) * (width - 60) + 40;
            const y = height - 20 - (d[project] / maxCount) * (height - 40);
            path += `${i === 0 ? 'M' : 'L'}${x},${y} `;
        });
        return path;
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <TrendingUpIcon className="w-5 h-5 mr-2 text-slate-500"/>
                Evolução de Tarefas no Ano
            </h3>
            {projects.length > 0 ? (
                <>
                <div className="relative h-72" ref={containerRef}>
                    <svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
                        <g className="grid">
                           {Array.from({length: 6}).map((_, i) => (
                                <g key={i}>
                                    <line x1="40" x2="380" y1={`${20 + i * ((280-20)/5)}`} y2={`${20 + i * ((280-20)/5)}`} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="0.5" />
                                    <text x="35" y={`${20 + i * ((280-20)/5)}`} textAnchor="end" alignmentBaseline="middle" fill="currentColor" className="text-xs text-slate-400 dark:text-slate-500">
                                      {Math.round(maxCount * (1 - i/5))}
                                    </text>
                                </g>
                           ))}
                        </g>
                        {data.map((d, i) => (
                            <text key={i} x={`${(i / 11) * (380-40) + 40}`} y="295" textAnchor="middle" fill="currentColor" className="text-xs text-slate-500 dark:text-slate-400 capitalize">{d.month}</text>
                        ))}
                        
                        {projects.map((p, pIndex) => (
                             <path key={p} d={getPath(p, 400, 300)} fill="none" stroke={colors[pIndex % colors.length]} strokeWidth="2" />
                        ))}

                         {projects.map((p, pIndex) => 
                            data.map((d, i) => {
                                const x = (i / 11) * (400 - 60) + 40;
                                const y = 300 - 20 - (d[p] / maxCount) * (300 - 40);
                                return (
                                    <circle key={`${p}-${i}`} cx={x} cy={y} r="4" fill={colors[pIndex % colors.length]} stroke="currentColor" className="stroke-white dark:stroke-slate-800" strokeWidth="2"
                                        onMouseMove={(e) => {
                                            if (!containerRef.current) return;
                                            const containerRect = containerRef.current.getBoundingClientRect();
                                            const targetRect = e.currentTarget.getBoundingClientRect();
                                            
                                            const xPos = targetRect.left - containerRect.left + targetRect.width / 2;
                                            const yPos = targetRect.top - containerRect.top;
            
                                            const content = (
                                                <div className="text-center">
                                                    <div className="font-semibold text-slate-800 dark:text-slate-100">{p}</div>
                                                    <div className="text-slate-600 dark:text-slate-400">{`${d[p]} tarefa(s) em ${d.month}`}</div>
                                                </div>
                                            );
            
                                            setTooltip({ x: xPos, y: yPos, content });
                                        }}
                                        onMouseLeave={() => setTooltip(null)}
                                    />
                                );
                            })
                         )}
                    </svg>
                    <CustomTooltip position={tooltip ? {x: tooltip.x, y: tooltip.y} : null} content={tooltip?.content} />
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                    {projects.map((p, i) => (
                        <div key={p} className="flex items-center">
                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors[i % colors.length] }}></span>
                            <span className="text-xs text-slate-600 dark:text-slate-300">{p}</span>
                        </div>
                    ))}
                </div>
                </>
            ) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-8">Nenhuma tarefa com prazo definido neste ano para exibir.</p>}
        </div>
    );
});


const Dashboard: React.FC = () => {
  const [atas, setAtas] = useState<AtaData[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [loadedAtas, loadedTasks] = await Promise.all([loadAtasFromFirebase(), getAllTasks()]);
        setAtas(loadedAtas);
        setTasks(loadedTasks);
      } catch (err: any) {
        console.error("Failed to load dashboard data:", err);
        setError(`Não foi possível carregar os dados do dashboard: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    // Corrected logic for pending and overdue tasks to be consistent across the dashboard.
    const pendingTasks = tasks.filter(task => 
        task.status === 'overdue' || task.status === 'due-today' || task.status === 'upcoming'
    );
    const overdueTasks = tasks.filter(task => task.status === 'overdue');
    const uniqueEmpreendimentos = new Set(atas.map(ata => ata.empreendimento));
    
    return {
        totalAtas: atas.length,
        totalPendingTasks: pendingTasks.length,
        totalOverdueTasks: overdueTasks.length,
        activeEmpreendimentos: uniqueEmpreendimentos.size,
    };
  }, [atas, tasks]);

  const upcomingTasks = useMemo(() => {
    return tasks
        .filter(task => !task.completed && task.status === 'upcoming' && task.deadlineDate)
        .sort((a, b) => a.deadlineDate!.getTime() - b.deadlineDate!.getTime())
        .slice(0, 7);
  }, [tasks]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <AlertTriangleIcon className="w-16 h-16 mb-4 text-red-500" />
        <h3 className="text-xl font-semibold mb-3 text-slate-800 dark:text-slate-100">Ocorreu um Erro</h3>
        <p className="max-w-md text-slate-600 dark:text-slate-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
        <header>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400">Visão geral das suas atas e tarefas.</p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total de Atas" value={stats.totalAtas} icon={FileTextIcon} color="bg-blue-500" />
            <StatCard title="Tarefas Pendentes" value={stats.totalPendingTasks} icon={TargetIcon} color="bg-yellow-500" />
            <StatCard title="Tarefas Atrasadas" value={stats.totalOverdueTasks} icon={AlertTriangleIcon} color="bg-red-500" />
            <StatCard title="Empreendimentos Ativos" value={stats.activeEmpreendimentos} icon={CalendarCheckIcon} color="bg-green-500" />
        </div>
        
        {/* Charts Layout - Updated to match the new screenshot */}
        <div className="space-y-6">
            <TaskEvolutionChart tasks={tasks} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <TaskStatusPieChart tasks={tasks} />
                <TasksPerProjectChart tasks={tasks} />
                <UpcomingTasksList tasks={upcomingTasks} />
            </div>
        </div>
    </div>
  );
};

export default Dashboard;