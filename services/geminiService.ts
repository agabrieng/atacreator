import { GoogleGenAI, Type } from "@google/genai";
import type { MeetingMinutes } from '../types';
import { GEMINI_MODEL } from '../constants';

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        cabecalho: {
            type: Type.OBJECT,
            properties: {
                titulo: { type: Type.STRING, description: "O título da ata, que deve ser o título da reunião fornecido." },
                dataHora: { type: Type.STRING, description: "A data e hora da reunião, no formato 'dd de MMMM de yyyy, HH:mm'." },
                plataforma: { type: Type.STRING, description: "A plataforma onde a reunião ocorreu, fixo como 'Microsoft Teams'." },
            },
            required: ["titulo", "dataHora", "plataforma"],
        },
        participantes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Uma lista com os nomes de todos os participantes identificados na transcrição.",
        },
        resumo: {
            type: Type.STRING,
            description: "Um resumo conciso e objetivo dos principais tópicos discutidos durante a reunião.",
        },
        decisoes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    texto: { type: Type.STRING, description: "A descrição da decisão tomada." },
                    por: { type: Type.STRING, description: "O nome da pessoa que comunicou ou validou a decisão." },
                },
                required: ["texto", "por"],
            },
            description: "Uma lista de todas as decisões importantes tomadas. Ex: 'Aprovado o novo design'."
        },
        acoes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    texto: { type: Type.STRING, description: "A descrição da ação ou tarefa a ser realizada." },
                    por: { type: Type.STRING, description: "O nome do responsável pela ação." },
                    prazo: { type: Type.STRING, description: "O prazo para a conclusão da ação, se mencionado. Caso contrário, null.", nullable: true },
                },
                required: ["texto", "por"],
            },
            description: "Uma lista de itens de ação com responsáveis e prazos. Ex: 'Preparar o ambiente de produção'."
        },
        encerramento: {
            type: Type.STRING,
            description: "Uma frase formal de encerramento da ata."
        }
    },
    required: ["cabecalho", "participantes", "resumo", "decisoes", "acoes", "encerramento"],
};


export const generateMinutesFromTranscript = async (vtt: string, title: string): Promise<MeetingMinutes> => {
    const API_KEY = process.env.API_KEY;

    if (!API_KEY) {
      throw new Error("API_KEY_MISSING");
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    const prompt = `
    Você é um assistente especialista em criar atas de reunião profissionais e bem estruturadas (no formato "Ata de Reunião").
    Sua tarefa é analisar a transcrição de uma reunião do Microsoft Teams, que pode ser de um arquivo VTT ou texto extraído de um DOCX, e gerar uma ata em formato JSON.

    **Título da Reunião:** ${title}
    **Data e Hora da Análise:** ${new Date().toLocaleString('pt-BR')}

    **Transcrição:**
    \`\`\`text
    ${vtt}
    \`\`\`

    **Instruções:**
    1.  **Identifique os Participantes:** Extraia os nomes de todas as pessoas que falaram na reunião. O formato comum é "Nome do Orador: Fala...".
    2.  **Crie um Resumo:** Escreva um parágrafo resumindo os principais pontos discutidos.
    3.  **Extraia as Decisões:** Identifique frases que indiquem uma decisão, como "fica decidido", "aprovado", "decidimos que".
    4.  **Extraia as Ações:** Identifique tarefas delegadas a alguém, procurando por palavras como "responsável", "fica com", "vou fazer", "precisamos", e prazos como "até dia X", "na próxima semana".
    5.  **Formate a Saída:** Retorne um objeto JSON que siga estritamente o schema fornecido. O campo 'titulo' do cabeçalho deve ser exatamente o título da reunião fornecido.

    Gere a ata seguindo o schema JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2,
            }
        });

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        
        return parsedJson as MeetingMinutes;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw error;
    }
};