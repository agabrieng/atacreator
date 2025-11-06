import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { loadAtasFromFirebase } from '../services/firebaseService';
import type { AtaData, Task } from '../types';
import { getAllTasks, parseDate } from '../services/taskService';
import { FileTextIcon, AlertTriangleIcon, CalendarIcon, TargetIcon, CalendarCheckIcon } from './icons';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md flex items-center space-x-4">
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

const TasksPerProjectChart: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    const data = useMemo(() => {
        const counts: Record<string, number> = {};
        tasks.forEach(task => {
            if (!task.completed) {
                const empreendimento = task.sourceAta.empreendimento || 'Não Especificado';
                counts[empreendimento] = (counts[empreendimento] || 0) + 1;
            }
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
    }, [tasks]);

    const maxValue = Math.max(...data.map(d => d.count), 0);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Tarefas Pendentes por Empreendimento</h3>
            <div className="space-y-4">
                {data.length > 0 ? data.map(({ name, count }) => (
                    <div key={name} className="grid grid-cols-[120px,1fr,auto] gap-4 items-center">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate" title={name}>{name}</span>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                            <div
                                className="bg-blue-500 h-4 rounded-full"
                                style={{ width: `${(count / maxValue) * 100}%` }}
                            ></div>
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{count}</span>
                    </div>
                )) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-8">Nenhuma tarefa pendente para exibir.</p>}
            </div>
        </div>
    );
};


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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingTasks = tasks.filter(task => !task.completed);
    const overdueTasks = pendingTasks.filter(task => task.deadlineDate && task.deadlineDate < today);
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
        .filter(task => !task.completed && task.deadlineDate)
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

        {/* Upcoming Tasks & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                 <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Próximas Tarefas</h3>
                 <div className="space-y-4">
                    {upcomingTasks.length > 0 ? upcomingTasks.map(task => (
                        <div key={task.id} className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                                <div className="w-8 h-8 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{task.deadlineDate?.toLocaleString('default', { month: 'short' })}</span>
                                    <span className="text-base font-bold text-slate-800 dark:text-slate-200">{task.deadlineDate?.getDate()}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight">{task.description.substring(0, 60)}{task.description.length > 60 ? '...' : ''}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{task.responsible} &bull; {task.sourceAta.empreendimento}</p>
                            </div>
                        </div>
                    )) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-8">Nenhuma tarefa futura encontrada.</p>}
                 </div>
            </div>
            <div className="lg:col-span-2">
                <TasksPerProjectChart tasks={tasks} />
            </div>
        </div>

    </div>
  );
};

export default Dashboard;
