export type PipelineStage = "Novo" | "Contato" | "Diagnóstico" | "Proposta" | "Fechado" | "Perdido";
export type LeadPriority = "Alta" | "Media" | "Baixa";
export type ContactStatus = "Pendente" | "Mensagem enviada" | "Respondeu";
export type LeadSource = "Instagram" | "LinkedIn" | "Google Maps" | "Google Meu Negócio";
export type IcpProfile = string;
/** Funil comercial recomendado: "A" (empresa com perfil GMN) ou "B" (sem perfil GMN). */
export type QualificationFunnel = "A" | "B";

export type LeadFormValues = {
  company: string;
  niche: string;
  region: string;
  monthlyBudget: string;
  contact: string;
  trigger: string;
  source?: LeadSource;
  icp?: IcpProfile;
};

export type LeadRecord = LeadFormValues & {
  id: string;
  userId: string;
  stage: PipelineStage;
  score: number;
  priority: LeadPriority;
  message: string;
  contactStatus: ContactStatus;
  createdAt: string;
  followUpIntervalDays?: number;
  followUpStep?: number;
  nextFollowUpAt?: string | null;
  lastContactAt?: string | null;
  proposalEnteredAt?: string | null;
  proposalFollowUpStep?: number;
  reactivationSentAt?: string | null;
  // Qualificação de fit comercial (Tarefa B). Opcionais: só populados quando o
  // connector fornece os sinais. Não substituem `score` (popularidade).
  qualificationScore?: number;
  funnel?: QualificationFunnel;
  contactable?: boolean;
};
