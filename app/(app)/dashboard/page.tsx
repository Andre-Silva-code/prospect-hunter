import React from "react";
import { kpis, channelPlan } from "@/lib/prospecting-data";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a04b2c] mb-3">
      {children}
    </p>
  );
}

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <SectionLabel>Visão geral</SectionLabel>
        <h1 className="text-2xl font-semibold text-[#231815]">Dashboard</h1>
        <p className="text-sm text-[#8a7569] mt-1">
          Acompanhe os principais indicadores da sua prospecção.
        </p>
      </div>

      {/* Hero card com KPIs */}
      <div className="rounded-3xl bg-[#1c1410] p-8 lg:p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(160,75,44,0.3),transparent_55%)]" />
        <div className="relative z-10">
          <SectionLabel>Sistema de prospecção · Agência de tráfego pago</SectionLabel>
          <h2 className="mt-2 text-2xl lg:text-3xl font-semibold text-[#f8efe4] leading-tight">
            Pipeline enxuto para encontrar, qualificar e abordar clientes.
          </h2>
          <p className="mt-4 text-[#c4a898] text-base leading-relaxed max-w-2xl">
            ICPs prioritários, score de qualificação, cadência multicanal e quadro de oportunidades
            — tudo num só lugar.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-5"
              >
                <p className="text-xs text-[#a08a80] uppercase tracking-wider">{kpi.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#f8efe4]">{kpi.value}</p>
                <p className="mt-1 text-xs text-[#7a6258]">{kpi.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operação diária */}
      <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-7 shadow-sm">
        <SectionLabel>Operação diária</SectionLabel>
        <h2 className="text-xl font-semibold text-[#231815] mb-6">Rotina de prospecção</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              time: "08:00 – 09:00",
              title: "Mapear 20 contas",
              desc: "Anúncios ativos, biblioteca, prova social e oferta principal.",
              color: "bg-[rgba(160,75,44,0.07)] border-[rgba(160,75,44,0.12)]",
              timeColor: "text-[#a04b2c]",
            },
            {
              time: "09:00 – 11:00",
              title: "Contato personalizado",
              desc: "Personalizar abertura com base no gargalo visível no perfil.",
              color: "bg-[rgba(35,24,21,0.04)] border-[rgba(35,24,21,0.08)]",
              timeColor: "text-[#6d584b]",
            },
            {
              time: "14:00 – 15:00",
              title: "Follow-up e CRM",
              desc: "Registrar objeções, ajustar score e mover para próxima ação.",
              color: "bg-[rgba(36,59,48,0.07)] border-[rgba(36,59,48,0.12)]",
              timeColor: "text-[#2f5444]",
            },
            {
              time: "17:00 – 17:30",
              title: "Revisão dos números",
              desc: "Respostas, reuniões, CPL e aprendizados para refinar o pitch.",
              color: "bg-[rgba(237,177,70,0.08)] border-[rgba(237,177,70,0.2)]",
              timeColor: "text-[#8f6304]",
            },
          ].map((op) => (
            <div key={op.title} className={`rounded-2xl border p-5 ${op.color}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${op.timeColor}`}>
                {op.time}
              </p>
              <p className="mt-2 font-semibold text-[#231815]">{op.title}</p>
              <p className="mt-1.5 text-sm text-[#655248] leading-relaxed">{op.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Canais */}
      <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-7 shadow-sm">
        <SectionLabel>Cadência multicanal</SectionLabel>
        <h2 className="text-xl font-semibold text-[#231815] mb-6">Contato estratégico por canal</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {channelPlan.map((item) => (
            <div
              key={item.channel}
              className="rounded-2xl border border-[rgba(35,24,21,0.07)] bg-[#fafaf8] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[#231815]">{item.channel}</h3>
                <span className="rounded-full bg-[rgba(35,24,21,0.06)] px-3 py-1 text-[0.65rem] uppercase tracking-wider text-[#6d584b] font-semibold whitespace-nowrap">
                  {item.cadence}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#655248] leading-relaxed">{item.goal}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
