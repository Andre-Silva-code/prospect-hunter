"use client";

import Link from "next/link";
import React from "react";

import { generateOutreachMessage } from "@/lib/outreach-message";
import { icpSegments, outreachSteps } from "@/lib/prospecting-data";
import type { LeadPriority, LeadRecord, LeadSource } from "@/types/prospecting";

type IcpOption = {
  value: string;
  niche: string;
  monthlyBudget: string;
  region: string;
};

type ProspectResult = {
  id: string;
  company: string;
  niche: string;
  region: string;
  monthlyBudget: string;
  score: number;
  priority: LeadPriority;
  trigger: string;
  source: LeadSource;
  icp: string;
  contact: string;
  sourceUrl?: string;
};

const SOURCE_CHANNELS: Array<{ id: LeadSource; label: string; desc: string; icon: string }> = [
  {
    id: "Instagram",
    label: "Instagram",
    desc: "Perfis ativos com sinal de investimento e dor comercial.",
    icon: "📸",
  },
  {
    id: "LinkedIn",
    label: "LinkedIn",
    desc: "Empresas B2B com decisores acessíveis e contexto profissional.",
    icon: "💼",
  },
  {
    id: "Google Maps",
    label: "Google Maps",
    desc: "Negócios locais com demanda e presença digital validada.",
    icon: "🌐",
  },
  {
    id: "Google Meu Negócio",
    label: "Google Meu Negócio",
    desc: "Empresas com reputação local e intenção de compra clara.",
    icon: "📍",
  },
];

const ICP_OPTIONS: IcpOption[] = [
  {
    value: "Clinicas estéticas premium",
    niche: "Estética premium",
    monthlyBudget: "R$ 12k",
    region: "São Paulo",
  },
  {
    value: "Infoprodutores locais",
    niche: "Infoproduto",
    monthlyBudget: "R$ 8k",
    region: "Campinas",
  },
  {
    value: "Escritórios de advocacia nichados",
    niche: "Advocacia",
    monthlyBudget: "R$ 9k",
    region: "Belo Horizonte",
  },
  {
    value: "Dentistas e ortodontistas",
    niche: "Odontologia",
    monthlyBudget: "R$ 10k",
    region: "São Paulo",
  },
  {
    value: "Contabilidade consultiva",
    niche: "Contabilidade",
    monthlyBudget: "R$ 7k",
    region: "Curitiba",
  },
  {
    value: "Imobiliárias e corretores",
    niche: "Imobiliário",
    monthlyBudget: "R$ 9k",
    region: "Florianópolis",
  },
  {
    value: "Arquitetos e interiores",
    niche: "Arquitetura",
    monthlyBudget: "R$ 8k",
    region: "Rio de Janeiro",
  },
  {
    value: "Clínicas veterinárias",
    niche: "Veterinária",
    monthlyBudget: "R$ 6k",
    region: "Porto Alegre",
  },
  { value: "Escolas de idiomas", niche: "Educação", monthlyBudget: "R$ 5k", region: "Recife" },
  {
    value: "Consultorias B2B especializadas",
    niche: "Consultoria B2B",
    monthlyBudget: "R$ 14k",
    region: "São Paulo",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a04b2c] mb-3">
      {children}
    </p>
  );
}

function PriorityBadge({ priority }: { priority: LeadPriority }) {
  const styles = {
    Alta: "bg-red-50 text-red-700 border border-red-100",
    Media: "bg-amber-50 text-amber-700 border border-amber-100",
    Baixa: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  }[priority];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${styles}`}
    >
      {priority}
    </span>
  );
}

function buildProspectingLink(source: LeadSource, company: string): string {
  const query = encodeURIComponent(company);

  if (source === "Instagram") return `https://www.instagram.com/explore/tags/${query}`;
  if (source === "LinkedIn")
    return `https://www.linkedin.com/search/results/companies/?keywords=${query}`;
  if (source === "Google Maps") return `https://www.google.com/maps/search/${query}`;
  return `https://www.google.com/search?q=${query}+google+meu+negocio`;
}

