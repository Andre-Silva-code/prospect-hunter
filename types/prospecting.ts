export type PipelineStage = "Novo" | "Contato" | "Diagnóstico" | "Proposta";
export type LeadPriority = "Alta" | "Media" | "Baixa";
export type ContactStatus = "Pendente" | "Mensagem enviada" | "Respondeu";

export type LeadFormValues = {
  company: string;
  niche: string;
  region: string;
  monthlyBudget: string;
  contact: string;
  trigger: string;
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
};
