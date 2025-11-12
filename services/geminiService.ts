import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_MODEL } from '../constants';
import type { AtaData, Projeto, OnePageReportData } from '../types';

interface GeminiParticipant {
    nome: string;
    empresa: string | null;
}

// Define this locally to avoid conflict with the app's PautaItem
interface GeminiPautaItem {
    item: string;
    descricao: string;
    responsaveis: string[];
    prazo: string | null;
}

export interface GeminiOutput {
  data: string;
  horario: string;
  pauta: GeminiPautaItem[];
  observacoes: string;
  participantes: GeminiParticipant[];
}

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        data: { type: Type.STRING, description: "A data da reunião no formato 'DD/MM/YYYY', extraída da transcrição ou inferida a partir da data atual." },
        horario: { type: Type.STRING, description: "A hora de início da reunião no formato 'HH:mm', extraída da transcrição ou inferida." },
        participantes: {
            type: Type.ARRAY,
            description: "Lista de todos os participantes únicos identificados na transcrição pelos nomes que aparecem antes dos dois-pontos (ex: 'Nome Sobrenome:').",
            items: {
                type: Type.OBJECT,
                properties: {
                    nome: { type: Type.STRING, description: "O nome completo do participante, como 'Ana Silva'." },
                    empresa: { type: Type.STRING, nullable: true, description: "A empresa do participante, se puder ser inferida da transcrição. Caso contrário, nulo." },
                },
                required: ["nome"],
            }
        },
        pauta: {
            type: Type.ARRAY,
            description: "A lista de itens e tópicos discutidos na reunião, seguindo a ordem da transcrição.",
            items: {
                type: Type.OBJECT,
                properties: {
                    item: { type: Type.STRING, description: "Um número sequencial para o item da pauta. Ex: '1.', '2.'" },
                    descricao: { type: Type.STRING, description: "Um resumo detalhado da discussão sobre o tópico, incluindo pontos importantes e decisões tomadas. Use quebras de linha para separar sub-tópicos e formatação de lista (usando 'o' ou '-') se necessário. Ex: 'Detalhamento do Cronograma:\\no A equipe solicitou detalhamento.\\no Rodrigo orientou sobre a programação.'" },
                    responsaveis: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista dos nomes dos responsáveis por ações ou tarefas relacionadas ao tópico." },
                    prazo: { type: Type.STRING, nullable: true, description: "O prazo para a conclusão das ações, se houver. Ex: 'Próxima semana', '31/07/2025'." },
                },
                required: ["item", "descricao", "responsaveis"]
            }
        },
        observacoes: { type: Type.STRING, description: "Um resumo geral conciso ou observações finais sobre a reunião. Destaque os pontos mais importantes de forma objetiva." },
    },
    required: ["data", "horario", "pauta", "observacoes", "participantes"],
};


