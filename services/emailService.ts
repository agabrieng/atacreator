import type { Task, GroupedTasks, AdminSettings } from '../types';

/**
 * Generates a professional HTML string for the daily deadline bulletin email.
 * This version uses robust inline styling and legacy attributes for maximum email client compatibility.
 * @param tasks - A list of all tasks. The function will filter for tasks due today.
 * @param adminSettings - The current company settings for branding.
 * @returns An HTML string.
 */
export const generateDailyBulletinHtml = (
  tasks: Task[], 
  adminSettings: AdminSettings | null,
  empreendimentoFilter?: string,
  responsavelFilter?: string
): string => {
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
  
  // Use a very web-safe font stack for maximum compatibility.
  const fontFamily = "font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;";

  // Helper for styled text.
  const createStyledSpan = (text: string, styles: string) => `<span style="${fontFamily} ${styles}">${text}</span>`;

  const subtitleParts: string[] = [];
  if (empreendimentoFilter && empreendimentoFilter !== 'all') {
      // Let strong tag inherit color from parent for better compatibility
      subtitleParts.push(`<strong>Empreendimento:</strong> ${empreendimentoFilter}`);
  }
  if (responsavelFilter && responsavelFilter !== 'all') {
      subtitleParts.push(`<strong>Responsável:</strong> ${responsavelFilter}`);
  }
  
  const subtitleText = subtitleParts.length > 0 
      ? `Filtros: ${subtitleParts.join(' | ')}` 
      : `Pendências até ${todayStr}`;

  const hasTasks = Object.keys(groupedTasksForBulletin).length > 0;
  // Use a table with bgcolor for the yellow highlight to ensure Outlook compatibility.
  const instructionalText = hasTasks
    ? `<p style="margin: 12px 0 0; font-size: 13px; line-height: 1.5;">
        <table cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="left" bgcolor="#FFFF00" style="background-color: #FFFF00; padding: 4px 8px; border-radius: 3px;">
              <span style="${fontFamily} font-size: 13px; color: #000000;">&#8505; Clique no seu nome abaixo para expandir e ver suas pendências.</span>
            </td>
          </tr>
        </table>
      </p>`
    : '';

  // Enhance the task list to show status and deadline
  const renderTaskList = (tasks: Task[]) => {
    return tasks.map(task => {
        const statusTextSimple = task.status === 'overdue' ? 'ATRASADO' : 'ENTREGA HOJE';
        const statusText = statusTextSimple.replace(' ', '<br>');
        const statusColor = task.status === 'overdue' ? '#c81e1e' : '#b45309';
        const statusBgColor = task.status === 'overdue' ? '#fde8e8' : '#fff7ed';

        // NEW: Prepend deadline to the description
        const deadlinePrefix = task.deadline ? createStyledSpan(`${task.deadline} - `, 'font-weight: bold; color: #343a40;') : '';
        const descriptionText = createStyledSpan(task.description.replace(/\n/g, '<br>'), 'color: #495057;');
        const descriptionHtml = `${deadlinePrefix}${descriptionText}`;

        const sourceHtml = `${createStyledSpan('Origem:', 'color: #6c757d; font-weight: bold;')} ${createStyledSpan(`${task.sourceAta.title} (${task.sourceAta.empreendimento}) - ${task.sourceAta.date}`, 'color: #6c757d;')}`;
        
        // NEW: Simplified deadline content, only showing the status badge.
        const deadlineContentHtml = `
          <table align="right" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 0 auto;">
            <tr>
              <td align="center" valign="middle" bgcolor="${statusBgColor.replace('#', '')}" style="background-color: ${statusBgColor}; padding: 5px 10px; border-radius: 9px; text-align: center;">
                <span style="${fontFamily} font-size: 10px; font-weight: bold; color: ${statusColor}; line-height: 1.2; text-transform: uppercase; white-space: nowrap;">${statusText}</span>
              </td>
            </tr>
          </table>
        `;

        return `
            <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 12px 15px; vertical-align: top;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6;">${descriptionHtml}</p>
                    <p style="margin: 8px 0 0; font-size: 12px;">${sourceHtml}</p>
                </td>
                <td style="padding: 12px 15px; vertical-align: middle; width: 120px;">
                    ${deadlineContentHtml}
                </td>
            </tr>
        `;
    }).join('');
  };

  const renderContent = () => {
    if (Object.keys(groupedTasksForBulletin).length === 0) {
      return `
        <tr>
          <td style="padding: 30px 15px; text-align: center;">
            <h2 style="margin: 0 0 10px; font-size: 18px;">${createStyledSpan('Nenhuma Pendência Encontrada!', 'color: #495057;')}</h2>
            <p style="margin: 0; font-size: 14px;">${createStyledSpan('Não há tarefas pendentes com os filtros selecionados. Tenha um ótimo dia!', 'color: #495057;')}</p>
          </td>
        </tr>
      `;
    }
    
    return Object.entries(groupedTasksForBulletin).map(([responsible, tasks]) => {
        const taskCountText = `${tasks.length} ${tasks.length > 1 ? 'pendências' : 'pendência'}`;
        const summaryTitle = createStyledSpan(`Responsável: ${responsible}`, 'font-weight: bold; color: #0056b3;');
        const summaryCount = createStyledSpan(`(${taskCountText})`, 'color: #495057; font-weight: normal;');
        const collapseIcon = createStyledSpan('&#9660;', 'font-size: 12px; vertical-align: middle; margin-right: 8px; color: #6c757d;');

        // For unsupported email clients, <details> will render expanded by default, which is the desired graceful degradation.
        return `
            <tr>
                <td style="padding: 10px 15px;">
                <details>
                    <summary style="padding: 10px; border-bottom: 2px solid #dee2e6; cursor: pointer; display: block; list-style: none;">
                        <span style="font-size: 16px; ${fontFamily}">
                            ${collapseIcon}
                            ${summaryTitle}
                            ${summaryCount}
                        </span>
                    </summary>
                    <div style="padding-top: 12px;">
                        <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; background-color: #ffffff; border-radius: 4px; border: 1px solid #dee2e6;">
                            ${renderTaskList(tasks)}
                        </table>
                    </div>
                </details>
                </td>
            </tr>
        `;
    }).join('');
  };
  
  const footerText1 = createStyledSpan('Este é um boletim automático gerado pelo sistema de Atas de Reunião.', 'color: #6c757d;');
  const footerText2 = createStyledSpan(companyName, 'color: #6c757d;');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Boletim Diário de Prazos</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa; ${fontFamily}">
      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8f9fa;">
        <tr>
          <td align="center">
            <table width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr bgcolor="#e9ecef" style="background-color: #e9ecef;">
                <td style="padding: 25px 30px; text-align: left; color: #495057;">
                  ${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="max-height: 40px; margin-bottom: 10px;">` : ''}
                  <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #212529; ${fontFamily}">Boletim Diário de Prazos</h1>
                  <p style="margin: 5px 0 0; font-size: 14px; line-height: 1.5; color: #495057; ${fontFamily}">${subtitleText}</p>
                  ${instructionalText}
                </td>
              </tr>
              <!-- Content -->
              ${renderContent()}
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 30px; background-color: #e9ecef; text-align: center; font-size: 12px;">
                  <p style="margin: 0;">${footerText1}</p>
                  <p style="margin: 5px 0 0;">${footerText2}</p>
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