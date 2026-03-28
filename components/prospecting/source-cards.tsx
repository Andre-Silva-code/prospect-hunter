"use client";

import type { LeadSource } from "@/types/prospecting";
import { SOURCE_CHANNELS } from "./constants";
import { SectionLabel } from "./ui";

type ConnectorStatusMap = Partial<Record<LeadSource, string>>;

function statusStyle(status: string | undefined): { label: string; className: string } {
  if (!status || status === "Aguardando busca") {
    return {
      label: "Aguardando",
      className: "bg-gray-50 text-gray-500 border-gray-200",
    };
  }
  if (status.startsWith("ok") || status.startsWith("demo")) {
    return {
      label: "Ativo",
      className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    };
  }
  if (status.startsWith("error") || status.startsWith("fail")) {
    return {
      label: "Erro",
      className: "bg-red-50 text-red-700 border-red-100",
    };
  }
  return {
    label: "Ativo",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
}

export default function SourceCards({ connectorStatus }: { connectorStatus: ConnectorStatusMap }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {SOURCE_CHANNELS.map((channel) => {
        const raw = connectorStatus[channel.id];
        const { label, className } = statusStyle(raw);

        return (
          <div
            key={channel.id}
            className="rounded-2xl bg-white border border-[rgba(35,24,21,0.07)] p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-2xl">{channel.icon}</span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${className}`}
              >
                {label}
              </span>
            </div>
            <h3 className="font-semibold text-[#231815] mb-2">{channel.label}</h3>
            <p className="text-sm text-[#655248] leading-relaxed">{channel.desc}</p>
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
    <div className="rounded-3xl bg-white border border-[rgba(35,24,21,0.07)] p-6 shadow-sm">
      <SectionLabel>Status das integrações</SectionLabel>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {SOURCE_CHANNELS.map((channel) => {
          const raw = connectorStatus[channel.id];
          const { label } = statusStyle(raw);

          return (
            <div
              key={channel.id}
              className="rounded-xl border border-[rgba(35,24,21,0.08)] bg-[#fffaf5] px-4 py-3 flex items-center gap-2"
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  label === "Ativo"
                    ? "bg-emerald-500"
                    : label === "Erro"
                      ? "bg-red-500"
                      : "bg-gray-400"
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
