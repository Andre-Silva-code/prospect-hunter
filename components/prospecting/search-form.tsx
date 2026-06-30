"use client";

import React from "react";

import type { LeadSource } from "@/types/prospecting";
import { BRAZILIAN_STATES, ICP_OPTIONS, SOURCE_CHANNELS } from "./constants";
import type { IcpOption } from "./types";
import { SectionLabel } from "./ui";

type SearchFormProps = {
  selectedIcp: IcpOption;
  selectedSources: LeadSource[];
  niche: string;
  region: string;
  city: string;
  limitPerSource: number;
  isSearching: boolean;
  onIcpChange: (value: string) => void;
  onToggleSource: (source: LeadSource) => void;
  onNicheChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onSearch: () => void;
};

export default function SearchForm({
  selectedIcp,
  selectedSources,
  niche,
  region,
  city,
  limitPerSource,
  isSearching,
  onIcpChange,
  onToggleSource,
  onNicheChange,
  onRegionChange,
  onCityChange,
  onLimitChange,
  onSearch,
}: SearchFormProps) {
  const handleIcpChange = (value: string) => {
    onIcpChange(value);
    const icp = ICP_OPTIONS.find((o) => o.value === value);
    if (icp) {
      onNicheChange(icp.niche);
      onRegionChange(icp.region);
      onCityChange("");
    }
  };

  const inputClass =
    "rounded-xl border border-[rgba(35,24,21,0.1)] bg-[#fffaf5] px-4 py-2.5 text-sm text-[#231815] outline-none transition focus:border-[#a04b2c] focus:ring-2 focus:ring-[#a04b2c]/10";

  return (
    <div className="rounded-[20px] border border-[rgba(35,24,21,0.07)] bg-white p-6 shadow-[0_1px_2px_rgba(35,24,21,0.04)]">
      <div className="mb-5 flex flex-col gap-3 border-b border-[rgba(35,24,21,0.07)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <SectionLabel>Configurar busca</SectionLabel>
          <h2 className="text-xl font-semibold text-[#231815]">Parâmetros da prospecção</h2>
          <p className="mt-1 text-sm text-[#7a6b62]">
            Defina ICP, região e fontes antes de gerar oportunidades.
          </p>
        </div>
        <div className="rounded-xl border border-[rgba(160,75,44,0.14)] bg-[#fff5ec] px-4 py-3 text-xs leading-relaxed text-[#7a3420]">
          {selectedSources.length} fonte(s) ativa(s) · até{" "}
          <span className="font-semibold">{selectedSources.length * limitPerSource}</span>{" "}
          resultado(s)
        </div>
      </div>
      <div className="grid gap-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-semibold tracking-[0.04em] text-[#6c5a51]">
            ICP / Profissional
            <select
              value={selectedIcp.value}
              onChange={(e) => handleIcpChange(e.target.value)}
              className={inputClass}
            >
              {ICP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold tracking-[0.04em] text-[#6c5a51]">
            Nicho
            <input
              type="text"
              value={niche}
              onChange={(e) => onNicheChange(e.target.value)}
              placeholder="Ex: Estética premium"
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-xs font-semibold tracking-[0.04em] text-[#6c5a51]">
            Estado
            <select
              value={region}
              onChange={(e) => onRegionChange(e.target.value)}
              className={inputClass}
            >
              {BRAZILIAN_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label} ({state.value})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold tracking-[0.04em] text-[#6c5a51]">
            Cidade
            <input
              type="text"
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              placeholder="Opcional — ex: Campinas"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold tracking-[0.04em] text-[#6c5a51]">
            Limite / fonte
            <select
              value={limitPerSource}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className={inputClass}
            >
              {[2, 4, 6, 8, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n} resultados
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <p className="mb-1.5 text-xs font-semibold tracking-[0.04em] text-[#6c5a51]">Fontes</p>
            <div className="flex flex-wrap gap-2">
              {SOURCE_CHANNELS.map((channel) => {
                const active = selectedSources.includes(channel.id);
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => onToggleSource(channel.id)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? "border-[#a04b2c] bg-[rgba(160,75,44,0.12)] text-[#7a3420]"
                        : "border-[rgba(35,24,21,0.12)] bg-white text-[#6c5a51] hover:border-[rgba(160,75,44,0.25)] hover:bg-[#fff5ec]"
                    }`}
                  >
                    {channel.icon} {channel.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={onSearch}
            disabled={isSearching}
            className="inline-flex items-center justify-center rounded-xl bg-[#231815] px-5 py-3 text-sm font-semibold text-[#f8efe4] transition hover:bg-[#3a2b25] disabled:opacity-60"
          >
            {isSearching ? "Buscando..." : "Buscar oportunidades"}
          </button>
        </div>
      </div>
    </div>
  );
}
