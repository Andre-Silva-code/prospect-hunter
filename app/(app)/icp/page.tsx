import React from "react";
import { icpSegments, outreachSteps } from "@/lib/prospecting-data";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a04b2c] mb-3">
      {children}
    </p>
  );
}

export default function IcpPage() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <SectionLabel>Perfil de cliente ideal</SectionLabel>
        <h1 className="text-2xl font-semibold text-[#231815]">ICP & Abordagem</h1>
        <p className="text-sm text-[#8a7569] mt-1">
          Defina seus ICPs e elabore mensagens estratégicas por score.
        </p>
      </div>

      {/* ICP Segments */}
      <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-7 shadow-sm">
        <SectionLabel>ICP e oferta</SectionLabel>
        <h2 className="text-xl font-semibold text-[#231815] mb-6">
          Priorize nichos com verba e urgência visíveis no perfil.
        </h2>
        <div className="space-y-3">
          {icpSegments.map((seg) => (
            <div
              key={seg.title}
              className="rounded-2xl border border-[rgba(35,24,21,0.07)] bg-[#fffaf5] p-5 grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-start"
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

      {/* Score explanation */}
      <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-7 shadow-sm">
        <SectionLabel>Sistema de score</SectionLabel>
        <h2 className="text-xl font-semibold text-[#231815] mb-6">Como o score é calculado</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Verba mensal", weight: "30pts", desc: "≥R$10k = 30pts, ≥R$5k = 20pts" },
            {
              label: "Oferta/gatilho",
              weight: "20pts",
              desc: "Palavras-chave de urgência digital",
            },
            { label: "Canal de contato", weight: "10pts", desc: "Instagram, WhatsApp, CRM" },
            { label: "Nicho premium", weight: "10pts", desc: "Clínica, advocacia, high ticket" },
            { label: "Base", weight: "30pts", desc: "Score mínimo de qualquer lead" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[rgba(35,24,21,0.07)] bg-[#fafaf8] p-4 text-center"
            >
              <p className="text-lg font-bold text-[#a04b2c]">{item.weight}</p>
              <p className="text-sm font-semibold text-[#231815] mt-1">{item.label}</p>
              <p className="text-xs text-[#8a7569] mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Alta Prioridade",
              range: "Score ≥ 80",
              color: "bg-red-50 border-red-100 text-red-700",
            },
            {
              label: "Média Prioridade",
              range: "Score 60–79",
              color: "bg-amber-50 border-amber-100 text-amber-700",
            },
            {
              label: "Baixa Prioridade",
              range: "Score < 60",
              color: "bg-emerald-50 border-emerald-100 text-emerald-700",
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border px-4 py-3 flex items-center justify-between ${item.color}`}
            >
              <span className="font-semibold text-sm">{item.label}</span>
              <span className="text-xs font-medium">{item.range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Outreach steps */}
      <div className="rounded-3xl bg-[#243b30] p-7 text-[#edf3ef]">
        <SectionLabel>Sequência de abordagem</SectionLabel>
        <h2 className="text-xl font-semibold text-[#edf3ef] mb-6">
          Cadência multicanal sem parecer spam
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {outreachSteps.map((step) => (
            <div
              key={step.day}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-5"
            >
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
    </div>
  );
}
