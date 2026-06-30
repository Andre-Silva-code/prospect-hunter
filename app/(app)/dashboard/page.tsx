import React from "react";
import { channelPlan } from "@/lib/prospecting-data";
import AnalyticsCards from "@/components/analytics-cards";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-[#a04b2c]">{children}</p>
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
      <div className="relative overflow-hidden rounded-[20px] bg-[#1c1410] p-7 lg:p-9">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4845e]/50 to-transparent" />
        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
          <div>
            <SectionLabel>Sistema de prospecção · Agência de tráfego pago</SectionLabel>
            <h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[#f8efe4] lg:text-3xl">
              Pipeline enxuto para encontrar, qualificar e abordar clientes.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#c4a898]">
              ICPs prioritários, score de qualificação, cadência multicanal e quadro de
              oportunidades, tudo num só lugar.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-5">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-[#d4845e]">
              Operação em foco
            </p>
            <div className="mt-4 grid gap-3">
              {[
                ["Prioridade", "Score alto e follow-up atrasado primeiro"],
                ["Cadência", "Próxima ação sempre visível no CRM"],
                ["Qualificação", "Verba, nicho e gatilho em uma leitura rápida"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 border-t border-white/[0.07] pt-3 first:border-t-0 first:pt-0"
                >
                  <span className="text-xs font-semibold text-[#f8efe4]">{label}</span>
                  <span className="max-w-[220px] text-right text-xs leading-relaxed text-[#c4a898]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="xl:col-span-2">
            <AnalyticsCards />
          </div>
        </div>
      </div>

      {/* Operação diária */}
      <div className="rounded-[20px] border border-[rgba(35,24,21,0.07)] bg-white p-6 shadow-[0_1px_2px_rgba(35,24,21,0.04)]">
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
              <p className={`text-xs font-semibold tracking-[0.04em] ${op.timeColor}`}>{op.time}</p>
              <p className="mt-2 font-semibold text-[#231815]">{op.title}</p>
              <p className="mt-1.5 text-sm text-[#655248] leading-relaxed">{op.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Canais */}
      <div className="rounded-[20px] border border-[rgba(35,24,21,0.07)] bg-white p-6 shadow-[0_1px_2px_rgba(35,24,21,0.04)]">
        <SectionLabel>Cadência multicanal</SectionLabel>
        <h2 className="text-xl font-semibold text-[#231815] mb-6">Contato estratégico por canal</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {channelPlan.map((item) => (
            <div
              key={item.channel}
              className="rounded-2xl border border-[rgba(35,24,21,0.07)] bg-[#fffaf5] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[#231815]">{item.channel}</h3>
                <span className="whitespace-nowrap rounded-full bg-[rgba(35,24,21,0.06)] px-3 py-1 text-[0.65rem] font-semibold tracking-[0.04em] text-[#6d584b]">
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
