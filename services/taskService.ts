import { loadAtasFromFirebase } from './firebaseService';
import type { AtaData, Task, TaskStatus, GroupedTasks } from '../types';

/**
 * Parses a date string in "DD/MM/YYYY" format into a Date object.
 * Returns null if the format is invalid.
 */
export const parseDate = (dateString: string | null): Date | null => {
  if (!dateString || typeof dateString !== 'string') return null;
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month, day);
      // Basic validation to check if the constructed date is valid
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date;
      }
    }
  }
  return null;
};

/**
 * Determines the status of a task based on its deadline.
 */
export const getTaskStatus = (deadline: Date | null, completed: boolean): TaskStatus => {
  if (completed) {
    return 'completed';
  }
  if (!deadline) {
    return 'upcoming'; // Or 'no-deadline' if preferred
  }
  const today = new Date();
  // Reset time part to compare dates only
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  if (deadline < today) {
    return 'overdue';
  }
  if (deadline.getTime() === today.getTime()) {
    return 'due-today';
  }
  return 'upcoming';
};


/**
 * Fetches all 'atas' from Firebase and transforms them into a flat list of tasks.
 */
export const getAllTasks = async (): Promise<Task[]> => {
  const allAtas = await loadAtasFromFirebase();
  const allTasks: Task[] = [];

  allAtas.forEach(ata => {
    if (ata.pauta) {
      ata.pauta.forEach((pautaItem, pautaIndex) => {
        if (pautaItem.responsaveis) {
          pautaItem.responsaveis.forEach(resp => {
            const deadlineDate = parseDate(resp.prazo);
            const status = getTaskStatus(deadlineDate, resp.completed ?? false);

            const task: Task = {
              id: `${ata.id}-${pautaIndex}-${resp.id}`,
              description: pautaItem.descricao,
              responsible: resp.responsavel,
              deadline: resp.prazo || 'Sem prazo',
              deadlineDate: deadlineDate,
              status: resp.prazo ? status : 'no-deadline',
              sourceAta: {
                id: ata.id || '',
                title: ata.titulo,
                date: ata.data,
                empreendimento: ata.empreendimento,
              },
              originalAta: ata,
              completed: resp.completed ?? false,
              completionDate: resp.completionDate || null,
              pautaItemIndex: pautaIndex,
              responsavelId: resp.id,
            };
            allTasks.push(task);
          });
        }
      });
    }
  });
  
  // Sort tasks: Incomplete tasks first, sorted by deadline date. Then completed tasks, sorted by completion date.
  allTasks.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    if (a.completed) { // Both are completed, sort by completion date desc
      const dateA = a.completionDate ? parseDate(a.completionDate) : null;
      const dateB = b.completionDate ? parseDate(b.completionDate) : null;
      if (dateA && dateB) return dateB.getTime() - dateA.getTime();
      return dateA ? -1 : 1;
    } else { // Both are incomplete, sort by deadline date asc
      if (a.deadlineDate && b.deadlineDate) {
        return a.deadlineDate.getTime() - b.deadlineDate.getTime();
      }
      return a.deadlineDate ? -1 : 1;
    }
  });

  return allTasks;
};

/**
 * Groups a list of tasks by the responsible person.
 */
export const groupTasksByResponsible = (tasks: Task[]): GroupedTasks => {
    return tasks.reduce((acc: GroupedTasks, task) => {
        const responsible = task.responsible || 'Não atribuído';
        if (!acc[responsible]) {
            acc[responsible] = [];
        }
        acc[responsible].push(task);
        return acc;
    }, {});
};