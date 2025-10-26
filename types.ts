
export interface Decision {
  texto: string;
  por: string;
}

export interface ActionItem {
  texto: string;
  por: string;
  prazo: string | null;
}

export interface MeetingMinutes {
  cabecalho: {
    titulo: string;
    dataHora: string;
    plataforma: string;
  };
  participantes: string[];
  resumo: string;
  decisoes: Decision[];
  acoes: ActionItem[];
  encerramento: string;
}
