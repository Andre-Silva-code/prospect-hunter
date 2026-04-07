"use client";

import React, { useEffect, useState } from "react";
import type { DashboardMetrics } from "@/lib/analytics";

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

type KpiCard = {
  label: string;
  value: string;
  detail: string;
};

function metricsToKpis(metrics: DashboardMetrics): KpiCard[] {
  return [
    {
      label: "Total de leads",
      value: String(metrics.totalLeads),
      detail: `${metrics.leadsThisWeek} novos esta semana`,
    },
    {
      label: "Taxa de resposta",
      value: formatPercent(metrics.responseRate),
      detail: `${metrics.contactedThisWeek} contatados esta semana`,
    },
    {
      label: "Taxa de conversão",
      value: formatPercent(metrics.conversionRate),
      detail: `${metrics.leadsByStage["Fechado"] ?? 0} fechados`,
    },
    {
      label: "Follow-ups pendentes",
      value: String(metrics.followUpsOverdue + metrics.followUpsPending),
      detail:
        metrics.followUpsOverdue > 0 ? `${metrics.followUpsOverdue} atrasado(s)` : "Tudo em dia",
    },
  ];
}

const fallbackKpis: KpiCard[] = [];

function KpiSkeleton() {
  return (
    <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-5 animate-pulse">
      <div className="h-3 w-24 rounded bg-white/10 mb-3" />
      <div className="h-7 w-16 rounded bg-white/15 mb-2" />
      <div className="h-2.5 w-32 rounded bg-white/8" />
    </div>
  );
}

export default function AnalyticsCards() {
  const [kpis, setKpis] = useState<KpiCard[]>(fallbackKpis);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch analytics");
        return res.json() as Promise<DashboardMetrics>;
      })
      .then((metrics) => {
        setKpis(metricsToKpis(metrics));
        setLoading(false);
      })
      .catch(() => {
        setKpis([
          { label: "Total de leads", value: "0", detail: "Nenhum lead cadastrado ainda" },
          { label: "Taxa de resposta", value: "0%", detail: "Comece a prospectar" },
          { label: "Taxa de conversão", value: "0%", detail: "Nenhum fechamento ainda" },
          { label: "Follow-ups pendentes", value: "0", detail: "Nada agendado" },
        ]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {loading
        ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        : kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-5 transition hover:bg-white/[0.09]"
            >
              <p className="text-xs text-[#a08a80] uppercase tracking-wider">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#f8efe4]">{kpi.value}</p>
              <p className="mt-1 text-xs text-[#9a8278]">{kpi.detail}</p>
            </div>
          ))}
    </div>
  );
}
