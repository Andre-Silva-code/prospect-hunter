"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import type { LeadPriority, LeadSource } from "@/types/prospecting";
import type { ProspectResult, SortDirection, SortField } from "./types";
import {
  ContactBadge,
  CrmProgressBar,
  EmptyState,
  PriorityBadge,
  SectionLabel,
  SkeletonRow,
  exportResultsToCsv,
} from "./ui";

const PRIORITY_ORDER: Record<LeadPriority, number> = { Alta: 3, Media: 2, Baixa: 1 };

function sortResults(
  results: ProspectResult[],
  field: SortField,
  direction: SortDirection
): ProspectResult[] {
  const sorted = [...results].sort((a, b) => {
    if (field === "score") return a.score - b.score;
    if (field === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (field === "company") return a.company.localeCompare(b.company);
    if (field === "source") return a.source.localeCompare(b.source);
    return 0;
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}

type ResultsTableProps = {
  results: ProspectResult[];
  searchedAt: string | null;
  isSearching: boolean;
  selectedLeadIds: string[];
  contactedLeadIds: string[];
  isSendingToCrm: boolean;
  crmProgress: { current: number; total: number };
  crmFeedback: string;
  crmContacts: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDirectProspect: (lead: ProspectResult) => void;
  onGmnAudit: (lead: ProspectResult) => void;
  onSendToCrm: () => void;
};

type FilterState = {
  source: LeadSource | "all";
  priority: LeadPriority | "all";
};

function SortableHeader({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentField === field;
  return (
    <th
      className="px-4 py-3.5 font-semibold whitespace-nowrap cursor-pointer select-none hover:text-[#a04b2c] transition-colors"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive && (
        <span className="ml-1 text-[#a04b2c]">{currentDirection === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );
}

function ExpandedRow({ prospect }: { prospect: ProspectResult }) {
  return (
    <tr className="bg-[#fffaf5]">
      <td colSpan={9} className="px-6 py-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[0.65rem] uppercase tracking-wider text-[#8a7569] mb-1">Trigger</p>
            <p className="text-sm text-[#3f312b] leading-relaxed">{prospect.trigger}</p>
          </div>
          <div>
            <p className="text-[0.65rem] uppercase tracking-wider text-[#8a7569] mb-1">Contato</p>
            <p className="text-sm text-[#3f312b] break-all">{prospect.contact}</p>
            <div className="mt-1">
              <ContactBadge contact={prospect.contact} />
            </div>
          </div>
          <div>
            <p className="text-[0.65rem] uppercase tracking-wider text-[#8a7569] mb-1">ICP</p>
            <p className="text-sm text-[#3f312b]">{prospect.icp}</p>
          </div>
          <div>
            <p className="text-[0.65rem] uppercase tracking-wider text-[#8a7569] mb-1">
              URL da fonte
            </p>
            {prospect.sourceUrl ? (
              <a
                href={prospect.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#a04b2c] hover:underline break-all"
              >
                {prospect.sourceUrl.length > 50
                  ? prospect.sourceUrl.slice(0, 50) + "..."
                  : prospect.sourceUrl}
              </a>
            ) : (
              <p className="text-sm text-gray-400">Indisponível</p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function ResultsTable({
  results,
  searchedAt,
  isSearching,
  selectedLeadIds,
  contactedLeadIds,
  isSendingToCrm,
  crmProgress,
  crmFeedback,
  crmContacts,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onDirectProspect,
  onGmnAudit,
  onSendToCrm,
}: ResultsTableProps) {
  const isInCrm = (prospect: ProspectResult) =>
    crmContacts.has(prospect.contact?.trim().toLowerCase()) ||
    crmContacts.has(prospect.company?.trim().toLowerCase());
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filters, setFilters] = useState<FilterState>({ source: "all", priority: "all" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = results;
    if (filters.source !== "all") {
      filtered = filtered.filter((r) => r.source === filters.source);
    }
    if (filters.priority !== "all") {
      filtered = filtered.filter((r) => r.priority === filters.priority);
    }
    return sortResults(filtered, sortField, sortDirection);
  }, [results, filters, sortField, sortDirection]);

  const allVisibleSelected =
    filteredAndSorted.length > 0 && filteredAndSorted.every((r) => selectedLeadIds.includes(r.id));

  const uniqueSources = [...new Set(results.map((r) => r.source))];

  if (!searchedAt && !isSearching) {
    return (
      <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] shadow-sm">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-7 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
        <div>
          <SectionLabel>Lista de oportunidades</SectionLabel>
          <h2 className="text-xl font-semibold text-[#231815]">Resultado da busca</h2>
          <p className="text-xs text-[#8a7569] mt-1">
            {searchedAt && (
              <>
                <span className="font-semibold text-[#a04b2c]">{filteredAndSorted.length}</span>
                {filteredAndSorted.length !== results.length && (
                  <span className="text-[#8a7569]"> de {results.length}</span>
                )}
                {" oportunidade(s) "}
                &middot; Atualizado em {new Date(searchedAt).toLocaleString("pt-BR")}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSendToCrm}
            disabled={isSendingToCrm || selectedLeadIds.length === 0}
            className="inline-flex items-center justify-center rounded-2xl bg-[#a04b2c] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#b55a38] disabled:opacity-60"
          >
            {isSendingToCrm
              ? "Enviando..."
              : `Enviar ${selectedLeadIds.length} selecionado(s) para o CRM`}
          </button>
          {results.length > 0 && (
            <button
              type="button"
              onClick={() => exportResultsToCsv(filteredAndSorted)}
              className="inline-flex items-center justify-center rounded-2xl border border-[rgba(35,24,21,0.12)] px-4 py-2.5 text-xs font-semibold text-[#231815] transition hover:bg-[#fff5ec]"
            >
              Exportar CSV
            </button>
          )}
          <Link
            href="/crm"
            className="inline-flex items-center justify-center rounded-2xl border border-[rgba(35,24,21,0.12)] px-4 py-2.5 text-xs font-semibold text-[#231815] transition hover:bg-[#fff5ec]"
          >
            Abrir CRM
          </Link>
        </div>
      </div>

      {isSendingToCrm && crmProgress.total > 0 && (
        <CrmProgressBar current={crmProgress.current} total={crmProgress.total} />
      )}
      {crmFeedback && !isSendingToCrm && (
        <p className="mb-4 text-sm text-[#2a8a50]">{crmFeedback}</p>
      )}

      {results.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            type="button"
            onClick={allVisibleSelected ? onDeselectAll : onSelectAll}
            className="text-xs font-semibold text-[#a04b2c] hover:underline"
          >
            {allVisibleSelected ? "Desmarcar todos" : "Selecionar todos"}
          </button>

          <div className="h-4 w-px bg-[rgba(35,24,21,0.12)]" />

          <select
            value={filters.source}
            onChange={(e) =>
              setFilters((f) => ({ ...f, source: e.target.value as LeadSource | "all" }))
            }
            className="rounded-xl border border-[rgba(35,24,21,0.1)] bg-[#fffaf5] px-3 py-1.5 text-xs text-[#231815] outline-none"
          >
            <option value="all">Todas as fontes</option>
            {uniqueSources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                priority: e.target.value as LeadPriority | "all",
              }))
            }
            className="rounded-xl border border-[rgba(35,24,21,0.1)] bg-[#fffaf5] px-3 py-1.5 text-xs text-[#231815] outline-none"
          >
            <option value="all">Todas as prioridades</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baixa">Baixa</option>
          </select>

          <p className="text-[0.65rem] text-[#8a7569] ml-auto">Clique na linha para ver detalhes</p>
        </div>
      )}

      <div className="overflow-auto rounded-2xl border border-[rgba(35,24,21,0.07)]">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-[#fafaf8] text-[0.65rem] uppercase tracking-wider text-[#8a7569]">
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Sel.</th>
              <SortableHeader
                label="Empresa"
                field="company"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Nicho</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Região</th>
              <SortableHeader
                label="Fonte"
                field="source"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Verba/mês</th>
              <SortableHeader
                label="Score"
                field="score"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Prioridade"
                field="priority"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Ação</th>
            </tr>
          </thead>
          <tbody>
            {isSearching && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}

            {!isSearching &&
              filteredAndSorted.map((prospect, index) => (
                <React.Fragment key={prospect.id}>
                  <tr
                    className={`border-t border-[rgba(35,24,21,0.06)] text-[#3f312b] hover:bg-[#fffaf5] transition-colors cursor-pointer ${
                      index % 2 === 0 ? "" : "bg-[#fafaf8]/50"
                    } ${expandedId === prospect.id ? "bg-[#fffaf5]" : ""}`}
                    onClick={() =>
                      setExpandedId((cur) => (cur === prospect.id ? null : prospect.id))
                    }
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(prospect.id)}
                        onChange={() => onToggleSelection(prospect.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {prospect.company}
                        {isInCrm(prospect) && (
                          <span className="inline-flex items-center rounded-full bg-[#2a8a50]/10 border border-[#2a8a50]/20 px-2 py-0.5 text-[10px] font-semibold text-[#2a8a50] whitespace-nowrap">
                            No CRM
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#655248]">{prospect.niche}</td>
                    <td className="px-4 py-3 text-[#655248] whitespace-nowrap">
                      {prospect.region}
                    </td>
                    <td className="px-4 py-3 text-[#655248] whitespace-nowrap">
                      {prospect.source}
                    </td>
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
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onDirectProspect(prospect)}
                          className="inline-flex items-center justify-center rounded-xl border border-[rgba(35,24,21,0.12)] px-3 py-2 text-xs font-semibold text-[#231815] transition hover:bg-[#fff5ec]"
                        >
                          {contactedLeadIds.includes(prospect.id)
                            ? "Contato iniciado"
                            : "Prospectar agora"}
                        </button>
                        {prospect.source === "Google Meu Negócio" && (
                          <button
                            type="button"
                            onClick={() => onGmnAudit(prospect)}
                            disabled={isInCrm(prospect)}
                            className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                              isInCrm(prospect)
                                ? "border-[rgba(35,24,21,0.08)] bg-[rgba(35,24,21,0.03)] text-[#b8a99f] cursor-not-allowed"
                                : "border-[#2a8a50]/30 bg-[#2a8a50]/5 text-[#2a8a50] hover:bg-[#2a8a50]/10"
                            }`}
                            title={
                              isInCrm(prospect)
                                ? "Lead já está no CRM"
                                : "Oferecer análise gratuita do perfil GMN via GBP Check"
                            }
                          >
                            {isInCrm(prospect) ? "Já no CRM" : "Oferecer Análise"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === prospect.id && <ExpandedRow prospect={prospect} />}
                </React.Fragment>
              ))}

            {!isSearching && filteredAndSorted.length === 0 && results.length > 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-[#7d6a60]" colSpan={9}>
                  Nenhum resultado com os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
