import React from "react";

import {
  IconUsers,
  IconClock,
  IconSend,
  IconReply,
  IconCheck,
  IconPercent,
  IconSearch,
} from "@/components/icons";
import type { LeadPriority } from "@/types/prospecting";

type Metrics = {
  total: number;
  pending: number;
  sent: number;
  replied: number;
  won: number;
  lost: number;
  responseRate: number;
};

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

export function MetricsSection({ metrics }: { metrics: Metrics }): React.ReactElement {
  return (
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
  );
}

export function FilterBar({
  search,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  priorityFilter: LeadPriority | "Todas";
  onPriorityChange: (v: LeadPriority | "Todas") => void;
}): React.ReactElement {
  return (
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
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Empresa, nicho, contato..."
                className="w-full rounded-2xl border border-[rgba(35,24,21,0.1)] bg-[#fffaf5] py-2.5 pl-9 pr-4 text-sm text-[#231815] outline-none transition focus:border-[#a04b2c] focus:ring-2 focus:ring-[#a04b2c]/10"
              />
            </div>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#6c5a51]">
            Prioridade
            <select
              value={priorityFilter}
              onChange={(event) => onPriorityChange(event.target.value as LeadPriority | "Todas")}
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
  );
}
