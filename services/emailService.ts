import type { Task, GroupedTasks, AdminSettings } from '../types';

/**
 * Generates a professional HTML string for the daily deadline bulletin email.
 * This version uses robust inline styling and legacy attributes for maximum email client compatibility.
 * @param tasksForBulletin - A pre-filtered list of tasks to include in the bulletin.
 * @param adminSettings - The current company settings for branding.
 * @returns An HTML string.
 */
export const generateDailyBulletinHtml = (
  tasksForBulletin: Task[], 
  adminSettings: AdminSettings | null,
  empreendimentoFilter?: string,
  assuntoFilter?: string,
  responsavelFilter?: string,
  periodDescription?: string
): string => {
  const today = new Date();
  const todayStr = today.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });

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

  const mainFilterParts: string[] = [];
  if (empreendimentoFilter && empreendimentoFilter !== 'all') {
    mainFilterParts.push(`<strong>Empreendimento:</strong> ${empreendimentoFilter}`);
  }
  if (responsavelFilter && responsavelFilter !== 'all') {
    mainFilterParts.push(`<strong>Responsável:</strong> ${responsavelFilter}`);
  }

  const subtitleLines: string[] = [];
  if (mainFilterParts.length > 0) {
    subtitleLines.push(`Filtros: ${mainFilterParts.join(' | ')}`);
  }
  if (assuntoFilter && assuntoFilter !== 'all') {
    subtitleLines.push(`<strong>Assunto:</strong> ${assuntoFilter}`);
  }
  
  const subtitleText = subtitleLines.length > 0 
    ? subtitleLines.join('<br>') 
    : (periodDescription || `Pendências até ${todayStr}`);

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
        let statusTextSimple = '';
        let statusColor = '';
        let statusBgColor = '';

        switch (task.status) {
            case 'overdue':
                statusTextSimple = 'ATRASADO';
                statusColor = '#c81e1e';
                statusBgColor = '#fde8e8';
                break;
            case 'due-today':
                statusTextSimple = 'ENTREGA HOJE';
                statusColor = '#b45309';
                statusBgColor = '#fff7ed';
                break;
            case 'upcoming':
                statusTextSimple = 'TAREFA FUTURA';
                statusColor = '#374151'; // gray-700
                statusBgColor = '#f3f4f6'; // gray-100
                break;
            default:
                // For 'no-deadline' or 'completed', we don't show a status badge
                break;
        }

        const deadlinePrefix = task.deadline ? createStyledSpan(`${task.deadline} - `, 'font-weight: bold; color: #343a40;') : '';
        const descriptionText = createStyledSpan(task.description.replace(/\n/g, '<br>'), 'color: #495057;');
        const descriptionHtml = `${deadlinePrefix}${descriptionText}`;

        const sourceHtml = `${createStyledSpan('Origem:', 'color: #6c757d; font-weight: bold;')} ${createStyledSpan(`${task.sourceAta.title} (${task.sourceAta.empreendimento}) - ${task.sourceAta.date}`, 'color: #6c757d;')}`;
        
        let deadlineContentHtml = '';
        if (statusTextSimple) {
            const statusText = statusTextSimple.replace(' ', '<br>');
            deadlineContentHtml = `
              <table align="right" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 0 auto;">
                <tr>
                  <td align="center" valign="middle" bgcolor="${statusBgColor.replace('#', '')}" style="background-color: ${statusBgColor}; padding: 5px 10px; border-radius: 9px; text-align: center;">
                    <span style="${fontFamily} font-size: 10px; font-weight: bold; color: ${statusColor}; line-height: 1.2; text-transform: uppercase; white-space: nowrap;">${statusText}</span>
                  </td>
                </tr>
              </table>
            `;
        }

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
      <title>Boletim de Acompanhamento de Prazos</title>
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
                  <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #212529; ${fontFamily}">Boletim de Acompanhamento de Prazos</h1>
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


/**
 * Generates a simplified, well-structured HTML string for direct pasting into Microsoft Teams.
 * This version uses divs as "cards" and proper list formatting to ensure a clean layout.
 * @param tasksForBulletin - A pre-filtered list of tasks.
 * @param adminSettings - The current company settings for branding.
 * @param empreendimentoFilter - Optional filter for empreendimento.
 * @param responsavelFilter - Optional filter for responsavel.
 * @returns An HTML string formatted for Teams.
 */
