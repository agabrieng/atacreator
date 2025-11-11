import React, { useState, useMemo, useRef } from 'react';
import type { Task, Projeto } from '../types';
import { AlertTriangleIcon, BriefcaseIcon, FileTextIcon } from './icons';

// A helper to parse DD/MM/YYYY date strings.
const parseAtaDate = (dateString: string | null): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
             const d = new Date(`${year}-${month}-${day}T00:00:00`);
             // Check if it's a valid date
             if (!isNaN(d.getTime())) return d;
        }
    }
    return null;
};

type TimelineItem = {
    id: string; // unique key for react
    originalId: string; // actual id of task or project
    name: string;
    type: 'task' | 'project';
    empreendimento: string;
    startDate: Date;
    endDate: Date;
    status: 'overdue' | 'upcoming' | 'today';
};

const TimelineGanttChart: React.FC<{ 
    tasks: Task[]; 
    projects: Projeto[];
    onItemClick: (type: 'task' | 'project', id: string) => void;
}> = ({ tasks, projects, onItemClick }) => {
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const { currentMonthName, daysInMonth, monthStartDate, monthEndDate } = useMemo(() => {
        const monthStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        monthEndDate.setHours(23, 59, 59, 999);
        const currentMonthName = today.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const daysArray = Array.from({ length: monthEndDate.getDate() }, (_, i) => i + 1);
        return { currentMonthName, daysInMonth: daysArray, monthStartDate, monthEndDate };
    }, [today]);

    const timelineItems = useMemo(() => {
        const combined: TimelineItem[] = [];

        // Process tasks
        tasks.forEach(task => {
            if (task.completed || !task.deadlineDate) return;
            
            const endDate = new Date(task.deadlineDate);
            endDate.setHours(0,0,0,0);
            // Change: A task is a single-day event on its deadline.
            const startDate = endDate;
            
            // Only include tasks relevant for the current month's view
            if (endDate < monthStartDate || startDate > monthEndDate) return;

            let status: 'overdue' | 'upcoming' | 'today' = 'upcoming';
            if (endDate < today) status = 'overdue';
            else if (endDate.getTime() === today.getTime()) status = 'today';

            combined.push({
                id: `task-${task.id}`,
                originalId: task.id,
                name: task.description.split('\n')[0],
                type: 'task',
                empreendimento: task.sourceAta.empreendimento,
                startDate,
                endDate,
                status,
            });
        });

        // Process projects
        projects.forEach(project => {
            if (project.status === 'completed') return;

            const endDate = new Date(`${project.deadline}T00:00:00`);
            // Change: A project is also treated as a single-day event on its deadline.
            const startDate = endDate;

            if (endDate < monthStartDate || startDate > monthEndDate) return;
            
            let status: 'overdue' | 'upcoming' | 'today' = 'upcoming';
            if (endDate < today) status = 'overdue';
            else if (endDate.getTime() === today.getTime()) status = 'today';

            combined.push({
                id: `project-${project.id}`,
                originalId: project.id,
                name: project.name,
                type: 'project',
                empreendimento: project.empreendimento,
                startDate,
                endDate,
                status,
            });
        });

        return combined;
    }, [tasks, projects, today, monthStartDate, monthEndDate]);
    
    const groupedItems = useMemo(() => {
        const groups: Record<string, TimelineItem[]> = {};
        timelineItems.forEach(item => {
            if (!groups[item.empreendimento]) {
                groups[item.empreendimento] = [];
            }
            groups[item.empreendimento].push(item);
        });
        return groups;
    }, [timelineItems]);
    
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
    const chartBodyRef = useRef<HTMLDivElement>(null);

    const handleMouseOver = (e: React.MouseEvent, item: TimelineItem) => {
        if (!chartBodyRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const chartBodyRect = chartBodyRef.current.getBoundingClientRect();
        const content = `${item.name} | Prazo: ${item.endDate.toLocaleDateString('pt-BR')}`;
        setTooltip({
            content,
            x: rect.left - chartBodyRect.left + rect.width / 2,
            y: rect.top - chartBodyRect.top,
        });
    };

    if (timelineItems.length === 0) {
        return (
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2 capitalize">Linha do Tempo - {currentMonthName}</h3>
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <p>Nenhum projeto ou tarefa pendente para este mês.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 capitalize">Linha do Tempo de Entregas - {currentMonthName}</h3>
            <div className="overflow-x-auto relative" ref={chartBodyRef}>
                <div className="min-w-[1200px]">
                    <div className="grid gap-y-1" style={{ gridTemplateColumns: 'minmax(250px, 1fr) 3fr' }}>
                        {/* Header */}
                        <div className="text-sm font-bold text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800 z-10 pr-2 py-2 border-b-2 border-slate-200 dark:border-slate-700">Entregável</div>
                        <div className="relative border-b-2 border-slate-200 dark:border-slate-700">
                            <div className="grid" style={{ gridTemplateColumns: `repeat(${daysInMonth.length}, minmax(35px, 1fr))` }}>
                                {daysInMonth.map(day => (
                                    <div key={day} className={`text-center text-xs font-semibold py-2 ${day === today.getDate() ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {day}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Body */}
                        {Object.entries(groupedItems).map(([empreendimento, items]) => (
                            <React.Fragment key={empreendimento}>
                                <div className="col-span-2 font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md my-2">{empreendimento}</div>
                                {(items as TimelineItem[]).map(item => {
                                    const startDay = item.startDate.getDate();
                                    
                                    const iconContainerStyle = {
                                        gridColumnStart: startDay,
                                        justifySelf: 'center',
                                    };
                                    
                                    let iconContainerClasses = 'w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-all duration-200 hover:brightness-110';
                                    const Icon = item.type === 'task' ? FileTextIcon : BriefcaseIcon;

                                    if (item.status === 'overdue') {
                                        iconContainerClasses += ' bg-red-500';
                                    } else if (item.type === 'task') {
                                        iconContainerClasses += ' bg-blue-500';
                                    } else { // project
                                        iconContainerClasses += ' bg-green-500';
                                    }


                                    return (
                                        <React.Fragment key={item.id}>
                                            <div className="flex items-center text-sm text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800 z-10 pr-2 py-1.5 border-b border-slate-100 dark:border-slate-700/50">
                                                {item.status === 'overdue' && <AlertTriangleIcon className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" title="Atrasado"/>}
                                                {item.type === 'task' ? <FileTextIcon className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" title="Tarefa"/> : <BriefcaseIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" title="Projeto"/>}
                                                <span className="truncate" title={item.name}>{item.name}</span>
                                            </div>
                                            <div className="relative flex items-center py-1.5 border-b border-slate-100 dark:border-slate-700/50">
                                                <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${daysInMonth.length}, minmax(35px, 1fr))` }}>
                                                    {today >= monthStartDate && today <= monthEndDate && (
                                                        <div 
                                                            className="absolute top-0 bottom-0 bg-blue-500/50 w-px" 
                                                            style={{ left: `calc(${(today.getDate() - 1)} * (100% / ${daysInMonth.length}) + (100% / ${daysInMonth.length} / 2))`}}
                                                            title={`Hoje, dia ${today.getDate()}`}
                                                        ></div>
                                                    )}
                                                    <div
                                                        style={iconContainerStyle}
                                                        className={iconContainerClasses}
                                                        onClick={() => onItemClick(item.type, item.originalId)}
                                                        onMouseOver={(e) => handleMouseOver(e, item)}
                                                        onMouseOut={() => setTooltip(null)}
                                                        title={`${item.name} | Prazo: ${item.endDate.toLocaleDateString('pt-BR')}`}
                                                    >
                                                        <Icon className="w-4 h-4 text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
                {tooltip && (
                    <div
                        className="absolute z-20 p-2 text-xs bg-black/80 backdrop-blur-sm text-white rounded-md pointer-events-none"
                        style={{ top: tooltip.y - 32, left: tooltip.x, transform: 'translateX(-50%)' }}
                    >
                        {tooltip.content}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelineGanttChart;