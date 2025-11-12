export interface DocumentSettings {
  title: string;
  docNumber: string;
  revision: string;
  propertyInfo: string;
}

export interface AdminSettings {
  companyName: string;
  companyLogo: string | null; // base64 string
  documentSettings: {
    ata: DocumentSettings;
    onepage: DocumentSettings;
  };
}

export interface Participant {
  id: string; // for React keys
  empresa: string;
  nome: string;
  email: string;
  status: 'P' | 'A' | 'PA' | 'AJ';
}

export interface ResponsavelPrazo {
    id: string; // for React keys
    responsavel: string;
    prazo: string | null;
    completed?: boolean;
    completionDate?: string | null;
}

export interface PautaItem {
  item: string; // e.g., "1."
  descricao: string;
  responsaveis: ResponsavelPrazo[];
  prazo?: string | null; // Kept for migrating old data from gemini/firestore
}

// This represents the complete data for the final document
export interface AtaData {
  id?: string; // Firestore document ID
  // Header part 1
  logoUrl: string | null;
  empreendimento: string;
  area: string;
  titulo: string; // "ATA DE REUNIÃO" from user input

  // Header part 2
  contrato: string;
  assunto: string;
  local: string;

  // Generated part
  horario: string;
  data: string;
  
  // From settings
  numeroDocumento: string;
  revisao: string;

  // Main Content
  participantes: Participant[];
  observacoes: string;
  pauta: PautaItem[];

  // Footer
  informacaoPropriedade: string;
}

export interface Empreendimento {
  id: string;
  name: string;
  contrato: string;
  local: string; // "Cidade - UF"
  gestor?: string;
  liderTecnico?: string;
  planejador?: string;
  engenheiroResidente?: string;
}

// --- Types for Deadline Panel ---

export type TaskStatus = 'overdue' | 'due-today' | 'upcoming' | 'completed' | 'no-deadline';

export interface Task {
  id: string;
  description: string;
  responsible: string;
  deadline: string; // The original DD/MM/YYYY string
  deadlineDate: Date | null;
  status: TaskStatus;
  sourceAta: {
    id: string;
    title: string;
    assunto: string;
    date: string;
    empreendimento: string;
  };
  originalAta: AtaData;
  // New fields for completion tracking
  completed: boolean;
  completionDate: string | null; // Stored as YYYY-MM-DD
  // For easier updates
  pautaItemIndex: number;
  responsavelId: string;
}

export type GroupedTasks = {
    [responsible: string]: Task[];
};

// --- Type for Webhooks ---
export interface Webhook {
  id: string;
  name: string;
  url: string;
}

// --- Types for Project Control ---
export type ProjectStatus = 'pending' | 'in-progress' | 'completed' | 'overdue';

export type Disciplina = 'Civil' | 'Eletromecânico' | 'Elétrica' | 'Telecom' | 'Arquitetônico' | 'Geral' | 'Outra';

export const disciplinas: Disciplina[] = ['Civil', 'Eletromecânico', 'Elétrica', 'Telecom', 'Arquitetônico', 'Geral', 'Outra'];

export interface Projetista {
  id: string;
  name: string;
  logo: string | null; // base64 string
}

export interface Projeto {
  id: string;
  projetistaId: string;
  name: string;
  description: string;
  deadline: string; // Stored as YYYY-MM-DD
  status: ProjectStatus;
  // New fields
  contrato: string;
  empreendimento: string;
  disciplina: Disciplina;
  taxonomia: string;
  dataEntrega?: string | null; // Stored as YYYY-MM-DD
}

// --- Types for IBGE API ---
export interface IbgeState {
  id: number;
  sigla: string;
  nome: string;
}

export interface IbgeCity {
  id: number;
  nome: string;
}

// --- Type for One Page Report ---
export interface OnePageReportData {
  periodo: string;
  empreendimento?: string;
  sumarioExecutivo: string;
  principaisDecisoes: string[];
  acoesCriticas: { acao: string; responsavel: string; prazo: string }[];
  projetosConcluidos: { nome: string; dataEntrega: string }[];
  projetosEmRisco: { nome:string; motivo: string; prazo: string }[];
  analiseRiscos: string[];
  recomendacoes: string[];
}