export const generateAtaData = async (vtt: string, title: string): Promise<GeminiOutput> => {
    // FIX: Use process.env.API_KEY as per guidelines and to resolve TypeScript errors.
    const API_KEY = process.env.API_KEY;

    if (!API_KEY) {
      throw new Error("API_KEY_MISSING");
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    const prompt = `
    Você é um assistente especialista em criar atas de reunião profissionais no formato de documento estruturado.
    Sua tarefa é analisar a transcrição de uma reunião e extrair as informações-chave para preencher um JSON estruturado.

    **Título da Reunião Fornecido pelo Usuário:** ${title}
    **Data e Hora da Análise:** ${new Date().toLocaleString('pt-BR')}

    **Transcrição:**
    \`\`\`text
    ${vtt}
    \`\`\`

    **Instruções Detalhadas:**
    1.  **Participantes:** Analise a transcrição e extraia uma lista de todos os nomes únicos das pessoas que aparecem antes dos dois-pontos (ex: "Ana Silva:"). Para cada nome único, crie um objeto no array 'participantes'. Se a empresa for mencionada explicitamente na conversa, adicione-a, caso contrário, deixe o campo 'empresa' como nulo.
    2.  **Data e Horário:** Extraia a data e o horário de início da reunião da transcrição. Se não estiver explícito, infira a partir do contexto ou use a data atual. Formate como 'DD/MM/YYYY' e 'HH:mm'.
    3.  **Observações:** Crie um parágrafo de resumo geral (observações) que capture a essência da reunião, os principais problemas e as próximas etapas.
    4.  **Pauta (Itens de Discussão):**
        *   Divida a transcrição em tópicos de discussão distintos e sequenciais (ex: "Detalhamento do Cronograma", "Problemas com o Transformador", "Andamento das Atividades").
        *   Para cada tópico, crie um objeto no array 'pauta'.
        *   **item:** Atribua um número sequencial (Ex: "1.", "2.", "3.").
        *   **descricao:** Descreva detalhadamente o que foi discutido no tópico. Se houver sub-pontos ou uma lista de itens, formate-os usando 'o' ou '-' no início da linha para criar uma lista dentro da string de descrição.
        *   **responsaveis:** Liste os nomes de todas as pessoas a quem tarefas foram atribuídas nesse tópico. Se ninguém foi mencionado, retorne um array vazio.
        *   **prazo:** Se um prazo for mencionado para as tarefas, registre-o. Caso contrário, deixe como nulo.

    Seu objetivo é preencher o schema JSON da forma mais completa e precisa possível com base **exclusivamente** na transcrição fornecida.
    `;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.1,
            }
        });

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        
        // Ensure participants is always an array
        if (!parsedJson.participantes) {
            parsedJson.participantes = [];
        }
        
        return parsedJson as GeminiOutput;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw error;
    }
};


const onePageReportSchema = {
    type: Type.OBJECT,
    properties: {
        periodo: { type: Type.STRING, description: "O período de tempo que o relatório cobre. Ex: 'Semana de 15/07/2024 a 21/07/2024'."},
        empreendimento: { type: Type.STRING, nullable: true, description: "O nome do empreendimento para o qual o relatório foi gerado, se aplicável. Ex: 'Obra76 {SECMO} - Ampliação 'C' - Campo Mourão/PR'."},
        sumarioExecutivo: { type: Type.STRING, description: "Um parágrafo conciso (3-4 frases) que resume os pontos mais críticos do período: principais avanços, bloqueios mais importantes e o sentimento geral (positivo, negativo, neutro)."},
        principaisDecisoes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista bullet-point das decisões mais impactantes tomadas nas reuniões."},
        acoesCriticas: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    acao: { type: Type.STRING, description: "Descrição da ação crítica ou tarefa delegada."},
                    responsavel: { type: Type.STRING, description: "Nome do principal responsável pela ação."},
                    prazo: { type: Type.STRING, description: "Prazo da ação."},
                },
                required: ["acao", "responsavel", "prazo"],
            },
            description: "Lista das tarefas mais importantes que foram criadas ou que tiveram atualizações relevantes no período."
        },
        projetosConcluidos: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    nome: { type: Type.STRING, description: "Nome do projeto concluído."},
                    dataEntrega: { type: Type.STRING, description: "Data em que o projeto foi concluído."},
                },
                required: ["nome", "dataEntrega"],
            },
            description: "Lista de projetos que foram marcados como 'concluído' no período."
        },
        projetosEmRisco: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    nome: { type: Type.STRING, description: "Nome do projeto em risco ou atrasado."},
                    motivo: { type: Type.STRING, description: "Breve explicação do motivo do risco (atraso, bloqueio, etc.)."},
                    prazo: { type: Type.STRING, description: "Prazo original do projeto."},
                },
                required: ["nome", "motivo", "prazo"],
            },
            description: "Lista dos projetos mais críticos que estão atrasados ou em risco de atrasar."
        },
        analiseRiscos: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista bullet-point de novos riscos, impedimentos ou problemas identificados nas reuniões."},
        recomendacoes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista bullet-point de 2 a 3 ações recomendadas para a gestão, com base na análise dos dados. Ex: 'Focar no desbloqueio do Projeto X', 'Realinhar prazos da equipe Y'."},
    },
    required: ["periodo", "sumarioExecutivo", "principaisDecisoes", "acoesCriticas", "projetosConcluidos", "projetosEmRisco", "analiseRiscos", "recomendacoes"],
};


