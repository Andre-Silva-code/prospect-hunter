"use client";

import React from "react";

import { generateOutreachMessage } from "@/lib/outreach-message";
import type {
  ContactStatus,
  IcpProfile,
  LeadFormValues,
  LeadPriority,
  LeadRecord,
  LeadSource,
  PipelineStage,
} from "@/types/prospecting";

const pipelineStages: PipelineStage[] = [
  "Novo",
  "Contato",
  "Diagnóstico",
  "Proposta",
  "Fechado",
  "Perdido",
];

export const icpToNiche: Record<IcpProfile, string> = {
  "Clinicas esteticas premium": "Clinica estética premium",
  "Infoprodutores locais": "Infoprodutor local",
  "Escritorios de advocacia nichados": "Advocacia nichada",
};

export const icpToBudget: Record<IcpProfile, string> = {
  "Clinicas esteticas premium": "R$ 10.000",
  "Infoprodutores locais": "R$ 7.000",
  "Escritorios de advocacia nichados": "R$ 8.500",
};

export const defaultIcp: IcpProfile = "Clinicas esteticas premium";
export const defaultSource: LeadSource = "Instagram";

export const defaultFormValues: LeadFormValues = {
  company: "",
  niche: icpToNiche[defaultIcp],
  region: "",
  monthlyBudget: icpToBudget[defaultIcp],
  contact: "",
  trigger: "",
  source: defaultSource,
  icp: defaultIcp,
};

function parseBudget(monthlyBudget: string): number {
  const digits = monthlyBudget.replace(/[^\d]/g, "");
  return Number(digits || "0");
}

export function calculateLeadScore(values: LeadFormValues): number {
  let score = 30;
  const budget = parseBudget(values.monthlyBudget);

  if (budget >= 10000) {
    score += 30;
  } else if (budget >= 5000) {
    score += 20;
  } else if (budget > 0) {
    score += 10;
  }

  if (/anuncio|meta|google|campanha|trafego|funil/i.test(values.trigger)) {
    score += 20;
  }

  if (/instagram|whatsapp|site|crm|closer|sdr/i.test(values.contact)) {
    score += 10;
  }

  if (/clinica|advogad|estetica|odonto|premium|high ticket/i.test(values.niche)) {
    score += 10;
  }

  if (values.source === "Google Maps" || values.source === "Google Meu Negócio") {
    score += 8;
  }

  if (values.icp === "Clinicas esteticas premium") {
    score += 6;
  }

  return Math.min(score, 100);
}

export function getLeadPriority(score: number): LeadPriority {
  if (score >= 80) return "Alta";
  if (score >= 60) return "Media";
  return "Baixa";
}

export function cadenceFromSource(source: LeadSource): number {
  switch (source) {
    case "Instagram":
      return 2;
    case "LinkedIn":
      return 3;
    case "Google Maps":
      return 1;
    case "Google Meu Negócio":
      return 2;
    default:
      return 2;
  }
}

