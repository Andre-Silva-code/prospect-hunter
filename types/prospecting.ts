export type PipelineStage = "Novo" | "Contato" | "Diagnóstico" | "Proposta" | "Fechado" | "Perdido";
export type LeadPriority = "Alta" | "Media" | "Baixa";
export type ContactStatus = "Pendente" | "Mensagem enviada" | "Respondeu";
export type LeadSource = "Instagram" | "LinkedIn" | "Google Maps" | "Google Meu Negócio";
export type IcpProfile = string;

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
};