export const generateOnePageReport = async (atas: AtaData[], projetos: Projeto[], periodo: string, empreendimento: string | null): Promise<OnePageReportData> => {
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) throw new Error("API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // Sanitize data for the prompt
    const simplifiedAtas = atas.map(ata => ({
        data: ata.data,
        titulo: ata.titulo,
        assunto: ata.assunto,
        observacoes: ata.observacoes,
        pauta: ata.pauta.map(p => ({
            descricao: p.descricao,
            responsaveis: p.responsaveis.map(r => r.responsavel).join(', '),
            prazo: p.responsaveis[0]?.prazo
        }))
    }));

    const simplifiedProjetos = projetos.map(p => ({
        nome: p.name,
        empreendimento: p.empreendimento,
        status: p.status,
        prazo: p.deadline,
        dataEntrega: p.dataEntrega
    }));

    const prompt = `
    **PERSONA:** Você é um Gerente de Projetos Sênior (PMP), especialista em análise de dados e comunicação executiva, seguindo as melhores práticas do PMBOK.

    **TAREFA:** Sua missão é analisar um conjunto de dados brutos sobre reuniões (atas) e o andamento de projetos de um determinado período. Com base nesses dados, você deve gerar um relatório gerencial estratégico, objetivo e conciso, conhecido como "One Page Report", destinado à alta gestão. O relatório deve ser gerado em português do Brasil.

    **PERÍODO DE ANÁLISE:** ${periodo}
    **EMPREENDIMENTO FOCO (se aplicável):** ${empreendimento || 'Todos'}

    **DADOS BRUTOS:**
    ---
    **1. Atas de Reunião do Período:**
    \`\`\`json
    ${JSON.stringify(simplifiedAtas, null, 2)}
    \`\`\`
    ---
    **2. Status dos Projetos Relevantes para o Período:**
    (Inclui projetos com prazo ou conclusão no período)
    \`\`\`json
    ${JSON.stringify(simplifiedProjetos, null, 2)}
    \`\`\`
    ---

    **INSTRUÇÕES DETALHADAS PARA CADA SEÇÃO DO RELATÓRIO:**

    1.  **periodo:** Preencha com o período de análise fornecido. Exemplo: 'Semana de 10/11/2025 a 16/11/2025'.
    2.  **empreendimento:** Se um 'EMPREENDIMENTO FOCO' for fornecido, preencha este campo com o nome dele. Exemplo: 'Obra76 {SECMO} - Ampliação 'C' - Campo Mourão/PR'. Caso contrário, deixe nulo.
    3.  **sumarioExecutivo:** Escreva um parágrafo curto (3-4 frases) que capture a essência do período. Destaque o principal avanço, o maior desafio/bloqueio e o sentimento geral (progresso positivo, desafios crescentes, etc.). Seja direto e focado no que um C-level precisa saber.
    4.  **principaisDecisoes:** Identifique e liste as 3-5 decisões mais importantes e estratégicas tomadas nas reuniões. Evite decisões operacionais triviais.
    5.  **acoesCriticas:** Extraia das atas as 3-5 ações mais críticas delegadas. Foque naquelas que são cruciais para o destravamento de projetos ou para os próximos passos importantes.
    6.  **projetosConcluidos:** Liste os projetos cujo status foi alterado para 'concluído' no período.
    7.  **projetosEmRisco:** Identifique os projetos com status 'overdue' (atrasado) ou 'in-progress' mas cujo prazo está muito próximo e parece haver problemas mencionados nas atas. Forneça um motivo conciso para o risco.
    8.  **analiseRiscos:** Com base nas 'observacoes' das atas e nos atrasos dos projetos, sintetize os principais riscos e impedimentos que surgiram ou se agravaram no período.
    9.  **recomendacoes:** Com base em toda a sua análise, forneça 2-3 recomendações acionáveis para a gestão. O que eles deveriam fazer na próxima semana para mitigar riscos e garantir o progresso?

    **FORMATO DE SAÍDA:** Preencha o schema JSON fornecido com a sua análise. Seja sucinto, profissional e use linguagem de negócios.
    `;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: onePageReportSchema as any, // Cast to any to avoid schema deep type issues
                temperature: 0.2,
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as OnePageReportData;

    } catch (error) {
        console.error("Error calling Gemini API for One Page Report:", error);
        throw error;
    }
};