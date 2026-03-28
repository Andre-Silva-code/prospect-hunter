"use client";

import React from "react";

import {
  generateOutreachMessage,
  generateGmnAuditMessage,
  buildGbpCheckUrl,
} from "@/lib/outreach-message";
import { icpSegments, outreachSteps } from "@/lib/prospecting-data";
import type { LeadRecord, LeadSource } from "@/types/prospecting";
import {
  ConnectorStatusBar,
  ICP_OPTIONS,
  MessagePreviewModal,
  ResultsDistribution,
  ResultsTable,
  SearchForm,
  SearchHistory,
  SectionLabel,
  SourceCards,
  Toast,
  saveSearchHistory,
} from "@/components/prospecting";
import type { ProspectResult, SearchHistoryEntry } from "@/components/prospecting";

export default function ProspectingPage() {
  const [selectedIcpValue, setSelectedIcpValue] = React.useState(ICP_OPTIONS[0].value);
  const [selectedSources, setSelectedSources] = React.useState<LeadSource[]>([
    "Instagram",
    "LinkedIn",
    "Google Maps",
    "Google Meu Negócio",
  ]);
  const [niche, setNiche] = React.useState(ICP_OPTIONS[0].niche);
  const [region, setRegion] = React.useState(ICP_OPTIONS[0].region);
  const [city, setCity] = React.useState("");
  const [limitPerSource, setLimitPerSource] = React.useState(4);
  const [searchResults, setSearchResults] = React.useState<ProspectResult[]>([]);
  const [searchedAt, setSearchedAt] = React.useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = React.useState<string[]>([]);
  const [contactedLeadIds, setContactedLeadIds] = React.useState<string[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isSendingToCrm, setIsSendingToCrm] = React.useState(false);
  const [crmProgress, setCrmProgress] = React.useState({ current: 0, total: 0 });
  const [crmFeedback, setCrmFeedback] = React.useState("");
  const [sessionUserId, setSessionUserId] = React.useState("owner");
  const [connectorStatus, setConnectorStatus] = React.useState<Partial<Record<LeadSource, string>>>(
    {}
  );
  const [showEducational, setShowEducational] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [previewModal, setPreviewModal] = React.useState(false);
  const [previewMessages, setPreviewMessages] = React.useState<Map<string, string>>(new Map());

  const selectedIcp = React.useMemo(
    () => ICP_OPTIONS.find((o) => o.value === selectedIcpValue) ?? ICP_OPTIONS[0],
    [selectedIcpValue]
  );

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const user = (await res.json()) as { id: string };
        if (user?.id) setSessionUserId(user.id);
      } catch {
        /* keep fallback */
      }
    })();
  }, []);

  const toggleSource = (source: LeadSource) => {
    setSelectedSources((cur) => {
      if (cur.includes(source)) {
        return cur.length === 1 ? cur : cur.filter((s) => s !== source);
      }
      return [...cur, source];
    });
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setCrmFeedback("");
    setConnectorStatus({});

    try {
      const res = await fetch("/api/prospecting/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icp: selectedIcp.value,
          niche,
          region,
          city: city || undefined,
          sources: selectedSources,
          limitPerSource,
        }),
      });

      if (!res.ok) {
        setSearchResults([]);
        setSelectedLeadIds([]);
        setContactedLeadIds([]);
        setConnectorStatus({});
        setCrmFeedback("Não foi possível buscar oportunidades. Verifique os conectores.");
        return;
      }

      const payload = (await res.json()) as {
        results: ProspectResult[];
        connectorStatus: Partial<Record<LeadSource, string>>;
      };

      setSearchResults(payload.results);
      setSelectedLeadIds(payload.results.map((r) => r.id));
      setContactedLeadIds([]);
      setConnectorStatus(payload.connectorStatus ?? {});
      setSearchedAt(new Date().toISOString());

      saveSearchHistory({
        icp: selectedIcp.value,
        niche,
        region,
        city,
        sources: selectedSources,
        limitPerSource,
        resultsCount: payload.results.length,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleReplaySearch = (entry: SearchHistoryEntry) => {
    setSelectedIcpValue(entry.icp);
    setNiche(entry.niche);
    setRegion(entry.region);
    setCity(entry.city);
    setSelectedSources(entry.sources);
    setLimitPerSource(entry.limitPerSource);
  };

  const toggleLeadSelection = (id: string) => {
    setSelectedLeadIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const selectAll = () => setSelectedLeadIds(searchResults.map((r) => r.id));
  const deselectAll = () => setSelectedLeadIds([]);

  const handleDirectProspecting = async (lead: ProspectResult) => {
    const msg = `Olá, time da ${lead.company}. Vi uma oportunidade em ${lead.source} para melhorar a geração de leads de ${lead.niche}. Posso te mostrar rapidamente?`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(msg);
      setToast("Mensagem copiada para a área de transferência!");
    }

    const query = encodeURIComponent(lead.company);
    const fallbackUrl =
      lead.source === "Instagram"
        ? `https://www.instagram.com/explore/tags/${query}`
        : lead.source === "LinkedIn"
          ? `https://www.linkedin.com/search/results/companies/?keywords=${query}`
          : lead.source === "Google Maps"
            ? `https://www.google.com/maps/search/${query}`
            : `https://www.google.com/search?q=${query}+google+meu+negocio`;

    window.open(lead.sourceUrl ?? fallbackUrl, "_blank", "noopener,noreferrer");
    setContactedLeadIds((cur) => (cur.includes(lead.id) ? cur : [...cur, lead.id]));
  };

  const handleGmnAudit = async (lead: ProspectResult) => {
    const msg = generateGmnAuditMessage({
      company: lead.company,
      region: lead.region,
      trigger: lead.trigger,
    });

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(msg);
      setToast("Mensagem de análise GMN copiada! Abrindo GBP Check...");
    }

    window.open(buildGbpCheckUrl(lead.company), "_blank", "noopener,noreferrer");
    setContactedLeadIds((cur) => (cur.includes(lead.id) ? cur : [...cur, lead.id]));
  };

  const openPreviewModal = async () => {
    const selected = searchResults.filter((l) => selectedLeadIds.includes(l.id));
    if (selected.length === 0) {
      setCrmFeedback("Selecione pelo menos 1 lead para enviar ao CRM.");
      return;
    }

    setCrmFeedback("");
    const messages = new Map<string, string>();

    for (const lead of selected) {
      try {
        const res = await fetch("/api/gemini/generate-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: lead.company,
            niche: lead.niche,
            region: lead.region,
            trigger: lead.trigger,
            priority: lead.priority,
          }),
        });

        if (res.ok) {
          const payload = (await res.json()) as { message?: string };
          if (typeof payload.message === "string" && payload.message.trim().length > 0) {
            messages.set(lead.id, payload.message);
            continue;
          }
        }
      } catch {
        /* fallback */
      }

      messages.set(
        lead.id,
        generateOutreachMessage({
          company: lead.company,
          niche: lead.niche,
          region: lead.region,
          trigger: lead.trigger,
          priority: lead.priority,
        } as LeadRecord)
      );
    }

    setPreviewMessages(messages);
    setPreviewModal(true);
  };

  const confirmSendToCrm = async () => {
    const selected = searchResults.filter((l) => selectedLeadIds.includes(l.id));
    setPreviewModal(false);
    setIsSendingToCrm(true);
    setCrmFeedback("");
    setCrmProgress({ current: 0, total: selected.length });

    let created = 0;

    for (const lead of selected) {
      const record: LeadRecord = {
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
        message:
          previewMessages.get(lead.id) ?? generateOutreachMessage(lead as unknown as LeadRecord),
        contactStatus: "Pendente",
        createdAt: new Date().toISOString(),
        source: lead.source,
        icp: lead.icp,
        followUpIntervalDays: 2,
        followUpStep: 0,
        nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        lastContactAt: null,
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });

      if (res.ok) created += 1;
      setCrmProgress((p) => ({ ...p, current: p.current + 1 }));
    }

    setIsSendingToCrm(false);
    setCrmFeedback(`${created} lead(s) enviado(s) ao CRM com sucesso.`);
    setToast(`${created} lead(s) enviado(s) ao CRM!`);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <SectionLabel>Prospecção multicanal</SectionLabel>
        <h1 className="text-2xl font-semibold text-[#231815]">Prospecção de Leads</h1>
        <p className="text-sm text-[#8a7569] mt-1">
          Escolha ICP, fontes e gere oportunidades reais para abordagem imediata.
        </p>
      </div>

      {/* Source cards com status real */}
      <SourceCards connectorStatus={connectorStatus} />

      {/* Formulário de busca */}
      <SearchForm
        selectedIcp={selectedIcp}
        selectedSources={selectedSources}
        niche={niche}
        region={region}
        city={city}
        limitPerSource={limitPerSource}
        isSearching={isSearching}
        onIcpChange={setSelectedIcpValue}
        onToggleSource={toggleSource}
        onNicheChange={setNiche}
        onRegionChange={setRegion}
        onCityChange={setCity}
        onLimitChange={setLimitPerSource}
        onSearch={() => void handleSearch()}
      />

      {/* Histórico de buscas */}
      <SearchHistory onReplay={handleReplaySearch} />

      {/* Status detalhado pós-busca */}
      <ConnectorStatusBar connectorStatus={connectorStatus} />

      {/* Gráfico de distribuição */}
      <ResultsDistribution results={searchResults} />

      {/* Tabela de resultados */}
      <ResultsTable
        results={searchResults}
        searchedAt={searchedAt}
        isSearching={isSearching}
        selectedLeadIds={selectedLeadIds}
        contactedLeadIds={contactedLeadIds}
        isSendingToCrm={isSendingToCrm}
        crmProgress={crmProgress}
        crmFeedback={crmFeedback}
        onToggleSelection={toggleLeadSelection}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onDirectProspect={(lead) => void handleDirectProspecting(lead)}
        onGmnAudit={(lead) => void handleGmnAudit(lead)}
        onSendToCrm={() => void openPreviewModal()}
      />

      {/* Seções educativas - colapsáveis */}
      <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowEducational((v) => !v)}
          className="w-full flex items-center justify-between p-7 text-left hover:bg-[#fffaf5] transition-colors"
        >
          <div>
            <SectionLabel>Material de apoio</SectionLabel>
            <h2 className="text-xl font-semibold text-[#231815]">
              ICP, oferta e cadência de abordagem
            </h2>
          </div>
          <span
            className="text-2xl text-[#8a7569] transition-transform duration-200"
            style={{ transform: showEducational ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            ▼
          </span>
        </button>

        {showEducational && (
          <div className="px-7 pb-7 space-y-8">
            <div>
              <SectionLabel>ICP e oferta</SectionLabel>
              <div className="space-y-3">
                {icpSegments.map((segment) => (
                  <div
                    key={segment.title}
                    className="rounded-2xl border border-[rgba(35,24,21,0.07)] bg-[#fffaf5] p-5 grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-start"
                  >
                    <div>
                      <p className="font-semibold text-[#231815]">{segment.title}</p>
                      <p className="mt-1.5 text-sm text-[#655248] leading-relaxed">
                        {segment.pain}
                      </p>
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
              <h2 className="text-xl font-semibold text-[#edf3ef] mb-6">Sequência de follow-up</h2>
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
        )}
      </div>

      {/* Modal de preview de mensagens */}
      {previewModal && (
        <MessagePreviewModal
          leads={searchResults.filter((l) => selectedLeadIds.includes(l.id))}
          messages={previewMessages}
          onConfirm={() => void confirmSendToCrm()}
          onCancel={() => setPreviewModal(false)}
          onEditMessage={(id, msg) => setPreviewMessages((prev) => new Map(prev).set(id, msg))}
        />
      )}

      {/* Toast notification */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
