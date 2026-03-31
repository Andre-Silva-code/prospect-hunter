import type { ContactStatus, LeadPriority, PipelineStage } from "@/types/prospecting";

export const stageConfig: Record<PipelineStage, { header: string; dot: string; count: string }> = {
  Novo: {
    header: "bg-[#eef3ff] border-[#c7d6f5]",
    dot: "bg-[#4f74d4]",
    count: "bg-[#c7d6f5] text-[#2a4a9e]",
  },
  Contato: {
    header: "bg-[#fff8ec] border-[#f5dcaa]",
    dot: "bg-[#d48a1a]",
    count: "bg-[#f5dcaa] text-[#7a4e0a]",
  },
  Diagnóstico: {
    header: "bg-[#fff0f0] border-[#f5c2b8]",
    dot: "bg-[#c0432a]",
    count: "bg-[#f5c2b8] text-[#7a1a0a]",
  },
  Proposta: {
    header: "bg-[#f0faf4] border-[#b8e8c8]",
    dot: "bg-[#2a8a50]",
    count: "bg-[#b8e8c8] text-[#0e4a26]",
  },
  Fechado: {
    header: "bg-[#eaf9f0] border-[#9bdfb9]",
    dot: "bg-[#1f7a45]",
    count: "bg-[#9bdfb9] text-[#0d4d2b]",
  },
  Perdido: {
    header: "bg-[#f7f1ef] border-[#e1c9c1]",
    dot: "bg-[#8b5a4d]",
    count: "bg-[#e1c9c1] text-[#5a3227]",
  },
};

export function priorityBadge(priority: LeadPriority): string {
  const variants: Record<LeadPriority, string> = {
    Alta: "bg-[rgba(192,67,42,0.12)] text-[#8a1a08] border border-[rgba(192,67,42,0.18)]",
    Media: "bg-[rgba(212,138,26,0.12)] text-[#7a4e0a] border border-[rgba(212,138,26,0.18)]",
    Baixa: "bg-[rgba(42,138,80,0.10)] text-[#0e4a26] border border-[rgba(42,138,80,0.15)]",
  };
  return `shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${variants[priority]}`;
}

export function contactStatusBadge(status: ContactStatus): string {
  const variants: Record<ContactStatus, string> = {
    Respondeu: "bg-[rgba(42,138,80,0.10)] text-[#0e4a26]",
    "Mensagem enviada": "bg-[rgba(160,75,44,0.08)] text-[#a04b2c]",
    Pendente: "bg-[rgba(35,24,21,0.06)] text-[#7d6a60]",
  };
  return `rounded-lg px-2.5 py-1 text-[11px] font-semibold ${variants[status]}`;
}

export function followUpPriorityBadge(priority: LeadPriority): string {
  const variants: Record<LeadPriority, string> = {
    Alta: "bg-[rgba(238,95,76,0.22)] text-[#ffb8a8]",
    Media: "bg-[rgba(237,177,70,0.22)] text-[#ffd98a]",
    Baixa: "bg-white/10 text-white/70",
  };
  return `shrink-0 rounded-xl px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${variants[priority]}`;
}
