export interface AdminSettings {
  companyName: string;
  companyLogo: string | null; // base64 string
  docNumber: string;
  revision: string;
  propertyInfo: string;
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
}