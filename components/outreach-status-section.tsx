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
  if (counts.failed) summaryParts.push(`${counts.failed} falharam`);

  const isFailed = (status: OutreachStatus) => status === "failed" || status === "phone_invalid";

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

      {/* Lista expandida */}
      {expanded && (
        <div className="mt-5 space-y-3">
          {loading && <p className="text-sm text-[#a8937a]">Carregando...</p>}

          {!loading && items.length === 0 && (
            <p className="text-sm text-[#a8937a]">Nenhum item de outreach na fila.</p>
          )}

          {items.map((item) => {
            const cfg = STATUS_CONFIG[item.status];
            const milestoneIdx = getMilestoneIndex(item.status);
            const failed = isFailed(item.status);

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
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>
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
      )}
    </section>
  );
}
