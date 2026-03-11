import React from "react";
import { channelPlan, icpSegments, kpis, outreachSteps, prospects } from "@/lib/prospecting-data";
import { ProspectingWorkspace } from "@/components/prospecting-workspace";
import { LogoutButton } from "@/components/logout-button";
import type { SessionUser } from "@/lib/auth-session";

function PriorityBadge({ priority }: { priority: "Alta" | "Media" | "Baixa" }): React.ReactElement {
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

function SectionLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a04b2c] mb-3">
      {children}
    </p>
  );
}

export function ProspectingDashboard({
  sessionUser,
}: {
  sessionUser: SessionUser;
}): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#f4eadf]">
      {/* Top navbar */}
      <header className="sticky top-0 z-30 bg-[#f4eadf]/90 backdrop-blur border-b border-[rgba(35,24,21,0.08)]">
        <div className="mx-auto max-w-8xl px-6 lg:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#a04b2c]">
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 2L15 6V12L9 16L3 12V6L9 2Z"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="9" r="2" fill="white" />
              </svg>
            </div>
            <span className="font-semibold text-[#231815] text-sm tracking-tight">
              Prospect Hunter
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-xs text-[#8a7569]">{sessionUser.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-8xl px-6 lg:px-10 py-10 space-y-8">
        {/* Hero + KPIs */}
        <section className="grid gap-6 xl:grid-cols-[1fr_340px] animate-fade-up">
          {/* Hero card */}
          <div className="rounded-3xl bg-[#1c1410] p-8 lg:p-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(160,75,44,0.3),transparent_55%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(246,179,125,0.3)] to-transparent" />
            <div className="relative z-10">
              <SectionLabel>Sistema de prospecção · Agência de tráfego pago</SectionLabel>
              <h1 className="mt-2 text-3xl lg:text-4xl xl:text-[2.6rem] font-semibold text-[#f8efe4] leading-[1.1]">
                Pipeline enxuto para encontrar, qualificar e abordar clientes.
              </h1>
              <p className="mt-4 text-[#c4a898] text-base lg:text-lg leading-relaxed max-w-2xl">
                ICPs prioritários, score de qualificação, cadência multicanal e quadro de
                oportunidades — tudo num só lugar.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => (
                  <div key={kpi.label} className="rounded-2xl bg-white/6 border border-white/8 p-5">
                    <p className="text-xs text-[#a08a80] uppercase tracking-wider">{kpi.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[#f8efe4]">{kpi.value}</p>
                    <p className="mt-1 text-xs text-[#7a6258]">{kpi.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Qualification rules */}
          <div className="rounded-3xl bg-[#243b30] p-7 lg:p-8 text-[#edf3ef] flex flex-col justify-between">
            <div>
              <SectionLabel>Regra de qualificação</SectionLabel>
              <div className="space-y-3">
                {[
                  {
                    label: "Sinais de compra",
                    value: "Anúncios ativos + oferta clara + equipe comercial",
                  },
                  {
                    label: "Despriorize quem",
                    value: "Não valida produto ou depende só de indicação",
                  },
                  { label: "Pitch base", value: "Diagnóstico de funil, criativos e CAC em 15 min" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-white/6 border border-white/8 p-4"
                  >
                    <p className="text-xs text-[#b7d3c6] uppercase tracking-wider">{item.label}</p>
                    <p className="mt-1.5 text-sm font-medium text-[#edf3ef] leading-relaxed">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ICP + Cadência */}
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] animate-fade-up-1">
          {/* ICP Segments */}
          <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-7 lg:p-8 shadow-sm">
            <SectionLabel>ICP e oferta</SectionLabel>
            <h2 className="text-2xl font-semibold text-[#231815]">
              Priorize nichos com verba e urgência visíveis no perfil.
            </h2>
            <div className="mt-6 space-y-3">
              {icpSegments.map((seg) => (
                <div
                  key={seg.title}
                  className="rounded-2xl border border-[rgba(35,24,21,0.07)] bg-[#fffaf5] p-5 grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-start card-hover"
                >
                  <div>
                    <p className="font-semibold text-[#231815]">{seg.title}</p>
                    <p className="mt-1.5 text-sm text-[#655248] leading-relaxed">{seg.pain}</p>
                  </div>
                  <p className="text-sm text-[#655248] leading-relaxed">{seg.offer}</p>
                  <div className="rounded-xl bg-[rgba(160,75,44,0.08)] border border-[rgba(160,75,44,0.12)] p-3 text-center min-w-[80px]">
                    <p className="text-[0.65rem] uppercase tracking-wider text-[#a04b2c] font-semibold">
                      CPL alvo
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[#231815]">{seg.cpl}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cadência */}
          <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-7 lg:p-8 shadow-sm">
            <SectionLabel>Cadência multicanal</SectionLabel>
            <h2 className="text-2xl font-semibold text-[#231815]">
              Contato estratégico sem parecer spam.
            </h2>
            <div className="mt-6 space-y-3">
              {channelPlan.map((item) => (
                <div
                  key={item.channel}
                  className="rounded-2xl border border-[rgba(35,24,21,0.07)] bg-[#fafaf8] p-5 card-hover"
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
        </section>

        {/* Prospect table */}
        <section className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-7 lg:p-8 shadow-sm animate-fade-up-2">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between mb-6">
            <div>
              <SectionLabel>Lista de oportunidades</SectionLabel>
              <h2 className="text-2xl font-semibold text-[#231815]">
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
                  {[
                    "Empresa",
                    "Nicho",
                    "Região",
                    "Verba/mês",
                    "Score",
                    "Prioridade",
                    "Gatilho",
                  ].map((col) => (
                    <th key={col} className="px-5 py-3.5 font-semibold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prospects.map((p, i) => (
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
        </section>

        {/* Outreach + Daily ops */}
        <section className="grid gap-6 lg:grid-cols-2 animate-fade-up-3">
          {/* Outreach steps */}
          <div className="rounded-3xl bg-[#243b30] p-7 lg:p-8 text-[#edf3ef]">
            <SectionLabel>Sequência de abordagem</SectionLabel>
            <div className="space-y-3">
              {outreachSteps.map((step) => (
                <div key={step.day} className="rounded-2xl border border-white/8 bg-white/5 p-5">
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

          {/* Daily ops */}
          <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-7 lg:p-8 shadow-sm">
            <SectionLabel>Operação diária</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2 h-full">
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
        </section>

        {/* CRM Workspace */}
        <section className="animate-fade-up-4">
          <div className="mb-4">
            <SectionLabel>CRM e Pipeline</SectionLabel>
            <h2 className="text-2xl font-semibold text-[#231815]">Gerencie leads em tempo real.</h2>
          </div>
          <ProspectingWorkspace sessionUser={sessionUser} />
        </section>
      </main>
    </div>
  );
}
