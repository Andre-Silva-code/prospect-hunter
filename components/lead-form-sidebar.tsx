"use client";

import React from "react";

import type { UseLeadsReturn } from "@/hooks/use-leads";
import type { IcpProfile, LeadFormValues, LeadSource } from "@/types/prospecting";

const prospectingSources: LeadSource[] = [
  "Instagram",
  "LinkedIn",
  "Google Maps",
  "Google Meu Negócio",
];
const icpProfiles: IcpProfile[] = [
  "Clinicas esteticas premium",
  "Infoprodutores locais",
  "Escritorios de advocacia nichados",
];

function SidebarInputField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: keyof LeadFormValues;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}): React.ReactElement {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
        {label}
      </span>
      <input
        required
        name={name}
        value={value}
        onChange={onChange}
        className="rounded-xl border border-white/[0.09] bg-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#a04b2c] focus:bg-white/[0.10] focus:ring-1 focus:ring-[#a04b2c]/40"
      />
    </label>
  );
}

function SidebarTextAreaField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: keyof LeadFormValues;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}): React.ReactElement {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
        {label}
      </span>
      <textarea
        required
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        className="resize-none rounded-xl border border-white/[0.09] bg-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#a04b2c] focus:bg-white/[0.10] focus:ring-1 focus:ring-[#a04b2c]/40"
      />
    </label>
  );
}

export function LeadFormSidebar({
  userName,
  hook,
}: {
  userName: string;
  hook: UseLeadsReturn;
}): React.ReactElement {
  return (
    <aside className="flex flex-col gap-0 rounded-3xl bg-[#1c1410] p-0 overflow-hidden shadow-[0_8px_40px_rgba(28,20,16,0.22)]">
      <div className="px-7 pt-8 pb-6 border-b border-white/[0.07]">
        <span className="inline-block rounded-full bg-[#a04b2c]/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d4845e]">
          Plataforma de prospecção
        </span>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white leading-snug">
          Escolha ICP, fontes e alimente o CRM com leads prontos para conversão.
        </h2>
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-white/[0.06] px-4 py-3">
          <div className="h-7 w-7 rounded-full bg-[#a04b2c] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
              Operador ativo
            </p>
            <p className="text-sm font-semibold text-white">{userName}</p>
          </div>
        </div>
      </div>

      <form className="flex flex-col gap-0 flex-1 px-7 py-6" onSubmit={hook.handleSubmit}>
        <div className="grid gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
              ICP alvo
            </span>
            <select
              value={hook.icpFilter}
              onChange={hook.handleIcpChange}
              className="rounded-xl border border-white/[0.09] bg-white/[0.07] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#a04b2c] focus:bg-white/[0.10] focus:ring-1 focus:ring-[#a04b2c]/40"
            >
              {icpProfiles.map((profile) => (
                <option key={profile} value={profile} className="text-[#231815]">
                  {profile}
                </option>
              ))}
            </select>
          </label>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
              Fontes de prospecção
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {prospectingSources.map((source) => {
                const active = hook.selectedSources.includes(source);
                return (
                  <button
                    key={source}
                    type="button"
                    onClick={() => hook.toggleSource(source)}
                    className={`rounded-xl border px-2.5 py-2 text-[11px] font-semibold transition ${
                      active
                        ? "border-[#d4845e] bg-[#a04b2c]/20 text-[#f8d8c4]"
                        : "border-white/[0.09] bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                    }`}
                  >
                    {source}
                  </button>
                );
              })}
            </div>
          </div>
          <SidebarInputField
            label="Empresa"
            name="company"
            value={hook.formValues.company}
            onChange={hook.handleChange}
          />
          <SidebarInputField
            label="Nicho"
            name="niche"
            value={hook.formValues.niche}
            onChange={hook.handleChange}
          />
          <div className="grid grid-cols-2 gap-3">
            <SidebarInputField
              label="Região"
              name="region"
              value={hook.formValues.region}
              onChange={hook.handleChange}
            />
            <SidebarInputField
              label="Verba mensal"
              name="monthlyBudget"
              value={hook.formValues.monthlyBudget}
              onChange={hook.handleChange}
            />
          </div>
          <SidebarInputField
            label="Contato"
            name="contact"
            value={hook.formValues.contact}
            onChange={hook.handleChange}
          />
          <SidebarTextAreaField
            label="Gatilho de abordagem"
            name="trigger"
            value={hook.formValues.trigger}
            onChange={hook.handleChange}
          />
        </div>

        <button
          type="button"
          onClick={hook.generateProspectsFromSources}
          className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-[#d4845e]/40 bg-[#ffffff14] px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f6c8ab] transition hover:bg-[#ffffff22]"
        >
          Buscar leads nas fontes
        </button>

        <button
          type="submit"
          className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-[#a04b2c] px-5 py-4 text-sm font-semibold tracking-wide text-white transition hover:bg-[#b55a38] active:scale-[0.98]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar lead
        </button>
      </form>
    </aside>
  );
}
