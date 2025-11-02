import type { Task, GroupedTasks, AdminSettings } from '../types';

/**
 * Generates a professional HTML string for the daily deadline bulletin email.
 * @param tasks - A list of all tasks. The function will filter for tasks due today.
 * @param adminSettings - The current company settings for branding.
 * @returns An HTML string.
 */
export const generateDailyBulletinHtml = (tasks: Task[], adminSettings: AdminSettings | null): string => {
  const today = new Date();
  const todayStr = today.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });

  // Include overdue and due-today tasks in the bulletin, as long as they are not completed.
  const tasksForBulletin = tasks.filter(task => 
    (task.status === 'due-today' || task.status === 'overdue') && !task.completed
  );

  // Group the relevant tasks by responsible person
  const groupedTasksForBulletin = tasksForBulletin.reduce((acc: GroupedTasks, task) => {
    const responsible = task.responsible || 'Não atribuído';
    if (!acc[responsible]) {
      acc[responsible] = [];
    }
    acc[responsible].push(task);
    return acc;
  }, {});
  
  const companyName = adminSettings?.companyName || 'Gerador de Atas';
  const companyLogo = adminSettings?.companyLogo;

  // Enhance the task list to show status and deadline
  const renderTaskList = (tasks: Task[]) => {
    return tasks.map(task => {
        const statusText = task.status === 'overdue' ? 'ATRASADO' : 'ENTREGA HOJE';
        const statusColor = task.status === 'overdue' ? '#c81e1e' : '#b45309';
        const statusBgColor = task.status === 'overdue' ? '#fde8e8' : '#fff7ed';

        return `
            <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 12px 15px; vertical-align: top;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #495057;">${task.description.replace(/\n/g, '<br>')}</p>
                    <p style="margin: 8px 0 0; font-size: 12px; color: #6c757d;">
                        <strong>Origem:</strong> ${task.sourceAta.title} (${task.sourceAta.empreendimento}) - ${task.sourceAta.date}
                    </p>
                </td>
                <td style="padding: 12px 15px; vertical-align: top; text-align: right; width: 120px;">
                    <span style="display: inline-block; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 12px; color: ${statusColor}; background-color: ${statusBgColor};">${statusText}</span>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #495057; font-weight: bold;">${task.deadline}</p>
                </td>
            </tr>
        `;
    }).join('');
  };

  const renderContent = () => {
    if (Object.keys(groupedTasksForBulletin).length === 0) {
      return `
        <tr>
          <td style="padding: 30px 15px; text-align: center; color: #495057;">
            <h2 style="margin: 0 0 10px; font-size: 18px;">Nenhuma Pendência para Hoje!</h2>
            <p style="margin: 0; font-size: 14px;">Todas as tarefas com prazo para hoje ou em atraso já foram concluídas. Tenha um ótimo dia!</p>
          </td>
        </tr>
      `;
    }
    
    return Object.entries(groupedTasksForBulletin).map(([responsible, tasks]) => `
      <tr>
        <td style="padding: 15px;">
          <h3 style="margin: 0 0 12px; padding-bottom: 8px; font-size: 16px; color: #0056b3; border-bottom: 2px solid #0056b3;">
            Responsável: ${responsible}
          </h3>
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; background-color: #ffffff; border-radius: 4px; border: 1px solid #dee2e6;">
            ${renderTaskList(tasks)}
          </table>
        </td>
      </tr>
    `).join('');
  };

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Boletim Diário de Prazos</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
        body { font-family: 'Roboto', sans-serif; }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa;">
      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8f9fa;">
        <tr>
          <td align="center">
            <table width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: 20px auto; background-color: #f0f3f7; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 25px 30px; background-color: #004a99; color: #ffffff; text-align: left;">
                  ${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="max-height: 40px; margin-bottom: 10px;">` : ''}
                  <h1 style="margin: 0; font-size: 24px;">Boletim Diário de Prazos</h1>
                  <p style="margin: 5px 0 0; font-size: 16px;">Pendências até ${todayStr}</p>
                </td>
              </tr>
              <!-- Content -->
              ${renderContent()}
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 30px; background-color: #e9ecef; text-align: center; font-size: 12px; color: #6c757d;">
                  <p style="margin: 0;">Este é um boletim automático gerado pelo sistema de Atas de Reunião.</p>
                  <p style="margin: 5px 0 0;">${companyName}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
