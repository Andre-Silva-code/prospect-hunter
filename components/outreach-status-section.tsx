"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { OutreachQueueItem, OutreachStatus } from "@/types/outreach";
import type { LeadRecord } from "@/types/prospecting";

const STATUS_CONFIG: Record<OutreachStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendente", color: "text-gray-600", bg: "bg-gray-100" },
  phone_verified: { label: "Verificado", color: "text-blue-700", bg: "bg-blue-50" },
  phone_invalid: { label: "Tel. Invalido", color: "text-red-700", bg: "bg-red-50" },
  scheduled: { label: "Agendado", color: "text-amber-700", bg: "bg-amber-50" },
  sent: { label: "Enviado", color: "text-orange-700", bg: "bg-orange-50" },
  delivered: { label: "Entregue", color: "text-teal-700", bg: "bg-teal-50" },
  replied: { label: "Respondeu", color: "text-green-700", bg: "bg-green-50" },
  follow_up_1: { label: "Follow-up 1", color: "text-purple-700", bg: "bg-purple-50" },
  follow_up_2: { label: "Follow-up 2", color: "text-purple-800", bg: "bg-purple-100" },
  awaiting_qualification: {
    label: "Aguardando confirmar",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
  },
  pdf_sent: { label: "Análise Enviada", color: "text-sky-700", bg: "bg-sky-50" },
  post_analysis_1: { label: "Pós-análise 1", color: "text-indigo-700", bg: "bg-indigo-50" },
  post_analysis_2: { label: "Pós-análise 2", color: "text-indigo-800", bg: "bg-indigo-100" },
  consulting_done: { label: "Consultoria feita", color: "text-violet-700", bg: "bg-violet-50" },
  post_consulting_1: { label: "Pós-consul. 1", color: "text-violet-700", bg: "bg-violet-100" },
  post_consulting_2: { label: "Pós-consul. 2", color: "text-violet-800", bg: "bg-violet-200" },
  failed: { label: "Falhou", color: "text-red-700", bg: "bg-red-50" },
};

const MILESTONES: OutreachStatus[] = [
  "pending",
  "phone_verified",
  "scheduled",
  "sent",
  "follow_up_1",
  "follow_up_2",
  "replied",
];

type FilterKey = "all" | "queue" | "sent" | "replied" | "failed";

const FILTERS: { key: FilterKey; label: string; statuses: OutreachStatus[] }[] = [
  { key: "all", label: "Todos", statuses: [] },
  {
    key: "queue",
    label: "Na fila",
    statuses: ["pending", "phone_verified", "scheduled"],
  },
  {
    key: "sent",
    label: "Enviados",
    statuses: ["sent", "delivered", "follow_up_1", "follow_up_2", "awaiting_qualification"],
  },
  { key: "replied", label: "Responderam", statuses: ["replied"] },
  { key: "failed", label: "Falharam", statuses: ["failed", "phone_invalid"] },
];

function getMilestoneIndex(status: OutreachStatus): number {
  if (status === "delivered") return MILESTONES.indexOf("sent") + 0.5;
  const idx = MILESTONES.indexOf(status);
  return idx >= 0 ? idx : -1;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  leads: LeadRecord[];
};

