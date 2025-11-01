import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_MODEL } from '../constants';

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