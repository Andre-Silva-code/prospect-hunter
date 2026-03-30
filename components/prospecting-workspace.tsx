"use client";

import React from "react";

import { OutreachStatusSection } from "@/components/outreach-status-section";
import type { SessionUser } from "@/lib/auth-session";
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
const prospectingSources: LeadSource[] = [
  "Instagram",
  "LinkedIn",
  "Google Maps",
  "Google Meu Negócio",
];
const icpProfiles: IcpProfile[] = [
  "Clinicas esteticas premium",
  "Infoprodutores locais",
  "Escritorios de advocacia nichados",
];
const defaultIcp: IcpProfile = "Clinicas esteticas premium";
const defaultSource: LeadSource = "Instagram";
const icpToNiche: Record<IcpProfile, string> = {
  "Clinicas esteticas premium": "Clinica estética premium",
  "Infoprodutores locais": "Infoprodutor local",
  "Escritorios de advocacia nichados": "Advocacia nichada",
};
const icpToBudget: Record<IcpProfile, string> = {
  "Clinicas esteticas premium": "R$ 10.000",
  "Infoprodutores locais": "R$ 7.000",
  "Escritorios de advocacia nichados": "R$ 8.500",
};

const defaultFormValues: LeadFormValues = {
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

function calculateLeadScore(values: LeadFormValues): number {
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

function getLeadPriority(score: number): LeadPriority {
  if (score >= 80) {
    return "Alta";
  }

  if (score >= 60) {
    return "Media";
  }

  return "Baixa";
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

function groupByStage(leads: LeadRecord[]): Record<PipelineStage, LeadRecord[]> {
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

function buildOperationalMetrics(leads: LeadRecord[]) {
  const pending = leads.filter((lead) => lead.contactStatus === "Pendente").length;
  const sent = leads.filter((lead) => lead.contactStatus === "Mensagem enviada").length;
  const replied = leads.filter((lead) => lead.contactStatus === "Respondeu").length;
  const won = leads.filter((lead) => lead.stage === "Fechado").length;
  const lost = leads.filter((lead) => lead.stage === "Perdido").length;
  const responseRate = sent + replied === 0 ? 0 : Math.round((replied / (sent + replied)) * 100);

  return {
    total: leads.length,
    pending,
    sent,
    replied,
    won,
    lost,
    responseRate,
  };
}

function buildFollowUpQueue(leads: LeadRecord[]): LeadRecord[] {
  const now = Date.now();
  return [...leads]
    .filter((lead) => {
      if (lead.stage === "Fechado" || lead.stage === "Perdido") {
        return false;
      }

      if (lead.contactStatus === "Respondeu") {
        return false;
      }

      if (!lead.nextFollowUpAt) {
        return true;
      }

      return new Date(lead.nextFollowUpAt).getTime() <= now;
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.createdAt.localeCompare(b.createdAt);
    })
    .slice(0, 4);
}

function cadenceFromSource(source: LeadSource): number {
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

function addDaysToIso(baseIso: string, days: number): string {
  const next = new Date(baseIso);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function formatFollowUpDate(dateIso?: string | null): string {
  if (!dateIso) {
    return "Sem follow-up";
  }

  return new Date(dateIso).toLocaleDateString("pt-BR");
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

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconUsers(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconClock(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconSend(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconReply(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

function IconPercent(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

function IconCopy(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconArrow(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconMessage(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconSearch(): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ─── Stage config ──────────────────────────────────────────────────────────────

const stageConfig: Record<PipelineStage, { header: string; dot: string; count: string }> = {
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

// ─── Main Component ────────────────────────────────────────────────────────────

export function ProspectingWorkspace({
  sessionUser,
}: {
  sessionUser: SessionUser;
}): React.ReactElement {
  const [formValues, setFormValues] = React.useState<LeadFormValues>(defaultFormValues);
  const [leads, setLeads] = React.useState<LeadRecord[]>([]);
  const [search, setSearch] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState<LeadPriority | "Todas">("Todas");
  const [icpFilter, setIcpFilter] = React.useState<IcpProfile>(defaultIcp);
  const [selectedSources, setSelectedSources] = React.useState<LeadSource[]>([defaultSource]);
  const [expandedMessageLeadId, setExpandedMessageLeadId] = React.useState<string | null>(null);
  const [copyFeedbackLeadId, setCopyFeedbackLeadId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const userId = sessionUser.id;
  const userName = sessionUser.name;

  React.useEffect(() => {
    void loadLeads();
  }, [sessionUser.id]);

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
      headers: {
        "Content-Type": "application/json",
      },
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
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
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
        if (currentSources.length === 1) {
          return currentSources;
        }

        const nextSources = currentSources.filter((item) => item !== source);
        setFormValues((currentValues) => ({
          ...currentValues,
          source: nextSources[0] ?? defaultSource,
        }));
        return nextSources;
      }

      const nextSources = [...currentSources, source];
      setFormValues((currentValues) => ({
        ...currentValues,
        source,
      }));
      return nextSources;
    });
  };

  const generateProspectsFromSources = (): void => {
    const generatedLeads = buildSeedLeads(icpFilter, selectedSources, userId);
    if (generatedLeads.length === 0) {
      return;
    }

    setLeads((currentLeads) => [...generatedLeads, ...currentLeads]);
    for (const lead of generatedLeads) {
      void fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lead),
      });
    }
  };

  const advanceStage = (leadId: string): void => {
    updateLead(leadId, (lead) => {
      if (lead.stage === "Fechado" || lead.stage === "Perdido") {
        return lead;
      }

      const stageIndex = pipelineStages.indexOf(lead.stage);
      const nextStage = pipelineStages[Math.min(stageIndex + 1, 3)];

      return {
        ...lead,
        stage: nextStage,
      };
    });
  };

  const closeLead = (leadId: string, stage: "Fechado" | "Perdido"): void => {
    updateLead(leadId, (lead) => ({
      ...lead,
      stage,
      nextFollowUpAt: null,
    }));
  };

  const updateLead = (leadId: string, updater: (lead: LeadRecord) => LeadRecord): void => {
    let nextLeadSnapshot: LeadRecord | null = null;

    setLeads((currentLeads) =>
      currentLeads.map((lead) => {
        if (lead.id !== leadId) {
          return lead;
        }

        const updatedLead = updater(lead);
        nextLeadSnapshot = updatedLead;
        return updatedLead;
      })
    );

    if (nextLeadSnapshot) {
      void fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextLeadSnapshot),
      });
    }
  };

  const handleMessageChange = (leadId: string, message: string): void => {
    updateLead(leadId, (lead) => ({
      ...lead,
      message,
    }));
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

  const copyMessage = async (leadId: string, message: string): Promise<void> => {
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(message);
    setCopyFeedbackLeadId(leadId);
    window.setTimeout(() => {
      setCopyFeedbackLeadId((currentId) => (currentId === leadId ? null : currentId));
    }, 1200);
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[340px_1fr]">
      {/* ── Sidebar esquerda ── */}
      <aside className="flex flex-col gap-0 rounded-3xl bg-[#1c1410] p-0 overflow-hidden shadow-[0_8px_40px_rgba(28,20,16,0.22)]">
        {/* Cabeçalho da sidebar */}
        <div className="px-7 pt-8 pb-6 border-b border-white/[0.07]">
          <span className="inline-block rounded-full bg-[#a04b2c]/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d4845e]">
            Plataforma de prospecção
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white leading-snug">
            Escolha ICP, fontes e alimente o CRM com leads prontos para conversão.
          </h2>
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-white/[0.06] px-4 py-3">
            <div className="h-7 w-7 rounded-full bg-[#a04b2c] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
                Operador ativo
              </p>
              <p className="text-sm font-semibold text-white">{userName}</p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form className="flex flex-col gap-0 flex-1 px-7 py-6" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                ICP alvo
              </span>
              <select
                value={icpFilter}
                onChange={handleIcpChange}
                className="rounded-xl border border-white/[0.09] bg-white/[0.07] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#a04b2c] focus:bg-white/[0.10] focus:ring-1 focus:ring-[#a04b2c]/40"
              >
                {icpProfiles.map((profile) => (
                  <option key={profile} value={profile} className="text-[#231815]">
                    {profile}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Fontes de prospecção
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {prospectingSources.map((source) => {
                  const active = selectedSources.includes(source);
                  return (
                    <button
                      key={source}
                      type="button"
                      onClick={() => toggleSource(source)}
                      className={`rounded-xl border px-2.5 py-2 text-[11px] font-semibold transition ${
                        active
                          ? "border-[#d4845e] bg-[#a04b2c]/20 text-[#f8d8c4]"
                          : "border-white/[0.09] bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                      }`}
                    >
                      {source}
                    </button>
                  );
                })}
              </div>
            </div>
            <SidebarInputField
              label="Empresa"
              name="company"
              value={formValues.company}
              onChange={handleChange}
            />
            <SidebarInputField
              label="Nicho"
              name="niche"
              value={formValues.niche}
              onChange={handleChange}
            />
            <div className="grid grid-cols-2 gap-3">
              <SidebarInputField
                label="Região"
                name="region"
                value={formValues.region}
                onChange={handleChange}
              />
              <SidebarInputField
                label="Verba mensal"
                name="monthlyBudget"
                value={formValues.monthlyBudget}
                onChange={handleChange}
              />
            </div>
            <SidebarInputField
              label="Contato"
              name="contact"
              value={formValues.contact}
              onChange={handleChange}
            />
            <SidebarTextAreaField
              label="Gatilho de abordagem"
              name="trigger"
              value={formValues.trigger}
              onChange={handleChange}
            />
          </div>

          <button
            type="button"
            onClick={generateProspectsFromSources}
            className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-[#d4845e]/40 bg-[#ffffff14] px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f6c8ab] transition hover:bg-[#ffffff22]"
          >
            Buscar leads nas fontes
          </button>

          <button
            type="submit"
            className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-[#a04b2c] px-5 py-4 text-sm font-semibold tracking-wide text-white transition hover:bg-[#b55a38] active:scale-[0.98]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Adicionar lead
          </button>
        </form>
      </aside>

      {/* ── Área principal ── */}
      <div className="grid gap-5 content-start">
        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[rgba(35,24,21,0.07)] bg-white px-5 py-4 text-sm text-[#6c5a51] shadow-sm">
            <span className="inline-block h-4 w-4 rounded-full border-2 border-[#a04b2c] border-t-transparent animate-spin" />
            Carregando leads do servidor...
          </div>
        ) : null}

        {/* ── Métricas ── */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={<IconUsers />}
            label="Leads totais"
            value={String(metrics.total)}
            detail="Base ativa no CRM"
            accent="#4f74d4"
          />
          <MetricCard
            icon={<IconClock />}
            label="Pendentes"
            value={String(metrics.pending)}
            detail="Sem contato ainda"
            accent="#d48a1a"
          />
          <MetricCard
            icon={<IconSend />}
            label="Mensagens enviadas"
            value={String(metrics.sent)}
            detail="Aguardando resposta"
            accent="#a04b2c"
          />
          <MetricCard
            icon={<IconReply />}
            label="Responderam"
            value={String(metrics.replied)}
            detail="Com sinal comercial"
            accent="#2a8a50"
          />
          <MetricCard
            icon={<IconCheck />}
            label="Fechados"
            value={String(metrics.won)}
            detail="Ganhos no pipeline"
            accent="#1f7a45"
          />
          <MetricCard
            icon={<IconClock />}
            label="Perdidos"
            value={String(metrics.lost)}
            detail="Negócios perdidos"
            accent="#8b5a4d"
          />
          <MetricCard
            icon={<IconPercent />}
            label="Taxa de resposta"
            value={`${metrics.responseRate}%`}
            detail="Sobre contatados"
            accent="#7a4ea0"
          />
        </section>

        {/* ── Barra de filtros ── */}
        <section className="rounded-3xl border border-[rgba(35,24,21,0.07)] bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a04b2c]">
                Priorização operacional
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-[#231815]">
                Concentre energia nos leads mais quentes.
              </h3>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#6c5a51]">
                Buscar lead
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a04b2c]">
                    <IconSearch />
                  </span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Empresa, nicho, contato..."
                    className="w-full rounded-2xl border border-[rgba(35,24,21,0.1)] bg-[#fffaf5] py-2.5 pl-9 pr-4 text-sm text-[#231815] outline-none transition focus:border-[#a04b2c] focus:ring-2 focus:ring-[#a04b2c]/10"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#6c5a51]">
                Prioridade
                <select
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(event.target.value as LeadPriority | "Todas")
                  }
                  className="rounded-2xl border border-[rgba(35,24,21,0.1)] bg-[#fffaf5] px-4 py-2.5 text-sm text-[#231815] outline-none transition focus:border-[#a04b2c] focus:ring-2 focus:ring-[#a04b2c]/10"
                >
                  <option value="Todas">Todas</option>
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        {/* ── Follow-up queue ── */}
        <section className="rounded-3xl bg-[#243b30] p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7ec8a4]">
                Follow-ups prioritários
              </p>
              <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-white">
                Ataque primeiro quem tem score alto e ainda não respondeu.
              </h3>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-[#a8c9ba] lg:text-right">
              A fila combina score e status para apontar os próximos contatos do dia.
            </p>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {followUpQueue.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/20 px-5 py-6 text-sm leading-relaxed text-[#a8c9ba]">
                Nenhum follow-up prioritário com os filtros atuais.
              </div>
            ) : null}

            {followUpQueue.map((lead, index) => (
              <article
                key={lead.id}
                className="rounded-2xl bg-white/[0.07] p-5 border border-white/[0.06] transition hover:bg-white/[0.10]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7ec8a4]/20 text-[11px] font-bold text-[#7ec8a4]">
                        {index + 1}
                      </span>
                      <p className="text-[10px] font-semibold tracking-[0.15em] text-[#7ec8a4]">
                        #{index + 1} da fila
                      </p>
                    </div>
                    <h4 className="mt-2 text-lg font-semibold text-white">{lead.company}</h4>
                  </div>
                  <span className={followUpPriorityBadge(lead.priority)}>
                    {lead.priority} · {lead.score}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#c0ddd1]">{lead.trigger}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7ec8a4]" />
                  <p className="text-xs text-[#a8c9ba]">
                    {lead.contactStatus} · {lead.stage} · Próximo:{" "}
                    {formatFollowUpDate(lead.nextFollowUpAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Status do Outreach ── */}
        <OutreachStatusSection leads={leads} />

        {/* ── Pipeline kanban ── */}
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {pipelineStages.map((stage) => {
            const cfg = stageConfig[stage];
            return (
              <section
                key={stage}
                className="rounded-3xl border border-[rgba(35,24,21,0.07)] bg-[#fffaf5] overflow-hidden shadow-sm"
              >
                {/* Header da coluna */}
                <div
                  className={`flex items-center justify-between gap-3 border-b px-5 py-4 ${cfg.header}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                    <h3 className="text-sm font-semibold text-[#231815]">{stage}</h3>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.count}`}>
                    {groupedLeads[stage].length}
                  </span>
                </div>

                {/* Cards da coluna */}
                <div className="flex flex-col gap-3 p-4">
                  {groupedLeads[stage].length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[rgba(35,24,21,0.10)] px-4 py-5 text-center text-sm text-[#9e8c82]">
                      Nenhum lead nesta etapa.
                    </div>
                  ) : null}

                  {groupedLeads[stage].map((lead) => (
                    <article
                      key={lead.id}
                      className="rounded-2xl bg-white p-4 shadow-sm border border-[rgba(35,24,21,0.07)] transition hover:shadow-md"
                    >
                      {/* Topo do card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#231815]">
                            {lead.company}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[#7d6a60]">
                            {lead.niche} · {lead.region}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-[#8a7569]">
                            {lead.source ?? defaultSource} · ICP: {lead.icp ?? defaultIcp}
                          </p>
                        </div>
                        <span className={priorityBadge(lead.priority)}>{lead.priority}</span>
                      </div>

                      {/* Score e orçamento */}
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="rounded-lg bg-[rgba(160,75,44,0.07)] px-2.5 py-1 text-[11px] font-semibold text-[#a04b2c]">
                          {lead.monthlyBudget}
                        </span>
                        <span className="rounded-lg bg-[rgba(35,24,21,0.05)] px-2.5 py-1 text-[11px] font-semibold text-[#5c4a40]">
                          Score {lead.score}
                        </span>
                        <span className={contactStatusBadge(lead.contactStatus)}>
                          {lead.contactStatus}
                        </span>
                      </div>

                      {/* Trigger */}
                      <p className="mt-3 text-xs leading-relaxed text-[#7d6a60] line-clamp-2">
                        {lead.trigger}
                      </p>

                      {/* Contato */}
                      <p className="mt-2 text-xs font-medium text-[#2a5a40]">{lead.contact}</p>
                      <p className="mt-1 text-[11px] text-[#7d6a60]">
                        Follow-up #{lead.followUpStep ?? 0} · Próximo{" "}
                        {formatFollowUpDate(lead.nextFollowUpAt)}
                      </p>

                      {/* Ações */}
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMessageLeadId((currentId) =>
                              currentId === lead.id ? null : lead.id
                            )
                          }
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(160,75,44,0.2)] px-3 py-2.5 text-xs font-semibold text-[#a04b2c] transition hover:bg-[rgba(160,75,44,0.06)]"
                        >
                          <IconMessage />
                          {expandedMessageLeadId === lead.id ? "Ocultar" : "Gerar mensagem"}
                        </button>
                        <button
                          type="button"
                          onClick={() => advanceStage(lead.id)}
                          disabled={
                            lead.stage === "Proposta" ||
                            lead.stage === "Fechado" ||
                            lead.stage === "Perdido"
                          }
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(35,24,21,0.10)] px-3 py-2.5 text-xs font-semibold text-[#231815] transition hover:bg-[rgba(35,24,21,0.04)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <IconArrow />
                          {lead.stage === "Fechado" || lead.stage === "Perdido"
                            ? "Final"
                            : "Avançar etapa"}
                        </button>
                      </div>

                      {lead.stage === "Proposta" ? (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => closeLead(lead.id, "Fechado")}
                            className="rounded-xl border border-[rgba(31,122,69,0.25)] bg-[rgba(31,122,69,0.08)] px-3 py-2 text-xs font-semibold text-[#1f7a45] transition hover:bg-[rgba(31,122,69,0.14)]"
                          >
                            Fechar ganho
                          </button>
                          <button
                            type="button"
                            onClick={() => closeLead(lead.id, "Perdido")}
                            className="rounded-xl border border-[rgba(139,90,77,0.22)] bg-[rgba(139,90,77,0.08)] px-3 py-2 text-xs font-semibold text-[#6f4034] transition hover:bg-[rgba(139,90,77,0.14)]"
                          >
                            Marcar perdido
                          </button>
                        </div>
                      ) : null}

                      {/* MessageArea expandida */}
                      {expandedMessageLeadId === lead.id ? (
                        <div className="mt-4 rounded-2xl bg-[#fffaf5] border border-[rgba(160,75,44,0.12)] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#a04b2c]">
                            Mensagem sugerida
                          </p>
                          <textarea
                            aria-label={`Mensagem do lead ${lead.company}`}
                            value={lead.message}
                            onChange={(event) => handleMessageChange(lead.id, event.target.value)}
                            rows={6}
                            className="mt-2 w-full rounded-xl border border-[rgba(160,75,44,0.14)] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#4a3830] outline-none transition focus:border-[#a04b2c] focus:ring-2 focus:ring-[#a04b2c]/10 resize-none"
                          />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void copyMessage(lead.id, lead.message)}
                              className="flex items-center gap-1.5 rounded-xl bg-[#231815] px-3.5 py-2.5 text-xs font-semibold text-[#f8efe4] transition hover:bg-[#3a2b25]"
                            >
                              {copyFeedbackLeadId === lead.id ? (
                                <>
                                  <IconCheck />
                                  Copiada!
                                </>
                              ) : (
                                <>
                                  <IconCopy />
                                  Copiar mensagem
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => registerFollowUp(lead.id)}
                              className="flex items-center gap-1.5 rounded-xl border border-[rgba(122,78,160,0.2)] px-3.5 py-2.5 text-xs font-semibold text-[#6b4a90] transition hover:bg-[rgba(122,78,160,0.08)]"
                            >
                              <IconClock />
                              Registrar follow-up
                            </button>
                            <button
                              type="button"
                              onClick={() => updateContactStatus(lead.id, "Mensagem enviada")}
                              className="flex items-center gap-1.5 rounded-xl border border-[rgba(35,24,21,0.12)] px-3.5 py-2.5 text-xs font-semibold text-[#231815] transition hover:bg-[rgba(35,24,21,0.04)]"
                            >
                              <IconSend />
                              Marcar enviada
                            </button>
                            <button
                              type="button"
                              onClick={() => updateContactStatus(lead.id, "Respondeu")}
                              className="flex items-center gap-1.5 rounded-xl border border-[rgba(36,59,48,0.2)] px-3.5 py-2.5 text-xs font-semibold text-[#243b30] transition hover:bg-[rgba(36,59,48,0.07)]"
                            >
                              <IconReply />
                              Marcar respondeu
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  accent: string;
}): React.ReactElement {
  return (
    <article className="rounded-2xl border border-[rgba(35,24,21,0.07)] bg-white p-5 shadow-sm">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: `${accent}14`, color: accent }}
      >
        {icon}
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-[#231815]">{value}</p>
      <p className="mt-1 text-sm font-medium text-[#231815]">{label}</p>
      <p className="mt-0.5 text-xs text-[#9e8c82]">{detail}</p>
    </article>
  );
}

function SidebarInputField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: keyof LeadFormValues;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}): React.ReactElement {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
        {label}
      </span>
      <input
        required
        name={name}
        value={value}
        onChange={onChange}
        className="rounded-xl border border-white/[0.09] bg-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#a04b2c] focus:bg-white/[0.10] focus:ring-1 focus:ring-[#a04b2c]/40"
      />
    </label>
  );
}

function SidebarTextAreaField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: keyof LeadFormValues;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}): React.ReactElement {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
        {label}
      </span>
      <textarea
        required
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        className="resize-none rounded-xl border border-white/[0.09] bg-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#a04b2c] focus:bg-white/[0.10] focus:ring-1 focus:ring-[#a04b2c]/40"
      />
    </label>
  );
}

function priorityBadge(priority: LeadPriority): string {
  const variants: Record<LeadPriority, string> = {
    Alta: "bg-[rgba(192,67,42,0.12)] text-[#8a1a08] border border-[rgba(192,67,42,0.18)]",
    Media: "bg-[rgba(212,138,26,0.12)] text-[#7a4e0a] border border-[rgba(212,138,26,0.18)]",
    Baixa: "bg-[rgba(42,138,80,0.10)] text-[#0e4a26] border border-[rgba(42,138,80,0.15)]",
  };
  return `shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${variants[priority]}`;
}

function contactStatusBadge(status: ContactStatus): string {
  const variants: Record<ContactStatus, string> = {
    Respondeu: "bg-[rgba(42,138,80,0.10)] text-[#0e4a26]",
    "Mensagem enviada": "bg-[rgba(160,75,44,0.08)] text-[#a04b2c]",
    Pendente: "bg-[rgba(35,24,21,0.06)] text-[#7d6a60]",
  };
  return `rounded-lg px-2.5 py-1 text-[11px] font-semibold ${variants[status]}`;
}

function followUpPriorityBadge(priority: LeadPriority): string {
  const variants: Record<LeadPriority, string> = {
    Alta: "bg-[rgba(238,95,76,0.22)] text-[#ffb8a8]",
    Media: "bg-[rgba(237,177,70,0.22)] text-[#ffd98a]",
    Baixa: "bg-white/10 text-white/70",
  };
  return `shrink-0 rounded-xl px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${variants[priority]}`;
}