export const generateTeamsHtml = (
  tasksForBulletin: Task[],
  adminSettings: AdminSettings | null,
  empreendimentoFilter?: string,
  assuntoFilter?: string,
  responsavelFilter?: string,
  periodDescription?: string
): string => {
  const today = new Date();
  const todayStr = today.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });

  const groupedTasks = tasksForBulletin.reduce((acc: GroupedTasks, task) => {
    const responsible = task.responsible || 'Não atribuído';
    if (!acc[responsible]) {
      acc[responsible] = [];
    }
    acc[responsible].push(task);
    return acc;
  }, {});
  
  const mainFilterParts: string[] = [];
  if (empreendimentoFilter && empreendimentoFilter !== 'all') {
    mainFilterParts.push(`<strong>Empreendimento:</strong> ${empreendimentoFilter}`);
  }
  if (responsavelFilter && responsavelFilter !== 'all') {
    mainFilterParts.push(`<strong>Responsável:</strong> ${responsavelFilter}`);
  }

  const subtitleLines: string[] = [];
  if (mainFilterParts.length > 0) {
    subtitleLines.push(`Filtros: ${mainFilterParts.join(' | ')}`);
  }
  if (assuntoFilter && assuntoFilter !== 'all') {
    subtitleLines.push(`<strong>Assunto:</strong> ${assuntoFilter}`);
  }

  const subtitleHtml = subtitleLines.length > 0
    ? `<p>${subtitleLines.join('</p><p>')}</p>`
    : `<p>${periodDescription || `Pendências até ${todayStr}`}</p>`;
  
  let html = `<div><p><strong>Boletim de Acompanhamento de Prazos</strong></p>${subtitleHtml}</div>`;

  if (Object.keys(groupedTasks).length === 0) {
    html += '<hr><p>Nenhuma pendência encontrada com os filtros selecionados.</p>';
    return html;
  }

  let isFirstResponsible = true;
  Object.entries(groupedTasks).forEach(([responsible, tasksForResponsible]) => {
    if (!isFirstResponsible) {
        html += '<hr>';
    }
    isFirstResponsible = false;

    const taskCountText = `${tasksForResponsible.length} ${tasksForResponsible.length > 1 ? 'pendências' : 'pendência'}`;
    html += `<p><strong>Responsável: ${responsible}</strong> (${taskCountText})</p>`;
    
    tasksForResponsible.forEach(task => {
        let statusText = '';
        if (task.status === 'overdue') {
            statusText = ' 🔴 (ATRASADO)';
        } else if (task.status === 'due-today') {
            statusText = ' 🟠 (ENTREGA HOJE)';
        } else if (task.status === 'upcoming' && task.deadlineDate) {
            statusText = ' 🔵 (TAREFA FUTURA)';
        }
        
        const descriptionLines = task.description.split('\n').filter(line => line.trim() !== '');
        const taskTitle = descriptionLines.shift() || '';
        
        let descriptionDetails = '';
        if (descriptionLines.length > 0) {
            const listItems = descriptionLines.map(line => {
                const cleanedLine = line.trim().replace(/^[-*o]\s*/, '');
                return `<li>${cleanedLine}</li>`;
            }).join('');
            descriptionDetails = `<ul style="margin-top: 5px; margin-bottom: 5px; padding-left: 20px;">${listItems}</ul>`;
        }

        html += `
            <div style="border: 1px solid #E1E1E1; border-radius: 6px; padding: 12px; margin-top: 8px; margin-bottom: 12px;">
                <p style="margin: 0 0 5px 0;">
                    <strong>${task.deadline}</strong>${statusText} - ${taskTitle}
                </p>
                ${descriptionDetails}
                <p style="font-size: 90%; color: #606060; margin: 8px 0 0 0;">
                    <em>Origem: ${task.sourceAta.empreendimento} / ${task.sourceAta.title} (${task.sourceAta.date})</em>
                </p>
            </div>
        `;
    });
  });

  return html;
};

/**
 * Generates a Microsoft Teams Adaptive Card JSON payload for webhooks.
 * @param tasksForBulletin - A pre-filtered list of tasks.
 * @param adminSettings - The current company settings for branding.
 * @param empreendimentoFilter - Optional filter for empreendimento.
 * @param responsavelFilter - Optional filter for responsavel.
 * @returns An object representing the Adaptive Card payload.
 */
