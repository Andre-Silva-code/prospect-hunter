"use client";

import React, { useEffect, useState } from "react";

import type { LeadPriority, LeadSource } from "@/types/prospecting";
import type { ProspectResult } from "./types";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a04b2c] mb-3">
      {children}
    </p>
  );
}

export function PriorityBadge({ priority }: { priority: LeadPriority }) {
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

export function SkeletonRow() {
  return (
    <tr className="border-t border-[rgba(35,24,21,0.06)] animate-pulse">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-[rgba(35,24,21,0.08)]" />
        </td>
      ))}
    </tr>
  );
}

export function CrmProgressBar({ current, total }: { current: number; total: number }) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-[#6c5a51]">
          Enviando para o CRM... {current}/{total}
        </p>
        <p className="text-xs font-semibold text-[#a04b2c]">{percent}%</p>
      </div>
      <div className="h-2 rounded-full bg-[rgba(35,24,21,0.08)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#a04b2c] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const hide = setTimeout(() => setExiting(true), 2700);
    const close = setTimeout(onClose, 3000);
    return () => {
      clearTimeout(hide);
      clearTimeout(close);
    };
  }, [onClose]);

  const isError = /erro|falha|não foi/i.test(message);
  const isSuccess = /sucesso|adicionado|enviado|copiada|salvo/i.test(message);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-[#231815] px-5 py-3.5 text-sm text-[#f8efe4] shadow-xl border border-white/10 max-w-sm"
      style={{
        animation: exiting ? "fadeDown 0.3s ease forwards" : "fadeUp 0.3s ease both",
      }}
    >
      {isError ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 text-red-400"
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 5v3.5M8 11h.01"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : isSuccess ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 text-emerald-400"
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M5.5 8l1.8 1.8 3-3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 text-[#f6b37d]"
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 5v4M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      <span className="leading-snug">{message}</span>
    </div>
  );
}

export function ContactBadge({ contact }: { contact: string }) {
  const hasEmail = /[@]/.test(contact);
  const hasPhone = /[\d()+\-]{8,}/.test(contact);
  const hasWeb = /https?:\/\/|www\./i.test(contact);
  const hasSocial = /^@|instagram|linkedin|facebook/i.test(contact);
  const noContact = contact === "Sem contato publico";

  if (noContact) {
    return <span className="text-[0.65rem] text-gray-400">Sem contato</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {hasEmail && (
        <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
          Email
        </span>
      )}
      {hasPhone && (
        <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-green-50 text-green-600 border border-green-100">
          Tel
        </span>
      )}
      {hasWeb && (
        <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">
          Web
        </span>
      )}
      {hasSocial && !hasWeb && (
        <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-pink-50 text-pink-600 border border-pink-100">
          Social
        </span>
      )}
      {!hasEmail && !hasPhone && !hasWeb && !hasSocial && (
        <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-100">
          Outro
        </span>
      )}
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-[rgba(160,75,44,0.08)] flex items-center justify-center mb-5">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#a04b2c"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[#231815] mb-2">Nenhuma busca realizada</h3>
      <p className="text-sm text-[#8a7569] max-w-sm">
        Selecione um ICP, escolha o estado e as fontes desejadas, depois clique em &quot;Buscar
        oportunidades&quot; para encontrar leads qualificados.
      </p>
    </div>
  );
}

function BarSegment({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 truncate text-[#6c5a51]">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-[rgba(35,24,21,0.06)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right font-semibold text-[#231815]">{count}</span>
    </div>
  );
}

const SOURCE_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  LinkedIn: "#0A66C2",
  "Google Maps": "#34A853",
  "Google Meu Negócio": "#FBBC04",
};

const PRIORITY_COLORS: Record<string, string> = {
  Alta: "#dc2626",
  Media: "#d97706",
  Baixa: "#059669",
};

export function ResultsDistribution({ results }: { results: ProspectResult[] }) {
  if (results.length === 0) return null;

  const bySrc: Partial<Record<LeadSource, number>> = {};
  const byPri: Record<string, number> = {};
  for (const r of results) {
    bySrc[r.source] = (bySrc[r.source] ?? 0) + 1;
    byPri[r.priority] = (byPri[r.priority] ?? 0) + 1;
  }

  return (
    <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-6 shadow-sm">
      <SectionLabel>Distribuição dos resultados</SectionLabel>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-[#231815] mb-3">Por fonte</p>
          <div className="space-y-2">
            {Object.entries(bySrc).map(([src, count]) => (
              <BarSegment
                key={src}
                label={src}
                count={count!}
                total={results.length}
                color={SOURCE_COLORS[src] ?? "#8a7569"}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#231815] mb-3">Por prioridade</p>
          <div className="space-y-2">
            {(["Alta", "Media", "Baixa"] as const)
              .filter((p) => byPri[p])
              .map((p) => (
                <BarSegment
                  key={p}
                  label={p}
                  count={byPri[p]!}
                  total={results.length}
                  color={PRIORITY_COLORS[p]}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export type SearchHistoryEntry = {
  id: string;
  icp: string;
  niche: string;
  region: string;
  city: string;
  sources: LeadSource[];
  limitPerSource: number;
  resultsCount: number;
  timestamp: string;
};

const HISTORY_KEY = "prospect-hunter-search-history";
const MAX_HISTORY = 10;

export function saveSearchHistory(entry: Omit<SearchHistoryEntry, "id" | "timestamp">) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history: SearchHistoryEntry[] = raw ? JSON.parse(raw) : [];
    const newEntry: SearchHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...history].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    /* localStorage indisponível */
  }
}

export function loadSearchHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function SearchHistory({ onReplay }: { onReplay: (entry: SearchHistoryEntry) => void }) {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setHistory(loadSearchHistory());
  }, []);

  if (history.length === 0) return null;

  return (
    <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-7 py-4 text-left hover:bg-[#fffaf5] transition-colors"
      >
        <div className="flex items-center gap-2">
          <SectionLabel>Buscas recentes</SectionLabel>
        </div>
        <span className="text-sm text-[#8a7569]">{history.length} busca(s)</span>
      </button>
      {open && (
        <div className="px-7 pb-5 space-y-2">
          {history.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onReplay(entry)}
              className="w-full rounded-xl border border-[rgba(35,24,21,0.08)] bg-[#fffaf5] px-4 py-3 text-left hover:border-[#a04b2c] transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#231815]">{entry.icp}</p>
                <p className="text-[0.65rem] text-[#8a7569]">
                  {new Date(entry.timestamp).toLocaleString("pt-BR")}
                </p>
              </div>
              <p className="text-xs text-[#6c5a51] mt-1">
                {entry.niche} &middot; {entry.region}
                {entry.city ? `, ${entry.city}` : ""} &middot; {entry.sources.join(", ")} &middot;{" "}
                {entry.resultsCount} resultado(s)
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function exportResultsToCsv(results: ProspectResult[]) {
  const headers = [
    "Empresa",
    "Nicho",
    "Região",
    "Fonte",
    "Verba/mês",
    "Score",
    "Prioridade",
    "Trigger",
    "Contato",
    "URL",
  ];
  const rows = results.map((r) => [
    r.company,
    r.niche,
    r.region,
    r.source,
    r.monthlyBudget,
    String(r.score),
    r.priority,
    r.trigger,
    r.contact,
    r.sourceUrl ?? "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `prospects-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function MessagePreviewModal({
  leads,
  messages,
  onConfirm,
  onCancel,
  onEditMessage,
}: {
  leads: ProspectResult[];
  messages: Map<string, string>;
  onConfirm: () => void;
  onCancel: () => void;
  onEditMessage: (leadId: string, message: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl max-h-[80vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b border-[rgba(35,24,21,0.07)]">
          <div>
            <SectionLabel>Preview das mensagens</SectionLabel>
            <p className="text-sm text-[#8a7569]">{leads.length} lead(s) selecionado(s)</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#8a7569] hover:text-[#231815] text-xl"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-2xl border border-[rgba(35,24,21,0.07)] bg-[#fffaf5] p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-[#231815]">{lead.company}</p>
                <PriorityBadge priority={lead.priority} />
              </div>
              <textarea
                value={messages.get(lead.id) ?? ""}
                onChange={(e) => onEditMessage(lead.id, e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-[rgba(35,24,21,0.1)] bg-white px-4 py-3 text-sm text-[#231815] outline-none focus:border-[#a04b2c] focus:ring-2 focus:ring-[#a04b2c]/10 resize-none"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 px-7 py-4 border-t border-[rgba(35,24,21,0.07)]">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-[rgba(35,24,21,0.12)] px-5 py-2.5 text-sm font-semibold text-[#231815] hover:bg-[#fff5ec] transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-2xl bg-[#a04b2c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b55a38] transition"
          >
            Confirmar e enviar ao CRM
          </button>
        </div>
      </div>
    </div>
  );
}