export default function ProspectingPage() {
  const [selectedIcpValue, setSelectedIcpValue] = React.useState<string>(ICP_OPTIONS[0].value);
  const [selectedSources, setSelectedSources] = React.useState<LeadSource[]>(
    SOURCE_CHANNELS.map((channel) => channel.id)
  );
  const [searchResults, setSearchResults] = React.useState<ProspectResult[]>([]);
  const [searchedAt, setSearchedAt] = React.useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = React.useState<string[]>([]);
  const [contactedLeadIds, setContactedLeadIds] = React.useState<string[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isSendingToCrm, setIsSendingToCrm] = React.useState(false);
  const [crmFeedback, setCrmFeedback] = React.useState("");
  const [sessionUserId, setSessionUserId] = React.useState<string>("owner");
  const [connectorStatus, setConnectorStatus] = React.useState<Partial<Record<LeadSource, string>>>(
    {}
  );

  const selectedIcp = React.useMemo(() => {
    return ICP_OPTIONS.find((option) => option.value === selectedIcpValue) ?? ICP_OPTIONS[0];
  }, [selectedIcpValue]);

  React.useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) return;

        const user = (await response.json()) as { id: string };
        if (user?.id) setSessionUserId(user.id);
      } catch {
        // Keep fallback user id for local development.
      }
    })();
  }, []);

  const toggleSource = (source: LeadSource): void => {
    setSelectedSources((currentSources) => {
      if (currentSources.includes(source)) {
        return currentSources.length === 1
          ? currentSources
          : currentSources.filter((currentSource) => currentSource !== source);
      }

      return [...currentSources, source];
    });
  };

  const handleSearch = async (): Promise<void> => {
    setIsSearching(true);
    setCrmFeedback("");
    setConnectorStatus({});

    try {
      const response = await fetch("/api/prospecting/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          icp: selectedIcp.value,
          niche: selectedIcp.niche,
          region: selectedIcp.region,
          sources: selectedSources,
          limitPerSource: 4,
        }),
      });

      if (!response.ok) {
        setSearchResults([]);
        setSelectedLeadIds([]);
        setContactedLeadIds([]);
        setConnectorStatus({});
        setCrmFeedback("Nao foi possivel buscar oportunidades. Verifique os conectores.");
        return;
      }

      const payload = (await response.json()) as {
        results: ProspectResult[];
        connectorStatus: Partial<Record<LeadSource, string>>;
      };

      setSearchResults(payload.results);
      setSelectedLeadIds(payload.results.map((result) => result.id));
      setContactedLeadIds([]);
      setConnectorStatus(payload.connectorStatus ?? {});
      setSearchedAt(new Date().toISOString());
    } finally {
      setIsSearching(false);
    }
  };

  const toggleLeadSelection = (leadId: string): void => {
    setSelectedLeadIds((currentIds) =>
      currentIds.includes(leadId)
        ? currentIds.filter((id) => id !== leadId)
        : [...currentIds, leadId]
    );
  };

  const handleDirectProspecting = async (lead: ProspectResult): Promise<void> => {
    const message = `Olá, time da ${lead.company}. Vi uma oportunidade em ${lead.source} para melhorar a geração de leads de ${lead.niche}. Posso te mostrar rapidamente?`;

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(message);
    }

    window.open(
      lead.sourceUrl ?? buildProspectingLink(lead.source, lead.company),
      "_blank",
      "noopener,noreferrer"
    );
    setContactedLeadIds((currentIds) =>
      currentIds.includes(lead.id) ? currentIds : [...currentIds, lead.id]
    );
  };

  const sendSelectedToCrm = async (): Promise<void> => {
    const selectedLeads = searchResults.filter((lead) => selectedLeadIds.includes(lead.id));
    if (selectedLeads.length === 0) {
      setCrmFeedback("Selecione pelo menos 1 lead para enviar ao CRM.");
      return;
    }

    setIsSendingToCrm(true);
    setCrmFeedback("");

    let created = 0;

    for (const lead of selectedLeads) {
      const leadRecord: LeadRecord = {
        id: crypto.randomUUID(),
        userId: sessionUserId,
        company: lead.company,
        niche: lead.niche,
        region: lead.region,
        monthlyBudget: lead.monthlyBudget,
        contact: lead.contact,
        trigger: lead.trigger,
        stage: "Novo",
        score: lead.score,
        priority: lead.priority,
        message: "",
        contactStatus: "Pendente",
        createdAt: new Date().toISOString(),
        source: lead.source,
        icp: lead.icp,
        followUpIntervalDays: 2,
        followUpStep: 0,
        nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        lastContactAt: null,
      };

      leadRecord.message = generateOutreachMessage(leadRecord);

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": sessionUserId,
        },
        body: JSON.stringify(leadRecord),
      });

      if (response.ok) {
        created += 1;
      }
    }

    setIsSendingToCrm(false);
    setCrmFeedback(`${created} lead(s) enviado(s) ao CRM com sucesso.`);
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <SectionLabel>Prospecção multicanal</SectionLabel>
        <h1 className="text-2xl font-semibold text-[#231815]">Prospecção de Leads</h1>
        <p className="text-sm text-[#8a7569] mt-1">
          Escolha ICP, fontes e gere oportunidades reais para abordagem imediata.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SOURCE_CHANNELS.map((channel) => (
          <div
            key={channel.id}
            className="rounded-2xl bg-white border border-[rgba(35,24,21,0.07)] p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-2xl">{channel.icon}</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-100">
                Ativo
              </span>
            </div>
            <h3 className="font-semibold text-[#231815] mb-2">{channel.label}</h3>
            <p className="text-sm text-[#655248] leading-relaxed">{channel.desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-7 shadow-sm">
        <SectionLabel>Configurar busca</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#6c5a51]">
              ICP / Profissional
              <select
                value={selectedIcpValue}
                onChange={(event) => setSelectedIcpValue(event.target.value)}
                className="rounded-2xl border border-[rgba(35,24,21,0.1)] bg-[#fffaf5] px-4 py-2.5 text-sm text-[#231815] outline-none transition focus:border-[#a04b2c] focus:ring-2 focus:ring-[#a04b2c]/10"
              >
                {ICP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              {SOURCE_CHANNELS.map((channel) => {
                const active = selectedSources.includes(channel.id);
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => toggleSource(channel.id)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? "border-[#a04b2c] bg-[rgba(160,75,44,0.12)] text-[#a04b2c]"
                        : "border-[rgba(35,24,21,0.12)] bg-white text-[#6c5a51] hover:bg-[#fff5ec]"
                    }`}
                  >
                    {channel.label}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={isSearching}
            className="inline-flex items-center justify-center rounded-2xl bg-[#231815] px-5 py-3 text-sm font-semibold text-[#f8efe4] transition hover:bg-[#3a2b25] disabled:opacity-60"
          >
            {isSearching ? "Buscando..." : "Buscar oportunidades"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-6 shadow-sm">
        <SectionLabel>Status das integrações</SectionLabel>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {SOURCE_CHANNELS.map((channel) => (
            <div
              key={channel.id}
              className="rounded-xl border border-[rgba(35,24,21,0.08)] bg-[#fffaf5] px-4 py-3"
            >
              <p className="text-xs font-semibold text-[#231815]">{channel.label}</p>
              <p className="mt-1 text-xs text-[#6c5a51]">
                {connectorStatus[channel.id] ?? "Aguardando busca"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
          <div>
            <SectionLabel>Lista de oportunidades</SectionLabel>
            <h2 className="text-xl font-semibold text-[#231815]">Resultado da última busca</h2>
            <p className="text-xs text-[#8a7569] mt-1">
              {searchedAt
                ? `Atualizado em ${new Date(searchedAt).toLocaleString("pt-BR")}`
                : "Faça uma busca para gerar a lista de oportunidades."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void sendSelectedToCrm()}
              disabled={isSendingToCrm || selectedLeadIds.length === 0}
              className="inline-flex items-center justify-center rounded-2xl bg-[#a04b2c] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#b55a38] disabled:opacity-60"
            >
              {isSendingToCrm ? "Enviando..." : "Enviar selecionados para o CRM"}
            </button>
            <Link
              href="/crm"
              className="inline-flex items-center justify-center rounded-2xl border border-[rgba(35,24,21,0.12)] px-4 py-2.5 text-xs font-semibold text-[#231815] transition hover:bg-[#fff5ec]"
            >
              Abrir CRM
            </Link>
          </div>
        </div>

        {crmFeedback ? <p className="mb-4 text-sm text-[#2a8a50]">{crmFeedback}</p> : null}

        <div className="overflow-auto rounded-2xl border border-[rgba(35,24,21,0.07)]">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-[#fafaf8] text-[0.65rem] uppercase tracking-wider text-[#8a7569]">
                {[
                  "Sel.",
                  "Empresa",
                  "Nicho",
                  "Região",
                  "Fonte",
                  "Verba/mês",
                  "Score",
                  "Prioridade",
                  "Ação",
                ].map((col) => (
                  <th key={col} className="px-4 py-3.5 font-semibold whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {searchResults.map((prospect, index) => (
                <tr
                  key={prospect.id}
                  className={`border-t border-[rgba(35,24,21,0.06)] text-[#3f312b] hover:bg-[#fffaf5] transition-colors ${
                    index % 2 === 0 ? "" : "bg-[#fafaf8]/50"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.includes(prospect.id)}
                      onChange={() => toggleLeadSelection(prospect.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{prospect.company}</td>
                  <td className="px-4 py-3 text-[#655248]">{prospect.niche}</td>
                  <td className="px-4 py-3 text-[#655248] whitespace-nowrap">{prospect.region}</td>
                  <td className="px-4 py-3 text-[#655248] whitespace-nowrap">{prospect.source}</td>
                  <td className="px-4 py-3 font-semibold text-[#a04b2c] whitespace-nowrap">
                    {prospect.monthlyBudget}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[rgba(35,24,21,0.06)] font-bold text-[#231815]">
                      {prospect.score}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={prospect.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void handleDirectProspecting(prospect)}
                      className="inline-flex items-center justify-center rounded-xl border border-[rgba(35,24,21,0.12)] px-3 py-2 text-xs font-semibold text-[#231815] transition hover:bg-[#fff5ec]"
                    >
                      {contactedLeadIds.includes(prospect.id)
                        ? "Contato iniciado"
                        : "Prospectar agora"}
                    </button>
                  </td>
                </tr>
              ))}
              {searchResults.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-[#7d6a60]" colSpan={9}>
                    Nenhuma oportunidade exibida. Clique em &quot;Buscar oportunidades&quot; para
                    gerar resultados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-7 shadow-sm">
        <SectionLabel>ICP e oferta</SectionLabel>
        <h2 className="text-xl font-semibold text-[#231815] mb-6">
          Nicho, dor e oferta no mesmo fluxo da prospecção
        </h2>
        <div className="space-y-3">
          {icpSegments.map((segment) => (
            <div
              key={segment.title}
              className="rounded-2xl border border-[rgba(35,24,21,0.07)] bg-[#fffaf5] p-5 grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-start"
            >
              <div>
                <p className="font-semibold text-[#231815]">{segment.title}</p>
                <p className="mt-1.5 text-sm text-[#655248] leading-relaxed">{segment.pain}</p>
              </div>
              <p className="text-sm text-[#655248] leading-relaxed">{segment.offer}</p>
              <div className="rounded-xl bg-[rgba(160,75,44,0.08)] border border-[rgba(160,75,44,0.12)] p-3 text-center min-w-[92px]">
                <p className="text-[0.65rem] uppercase tracking-wider text-[#a04b2c] font-semibold">
                  CPL alvo
                </p>
                <p className="mt-1 text-base font-semibold text-[#231815]">{segment.cpl}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-[#243b30] p-7 text-[#edf3ef]">
        <SectionLabel>Cadência de abordagem</SectionLabel>
        <h2 className="text-xl font-semibold text-[#edf3ef] mb-6">
          Sequência de follow-up no mesmo módulo de prospecção
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {outreachSteps.map((step) => (
            <div
              key={step.day}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-5"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="font-semibold text-[#edf3ef]">{step.day}</span>
                <span className="text-xs uppercase tracking-wider text-[#b7d3c6]">
                  {step.touchpoint}
                </span>
              </div>
              <p className="text-sm text-[#d9e8e1] leading-relaxed">{step.script}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