export const generateTeamsAdaptiveCard = (
  tasksForBulletin: Task[],
  adminSettings: AdminSettings | null,
  empreendimentoFilter?: string,
  assuntoFilter?: string,
  responsavelFilter?: string,
  periodDescription?: string
): object => {
  const today = new Date();
  const todayStr = today.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });

  const groupedTasks = tasksForBulletin.reduce((acc: GroupedTasks, task) => {
    const responsible = task.responsible || 'Não atribuído';
    if (!acc[responsible]) acc[responsible] = [];
    acc[responsible].push(task);
    return acc;
  }, {});

  const cardBody: any[] = [
    {
      type: 'TextBlock',
      text: 'Boletim de Acompanhamento de Prazos',
      size: 'large',
      weight: 'bolder',
      wrap: true,
    },
  ];

  const mainFilterParts: string[] = [];
  if (empreendimentoFilter && empreendimentoFilter !== 'all') {
    mainFilterParts.push(`**Empreendimento:** ${empreendimentoFilter}`);
  }
  if (responsavelFilter && responsavelFilter !== 'all') {
    mainFilterParts.push(`**Responsável:** ${responsavelFilter}`);
  }

  const hasMainFilters = mainFilterParts.length > 0;
  if (hasMainFilters) {
    cardBody.push({
      type: 'TextBlock',
      text: `Filtros: ${mainFilterParts.join(' | ')}`,
      wrap: true,
      isSubtle: true,
    });
  }

  const hasAssuntoFilter = assuntoFilter && assuntoFilter !== 'all';
  if (hasAssuntoFilter) {
    cardBody.push({
      type: 'TextBlock',
      text: `**Assunto:** ${assuntoFilter}`,
      wrap: true,
      isSubtle: true,
      spacing: hasMainFilters ? 'None' : 'Default',
    });
  }

  if (!hasMainFilters && !hasAssuntoFilter) {
    cardBody.push({
      type: 'TextBlock',
      text: periodDescription || `Pendências até ${todayStr}`,
      isSubtle: true,
      wrap: true,
    });
  }
  
  if (Object.keys(groupedTasks).length === 0) {
    cardBody.push({
      type: 'TextBlock',
      text: 'Nenhuma pendência encontrada com os filtros selecionados.',
      wrap: true,
      spacing: 'large',
    });
  } else {
    Object.entries(groupedTasks).forEach(([responsible, tasksForResponsible], index) => {
      cardBody.push({
        type: 'Container',
        separator: true,
        spacing: index === 0 ? 'large' : 'default',
        style: 'warning', // Use 'warning' for yellow background
        items: [
          {
            type: 'TextBlock',
            text: `**${responsible}** (${tasksForResponsible.length} ${tasksForResponsible.length > 1 ? 'pendências' : 'pendência'})`,
            wrap: true,
            size: 'medium',
            weight: 'bolder',
          }
        ]
      });

      tasksForResponsible.forEach(task => {
        let statusFact = [];
        if (task.status === 'overdue') {
            statusFact.push({ title: 'Status:', value: `**(ATRASADO) 🔴**` });
        } else if (task.status === 'due-today') {
            statusFact.push({ title: 'Status:', value: `**(ENTREGA HOJE) 🟠**` });
        } else if (task.status === 'upcoming' && task.deadlineDate) {
            statusFact.push({ title: 'Status:', value: `**(TAREFA FUTURA) 🔵**` });
        }
        
        const descriptionLines = task.description.split('\n').filter(line => line.trim() !== '');
        const taskTitle = descriptionLines.shift() || 'Tarefa sem descrição';

        let descriptionDetails = '';
        if (descriptionLines.length > 0) {
            descriptionDetails = '- ' + descriptionLines.map(line => line.trim().replace(/^[-*o]\s*/, '')).join('\n- ');
        }

        cardBody.push({
          type: 'Container',
          spacing: 'small',
          separator: true,
          items: [
            {
              type: 'FactSet',
              facts: [
                { title: 'Prazo:', value: `${task.deadline}` },
                ...statusFact,
                { title: 'Tarefa:', value: taskTitle },
                ...(descriptionDetails ? [{ title: 'Detalhes:', value: descriptionDetails }] : []),
                { title: 'Origem:', value: `${task.sourceAta.empreendimento} / ${task.sourceAta.title} (${task.sourceAta.date})` }
              ]
            }
          ]
        });
      });
    });
  }

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: cardBody,
        },
      },
    ],
  };
};