export function addDaysToIso(baseIso: string, days: number): string {
  const next = new Date(baseIso);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

export function formatFollowUpDate(dateIso?: string | null): string {
  if (!dateIso) return "Sem follow-up";
  return new Date(dateIso).toLocaleDateString("pt-BR");
}

function buildLead(values: LeadFormValues, userId: string): LeadRecord {
  const source = values.source ?? defaultSource;
  const icp = values.icp ?? defaultIcp;
  const score = calculateLeadScore(values);
  const message = generateOutreachMessage({
    ...values,
    source,
    icp,
    id: "preview",
    userId,
    stage: "Novo",
    score,
    priority: getLeadPriority(score),
    message: "",
    contactStatus: "Pendente",
    createdAt: new Date().toISOString(),
  });

  return {
    ...values,
    source,
    icp,
    id: crypto.randomUUID(),
    userId,
    stage: "Novo",
    score,
    priority: getLeadPriority(score),
    message,
    contactStatus: "Pendente",
    createdAt: new Date().toISOString(),
    followUpIntervalDays: cadenceFromSource(source),
    followUpStep: 0,
    nextFollowUpAt: addDaysToIso(new Date().toISOString(), cadenceFromSource(source)),
    lastContactAt: null,
  };
}

export function groupByStage(leads: LeadRecord[]): Record<PipelineStage, LeadRecord[]> {
  const initialGroups: Record<PipelineStage, LeadRecord[]> = {
    Novo: [],
    Contato: [],
    Diagnóstico: [],
    Proposta: [],
    Fechado: [],
    Perdido: [],
  };

  return pipelineStages.reduce<Record<PipelineStage, LeadRecord[]>>((acc, stage) => {
    acc[stage] = leads.filter((lead) => lead.stage === stage);
    return acc;
  }, initialGroups);
}

export function buildOperationalMetrics(leads: LeadRecord[]) {
  const pending = leads.filter((lead) => lead.contactStatus === "Pendente").length;
  const sent = leads.filter((lead) => lead.contactStatus === "Mensagem enviada").length;
  const replied = leads.filter((lead) => lead.contactStatus === "Respondeu").length;
  const won = leads.filter((lead) => lead.stage === "Fechado").length;
  const lost = leads.filter((lead) => lead.stage === "Perdido").length;
  const responseRate = sent + replied === 0 ? 0 : Math.round((replied / (sent + replied)) * 100);

  return { total: leads.length, pending, sent, replied, won, lost, responseRate };
}

export function buildFollowUpQueue(leads: LeadRecord[]): LeadRecord[] {
  const now = Date.now();
  return [...leads]
    .filter((lead) => {
      if (lead.stage === "Fechado" || lead.stage === "Perdido") return false;
      if (lead.contactStatus === "Respondeu") return false;
      if (!lead.nextFollowUpAt) return true;
      return new Date(lead.nextFollowUpAt).getTime() <= now;
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.createdAt.localeCompare(b.createdAt);
    })
    .slice(0, 4);
}

function buildSeedLeads(
  icp: IcpProfile,
  selectedSources: LeadSource[],
  userId: string
): LeadRecord[] {
  const nowIso = new Date().toISOString();
  const region =
    icp === "Infoprodutores locais"
      ? "Campinas"
      : icp === "Escritorios de advocacia nichados"
        ? "Belo Horizonte"
        : "Sao Paulo";

  const companiesBySource: Record<LeadSource, string[]> = {
    Instagram: ["Studio Aurora", "Clinica Viva Derme", "Oral Prime Social"],
    LinkedIn: ["Nexa Consultoria", "Fluxo Digital Partners", "Escala B2B Lab"],
    "Google Maps": ["Estetica Bella Forma", "Melo Advocacia Premium", "Plena Pilates"],
    "Google Meu Negócio": ["Clinica Vertex", "Alvo Infoprodutor", "Nobre Saude Integrada"],
  };

  return selectedSources.flatMap((source) => {
    return companiesBySource[source].slice(0, 2).map((company, index) => {
      const interval = cadenceFromSource(source);
      const seed: LeadFormValues = {
        company: `${company} ${index + 1}`,
        niche: icpToNiche[icp],
        region,
        monthlyBudget: icpToBudget[icp],
        contact:
          source === "Instagram"
            ? "@contato"
            : source === "LinkedIn"
              ? "linkedin.com/in/decisor"
              : "(11) 99999-0000",
        trigger: `Lead identificado via ${source} com aderencia ao ICP ${icp}.`,
        source,
        icp,
      };
      const lead = buildLead(seed, userId);
      return {
        ...lead,
        createdAt: nowIso,
        followUpIntervalDays: interval,
        nextFollowUpAt: addDaysToIso(nowIso, interval),
      };
    });
  });
}

export type UseLeadsReturn = {
  leads: LeadRecord[];
  filteredLeads: LeadRecord[];
  groupedLeads: Record<PipelineStage, LeadRecord[]>;
  metrics: ReturnType<typeof buildOperationalMetrics>;
  followUpQueue: LeadRecord[];
  isLoading: boolean;
  formValues: LeadFormValues;
  setFormValues: React.Dispatch<React.SetStateAction<LeadFormValues>>;
  search: string;
  setSearch: (v: string) => void;
  priorityFilter: LeadPriority | "Todas";
  setPriorityFilter: (v: LeadPriority | "Todas") => void;
  icpFilter: IcpProfile;
  selectedSources: LeadSource[];
  toggleSource: (source: LeadSource) => void;
  handleIcpChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  handleChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  generateProspectsFromSources: () => void;
  advanceStage: (leadId: string) => void;
  closeLead: (leadId: string, stage: "Fechado" | "Perdido") => void;
  handleMessageChange: (leadId: string, message: string) => void;
  updateContactStatus: (leadId: string, contactStatus: ContactStatus) => void;
  registerFollowUp: (leadId: string) => void;
  copyMessage: (leadId: string, message: string) => Promise<void>;
  expandedMessageLeadId: string | null;
  setExpandedMessageLeadId: React.Dispatch<React.SetStateAction<string | null>>;
  copyFeedbackLeadId: string | null;
  sendGbpReport: (leadId: string) => Promise<void>;
  gbpReportSendingLeadId: string | null;
  markConsultingDone: (leadId: string) => Promise<void>;
  consultingDoneLeadId: string | null;
};

export function useLeads(userId: string): UseLeadsReturn {
  const [formValues, setFormValues] = React.useState<LeadFormValues>(defaultFormValues);
  const [leads, setLeads] = React.useState<LeadRecord[]>([]);
  const [search, setSearch] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState<LeadPriority | "Todas">("Todas");
  const [icpFilter, setIcpFilter] = React.useState<IcpProfile>(defaultIcp);
  const [selectedSources, setSelectedSources] = React.useState<LeadSource[]>([defaultSource]);
  const [expandedMessageLeadId, setExpandedMessageLeadId] = React.useState<string | null>(null);
  const [copyFeedbackLeadId, setCopyFeedbackLeadId] = React.useState<string | null>(null);
  const [gbpReportSendingLeadId, setGbpReportSendingLeadId] = React.useState<string | null>(null);
  const [consultingDoneLeadId, setConsultingDoneLeadId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    void loadLeads();
  }, [userId]);

  const filteredLeads = React.useMemo(() => {
    return leads.filter((lead) => {
      const matchesPriority = priorityFilter === "Todas" ? true : lead.priority === priorityFilter;
      const searchValue = search.trim().toLowerCase();
      const matchesSearch =
        searchValue.length === 0
          ? true
          : [lead.company, lead.niche, lead.region, lead.contact, lead.trigger]
              .concat([lead.source ?? "", lead.icp ?? ""])
              .join(" ")
              .toLowerCase()
              .includes(searchValue);
      return matchesPriority && matchesSearch;
    });
  }, [leads, priorityFilter, search]);

  const groupedLeads = groupByStage(filteredLeads);
  const metrics = buildOperationalMetrics(leads);
  const followUpQueue = buildFollowUpQueue(filteredLeads);

  async function loadLeads(): Promise<void> {
    try {
      const response = await fetch("/api/leads");
      const payload = (await response.json()) as unknown;
      if (!response.ok || !Array.isArray(payload)) {
        setLeads([]);
        setIsLoading(false);
        return;
      }
      setLeads(payload as LeadRecord[]);
      setIsLoading(false);
    } catch {
      setLeads([]);
      setIsLoading(false);
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const normalizedValues = Object.fromEntries(
      Object.entries(formValues).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ])
    ) as LeadFormValues;

    if (
      !normalizedValues.company ||
      !normalizedValues.niche ||
      !normalizedValues.region ||
      !normalizedValues.monthlyBudget ||
      !normalizedValues.contact ||
      !normalizedValues.trigger
    ) {
      return;
    }

    const nextLead = buildLead(normalizedValues, userId);
    setLeads((currentLeads) => [nextLead, ...currentLeads]);
    void fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextLead),
    });
    setFormValues((currentValues) => ({
      ...defaultFormValues,
      source: currentValues.source,
      icp: currentValues.icp ?? defaultIcp,
      niche: icpToNiche[currentValues.icp ?? defaultIcp],
      monthlyBudget: icpToBudget[currentValues.icp ?? defaultIcp],
    }));
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    setFormValues((currentValues) => ({ ...currentValues, [name]: value }));
  };

  const handleIcpChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const nextIcp = event.target.value as IcpProfile;
    setIcpFilter(nextIcp);
    setFormValues((currentValues) => ({
      ...currentValues,
      icp: nextIcp,
      niche: icpToNiche[nextIcp],
      monthlyBudget: icpToBudget[nextIcp],
    }));
  };

  const toggleSource = (source: LeadSource): void => {
    setSelectedSources((currentSources) => {
      if (currentSources.includes(source)) {
        if (currentSources.length === 1) return currentSources;
        const nextSources = currentSources.filter((item) => item !== source);
        setFormValues((currentValues) => ({
          ...currentValues,
          source: nextSources[0] ?? defaultSource,
        }));
        return nextSources;
      }
      const nextSources = [...currentSources, source];
      setFormValues((currentValues) => ({ ...currentValues, source }));
      return nextSources;
    });
  };

  const generateProspectsFromSources = (): void => {
    const generatedLeads = buildSeedLeads(icpFilter, selectedSources, userId);
    if (generatedLeads.length === 0) return;
    setLeads((currentLeads) => [...generatedLeads, ...currentLeads]);
    for (const lead of generatedLeads) {
      void fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    }
  };

  const updateLead = (leadId: string, updater: (lead: LeadRecord) => LeadRecord): void => {
    let nextLeadSnapshot: LeadRecord | null = null;
    setLeads((currentLeads) =>
      currentLeads.map((lead) => {
        if (lead.id !== leadId) return lead;
        const updatedLead = updater(lead);
        nextLeadSnapshot = updatedLead;
        return updatedLead;
      })
    );
    if (nextLeadSnapshot) {
      void fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextLeadSnapshot),
      });
    }
  };

  const advanceStage = (leadId: string): void => {
    updateLead(leadId, (lead) => {
      if (lead.stage === "Fechado" || lead.stage === "Perdido") return lead;
      const stageIndex = pipelineStages.indexOf(lead.stage);
      const nextStage = pipelineStages[Math.min(stageIndex + 1, 3)];
      return { ...lead, stage: nextStage };
    });
  };

  const closeLead = (leadId: string, stage: "Fechado" | "Perdido"): void => {
    updateLead(leadId, (lead) => ({ ...lead, stage, nextFollowUpAt: null }));
  };

  const handleMessageChange = (leadId: string, message: string): void => {
    updateLead(leadId, (lead) => ({ ...lead, message }));
  };

  const updateContactStatus = (leadId: string, contactStatus: ContactStatus): void => {
    updateLead(leadId, (lead) => ({
      ...lead,
      contactStatus,
      lastContactAt: new Date().toISOString(),
    }));
  };

  const registerFollowUp = (leadId: string): void => {
    updateLead(leadId, (lead) => {
      const interval = lead.followUpIntervalDays ?? cadenceFromSource(lead.source ?? defaultSource);
      const step = (lead.followUpStep ?? 0) + 1;
      return {
        ...lead,
        contactStatus: "Mensagem enviada",
        followUpStep: step,
        followUpIntervalDays: interval,
        lastContactAt: new Date().toISOString(),
        nextFollowUpAt: addDaysToIso(new Date().toISOString(), interval),
      };
    });
  };

  const sendGbpReport = async (leadId: string): Promise<void> => {
    setGbpReportSendingLeadId(leadId);
    try {
      const res = await fetch("/api/outreach/mark-report-sent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(`Erro: ${data.error ?? "Tente novamente."}`);
      }
    } catch {
      alert("Erro de conexão.");
    } finally {
      setGbpReportSendingLeadId(null);
    }
  };

  const markConsultingDone = async (leadId: string): Promise<void> => {
    setConsultingDoneLeadId(leadId);
    try {
      const res = await fetch("/api/outreach/mark-consulting-done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(`Erro: ${data.error ?? "Tente novamente."}`);
      }
    } catch {
      alert("Erro de conexão.");
    } finally {
      setConsultingDoneLeadId(null);
    }
  };

  const copyMessage = async (leadId: string, message: string): Promise<void> => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(message);
    setCopyFeedbackLeadId(leadId);
    window.setTimeout(() => {
      setCopyFeedbackLeadId((currentId) => (currentId === leadId ? null : currentId));
    }, 1200);
  };

  return {
    leads,
    filteredLeads,
    groupedLeads,
    metrics,
    followUpQueue,
    isLoading,
    formValues,
    setFormValues,
    search,
    setSearch,
    priorityFilter,
    setPriorityFilter,
    icpFilter,
    selectedSources,
    toggleSource,
    handleIcpChange,
    handleSubmit,
    handleChange,
    generateProspectsFromSources,
    advanceStage,
    closeLead,
    handleMessageChange,
    updateContactStatus,
    registerFollowUp,
    copyMessage,
    expandedMessageLeadId,
    setExpandedMessageLeadId,
    copyFeedbackLeadId,
    sendGbpReport,
    gbpReportSendingLeadId,
    markConsultingDone,
    consultingDoneLeadId,
  };
}
