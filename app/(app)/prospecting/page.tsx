import React from "react";
import { prospects } from "@/lib/prospecting-data";
import type { Prospect } from "@/lib/prospecting-data";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a04b2c] mb-3">
      {children}
    </p>
  );
}

function PriorityBadge({ priority }: { priority: "Alta" | "Media" | "Baixa" }) {
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

const CHANNELS = [
  {
    id: "google",
    label: "Google Maps",
    desc: "Empresas locais com presença digital fraca. Alta conversão para tráfego pago.",
    status: "Ativo",
    statusColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
    icon: "🌐",
  },
  {
    id: "instagram",
    label: "Instagram",
    desc: "Negócios com perfil comercial. Identifique oportunidades pelo engajamento.",
    status: "Em breve",
    statusColor: "bg-amber-50 text-amber-700 border-amber-100",
    icon: "📸",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    desc: "Decisores B2B. Alcance CEOs, diretores e gerentes de marketing.",
    status: "Em breve",
    statusColor: "bg-amber-50 text-amber-700 border-amber-100",
    icon: "💼",
  },
];

export default function ProspectingPage() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <SectionLabel>Prospecção multicanal</SectionLabel>
        <h1 className="text-2xl font-semibold text-[#231815]">Canais de Prospecção</h1>
        <p className="text-sm text-[#8a7569] mt-1">
          Encontre leads qualificados nos principais canais.
        </p>
      </div>

      {/* Channel cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {CHANNELS.map((ch) => (
          <div
            key={ch.id}
            className="rounded-2xl bg-white border border-[rgba(35,24,21,0.07)] p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-2xl">{ch.icon}</span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${ch.statusColor}`}
              >
                {ch.status}
              </span>
            </div>
            <h3 className="font-semibold text-[#231815] mb-2">{ch.label}</h3>
            <p className="text-sm text-[#655248] leading-relaxed">{ch.desc}</p>
          </div>
        ))}
      </div>

      {/* Prospect table */}
      <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between mb-6">
          <div>
            <SectionLabel>Lista de oportunidades</SectionLabel>
            <h2 className="text-xl font-semibold text-[#231815]">
              Prospecte pelo sinal, não pelo volume.
            </h2>
          </div>
          <p className="text-xs text-[#8a7569] max-w-xs leading-relaxed">
            Score: verba (30) · oferta (25) · conteúdo (20) · prova social (15) · velocidade (10)
          </p>
        </div>
        <div className="overflow-auto rounded-2xl border border-[rgba(35,24,21,0.07)]">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-[#fafaf8] text-[0.65rem] uppercase tracking-wider text-[#8a7569]">
                {["Empresa", "Nicho", "Região", "Verba/mês", "Score", "Prioridade", "Gatilho"].map(
                  (col) => (
                    <th key={col} className="px-5 py-3.5 font-semibold whitespace-nowrap">
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {prospects.map((p: Prospect, i: number) => (
                <tr
                  key={p.company}
                  className={`border-t border-[rgba(35,24,21,0.06)] text-[#3f312b] hover:bg-[#fffaf5] transition-colors ${i % 2 === 0 ? "" : "bg-[#fafaf8]/50"}`}
                >
                  <td className="px-5 py-4 font-semibold whitespace-nowrap">{p.company}</td>
                  <td className="px-5 py-4 text-[#655248]">{p.niche}</td>
                  <td className="px-5 py-4 text-[#655248] whitespace-nowrap">{p.region}</td>
                  <td className="px-5 py-4 font-semibold text-[#a04b2c] whitespace-nowrap">
                    {p.monthlyBudget}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[rgba(35,24,21,0.06)] font-bold text-[#231815]">
                      {p.score}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <PriorityBadge priority={p.priority} />
                  </td>
                  <td className="px-5 py-4 text-[#655248] max-w-[200px]">{p.trigger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