export function OutreachStatusSection({ leads }: Props) {
  const [items, setItems] = useState<OutreachQueueItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/outreach/status");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 30000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  const getLeadName = (leadId: string) =>
    leads.find((l) => l.id === leadId)?.company || "Lead desconhecido";

  // Contadores por status
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const summaryParts: string[] = [];
  if (counts.pending || counts.phone_verified || counts.scheduled)
    summaryParts.push(
      `${(counts.pending || 0) + (counts.phone_verified || 0) + (counts.scheduled || 0)} na fila`
    );
  if (counts.sent || counts.delivered)
    summaryParts.push(`${(counts.sent || 0) + (counts.delivered || 0)} enviados`);
  if (counts.follow_up_1 || counts.follow_up_2)
    summaryParts.push(`${(counts.follow_up_1 || 0) + (counts.follow_up_2 || 0)} follow-up`);
  if (counts.replied) summaryParts.push(`${counts.replied} responderam`);
  if (counts.failed || counts.phone_invalid)
    summaryParts.push(`${(counts.failed || 0) + (counts.phone_invalid || 0)} falharam`);

  const isFailed = (status: OutreachStatus) => status === "failed" || status === "phone_invalid";

  // Filtro
  const filteredItems =
    activeFilter === "all"
      ? items
      : items.filter((item) => {
          const filterDef = FILTERS.find((f) => f.key === activeFilter);
          return filterDef?.statuses.includes(item.status);
        });

  // Contadores para badges dos filtros
  const filterCounts: Record<FilterKey, number> = {
    all: items.length,
    queue: (counts.pending || 0) + (counts.phone_verified || 0) + (counts.scheduled || 0),
    sent:
      (counts.sent || 0) +
      (counts.delivered || 0) +
      (counts.follow_up_1 || 0) +
      (counts.follow_up_2 || 0),
    replied: counts.replied || 0,
    failed: (counts.failed || 0) + (counts.phone_invalid || 0),
  };

  // Retry
  const handleRetry = async (itemId: string) => {
    setRetrying(itemId);
    try {
      const res = await fetch("/api/outreach/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (res.ok) {
        await fetchItems();
      }
    } catch {
      // silencioso
    } finally {
      setRetrying(null);
    }
  };

  // Processar fila manualmente
  const handleProcessQueue = async () => {
    setProcessing(true);
    setProcessResult(null);
    try {
      const res = await fetch("/api/outreach/process", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.processed === 0 && data.failed === 0) {
          setProcessResult("Nenhum item agendado para processar");
        } else {
          setProcessResult(`${data.processed} processados, ${data.failed} falharam`);
        }
        await fetchItems();
      } else {
        setProcessResult("Erro ao processar");
      }
    } catch {
      setProcessResult("Erro de conexao");
    } finally {
      setProcessing(false);
      setTimeout(() => setProcessResult(null), 5000);
    }
  };

  return (
    <section className="rounded-3xl bg-[#1c1410] p-6 shadow-lg">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c9a87c]">
            Status do Outreach
          </h3>
          {!loading && (
            <p className="mt-1 text-xs text-[#a8937a]">
              {items.length === 0 ? "Nenhum item na fila" : summaryParts.join(" / ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2a1f18] text-xs font-bold text-[#c9a87c]">
            {items.length}
          </span>
          <svg
            className={`h-4 w-4 text-[#c9a87c] transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Painel expandido */}
      {expanded && (
        <div className="mt-5">
          {/* Barra de ações: filtros + botão processar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFilter(filter.key);
                  }}
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    activeFilter === filter.key
                      ? "bg-[#c9a87c] text-[#1c1410]"
                      : "bg-[#2a1f18] text-[#a8937a] hover:bg-[#3a2f28] hover:text-[#c9a87c]"
                  }`}
                >
                  {filter.label}
                  {filterCounts[filter.key] > 0 && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(0,0,0,0.2)] text-[9px]">
                      {filterCounts[filter.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Botão processar fila */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleProcessQueue();
              }}
              disabled={processing}
              className="flex items-center gap-1.5 rounded-full bg-[#2a1f18] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#c9a87c] transition-colors hover:bg-[#3a2f28] disabled:opacity-50"
            >
              {processing ? (
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              {processing ? "Processando..." : "Processar fila"}
            </button>
          </div>

          {/* Resultado do processamento */}
          {processResult && (
            <div className="mb-3 rounded-xl bg-[#2a1f18] px-4 py-2 text-xs text-[#c9a87c]">
              {processResult}
            </div>
          )}

          {/* Lista de itens */}
          <div className="space-y-3">
            {loading && <p className="text-sm text-[#a8937a]">Carregando...</p>}

            {!loading && filteredItems.length === 0 && (
              <p className="text-sm text-[#a8937a]">
                {activeFilter === "all"
                  ? "Nenhum item de outreach na fila."
                  : "Nenhum item neste filtro."}
              </p>
            )}

            {filteredItems.map((item) => {
              const cfg = STATUS_CONFIG[item.status];
              const milestoneIdx = getMilestoneIndex(item.status);
              const failed = isFailed(item.status);
              const canRetry = failed;
              const isRetrying = retrying === item.id;

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#2a1f18] p-4"
                >
                  {/* Topo: nome + badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#f5e6d3]">
                        {getLeadName(item.leadId)}
                      </p>
                      <p className="mt-0.5 text-xs text-[#a8937a]">{item.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {canRetry && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(item.id);
                          }}
                          disabled={isRetrying}
                          className="flex items-center gap-1 rounded-full bg-amber-900/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 transition-colors hover:bg-amber-900/50 disabled:opacity-50"
                        >
                          {isRetrying ? (
                            <svg
                              className="h-2.5 w-2.5 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="h-2.5 w-2.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                          )}
                          {isRetrying ? "..." : "Retentar"}
                        </button>
                      )}
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Timeline de progresso */}
                  <div className="mt-4 flex items-center gap-0">
                    {MILESTONES.map((milestone, i) => {
                      const isActive = !failed && milestoneIdx >= i;
                      const isCurrent = !failed && Math.floor(milestoneIdx) === i;
                      const mCfg = STATUS_CONFIG[milestone];

                      return (
                        <div
                          key={milestone}
                          className="flex items-center"
                          style={{ flex: i < MILESTONES.length - 1 ? 1 : 0 }}
                        >
                          {/* Dot */}
                          <div className="relative group">
                            <div
                              className={`h-3 w-3 rounded-full border-2 transition-all ${
                                failed
                                  ? "border-red-500 bg-red-900/30"
                                  : isActive
                                    ? isCurrent
                                      ? "border-[#c9a87c] bg-[#c9a87c] scale-125"
                                      : "border-[#7ec8a4] bg-[#7ec8a4]"
                                    : "border-[#4a3a2e] bg-transparent"
                              }`}
                            />
                            {/* Tooltip */}
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                              {mCfg.label}
                            </span>
                          </div>
                          {/* Linha entre dots */}
                          {i < MILESTONES.length - 1 && (
                            <div
                              className={`h-0.5 flex-1 ${
                                failed
                                  ? "bg-red-900/30"
                                  : !failed && milestoneIdx > i
                                    ? "bg-[#7ec8a4]"
                                    : "bg-[#4a3a2e]"
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Detalhes */}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#8a7a6a]">
                    {item.scheduledAt && <span>Agendado: {formatDate(item.scheduledAt)}</span>}
                    {item.sentAt && <span>Enviado: {formatDate(item.sentAt)}</span>}
                    {item.attemptCount > 0 && <span>Tentativas: {item.attemptCount}</span>}
                    {item.pdfGenerated && <span>PDF gerado</span>}
                  </div>

                  {/* Erro */}
                  {item.lastError && (
                    <p className="mt-2 rounded-lg bg-red-950/30 px-3 py-1.5 text-[10px] text-red-400">
                      {item.lastError}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
