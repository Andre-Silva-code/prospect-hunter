"use client";

import React from "react";

import type { LeadSource } from "@/types/prospecting";
import { SOURCE_CHANNELS } from "./constants";
import { SectionLabel } from "./ui";

type ConnectorStatusMap = Partial<Record<LeadSource, string>>;

function statusStyle(status: string | undefined): { label: string; className: string } {
  if (!status || status === "Aguardando busca") {
    return {
      label: "Aguardando",
      className: "bg-[#fffaf5] text-[#7a6b62] border-[rgba(35,24,21,0.10)]",
    };
  }
  if (status.startsWith("ok") || status.startsWith("demo")) {
    return {
      label: "Ativo",
      className: "bg-[rgba(31,122,69,0.10)] text-[#1f7a45] border-[rgba(31,122,69,0.18)]",
    };
  }
  if (status.startsWith("error") || status.startsWith("fail")) {
    return {
      label: "Erro",
      className: "bg-[rgba(192,67,42,0.10)] text-[#8a1a08] border-[rgba(192,67,42,0.18)]",
    };
  }
  return {
    label: "Ativo",
    className: "bg-[rgba(31,122,69,0.10)] text-[#1f7a45] border-[rgba(31,122,69,0.18)]",
  };
}

export default function SourceCards({ connectorStatus }: { connectorStatus: ConnectorStatusMap }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {SOURCE_CHANNELS.map((channel) => {
        const raw = connectorStatus[channel.id];
        const { label, className } = statusStyle(raw);

        return (
          <div
            key={channel.id}
            className="group rounded-2xl border border-[rgba(35,24,21,0.07)] bg-white p-5 shadow-[0_1px_2px_rgba(35,24,21,0.04)] transition hover:-translate-y-0.5 hover:border-[rgba(160,75,44,0.24)] hover:shadow-[0_8px_24px_rgba(84,55,31,0.10)]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(160,75,44,0.12)] bg-[#fff5ec] text-xl transition group-hover:border-[rgba(160,75,44,0.24)]">
                {channel.icon}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
              >
                {label}
              </span>
            </div>
            <h3 className="mb-2 font-semibold text-[#231815]">{channel.label}</h3>
            <p className="min-h-[44px] text-sm leading-relaxed text-[#655248]">{channel.desc}</p>
            {raw && raw !== "Aguardando busca" && (
              <p className="mt-2 text-[0.65rem] text-[#8a7569] truncate" title={raw}>
                {raw}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ConnectorStatusBar({ connectorStatus }: { connectorStatus: ConnectorStatusMap }) {
  const hasSearched = Object.keys(connectorStatus).length > 0;

  if (!hasSearched) return null;

  return (
    <div className="rounded-[20px] border border-[rgba(35,24,21,0.07)] bg-white p-6 shadow-[0_1px_2px_rgba(35,24,21,0.04)]">
      <SectionLabel>Status das integrações</SectionLabel>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {SOURCE_CHANNELS.map((channel) => {
          const raw = connectorStatus[channel.id];
          const { label } = statusStyle(raw);

          return (
            <div
              key={channel.id}
              className="flex items-center gap-2 rounded-xl border border-[rgba(35,24,21,0.08)] bg-[#fffaf5] px-4 py-3"
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  label === "Ativo"
                    ? "bg-[#1f7a45]"
                    : label === "Erro"
                      ? "bg-[#c0432a]"
                      : "bg-[#7a6b62]"
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#231815]">{channel.label}</p>
                <p className="mt-0.5 text-[0.65rem] text-[#6c5a51] truncate" title={raw ?? ""}>
                  {raw ?? "Aguardando busca"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
