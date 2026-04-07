"use client";

import React from "react";

import {
  IconMessage,
  IconArrow,
  IconCopy,
  IconCheck,
  IconClock,
  IconSend,
  IconReply,
} from "@/components/icons";
import { stageConfig, priorityBadge, contactStatusBadge } from "@/components/pipeline/stage-config";
import { defaultIcp, defaultSource, formatFollowUpDate } from "@/hooks/use-leads";
import type { LeadRecord, PipelineStage } from "@/types/prospecting";

const pipelineStages: PipelineStage[] = [
  "Novo",
  "Contato",
  "Diagnóstico",
  "Proposta",
  "Fechado",
  "Perdido",
];

type PipelineBoardProps = {
  groupedLeads: Record<PipelineStage, LeadRecord[]>;
  expandedMessageLeadId: string | null;
  setExpandedMessageLeadId: React.Dispatch<React.SetStateAction<string | null>>;
  copyFeedbackLeadId: string | null;
  advanceStage: (leadId: string) => void;
  closeLead: (leadId: string, stage: "Fechado" | "Perdido") => void;
  handleMessageChange: (leadId: string, message: string) => void;
  copyMessage: (leadId: string, message: string) => Promise<void>;
  registerFollowUp: (leadId: string) => void;
  updateContactStatus: (leadId: string, contactStatus: "Mensagem enviada" | "Respondeu") => void;
  sendGbpReport: (leadId: string) => Promise<void>;
  gbpReportSendingLeadId: string | null;
};

export function PipelineBoard({
  groupedLeads,
  expandedMessageLeadId,
  setExpandedMessageLeadId,
  copyFeedbackLeadId,
  advanceStage,
  closeLead,
  handleMessageChange,
  copyMessage,
  registerFollowUp,
  updateContactStatus,
  sendGbpReport,
  gbpReportSendingLeadId,
}: PipelineBoardProps): React.ReactElement {
  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <div className="flex gap-4 min-w-max">
        {pipelineStages.map((stage) => {
          const cfg = stageConfig[stage];
          return (
            <section
              key={stage}
              className="rounded-3xl border border-[rgba(35,24,21,0.07)] bg-[#fffaf5] overflow-hidden shadow-sm w-[300px] flex-shrink-0"
            >
              <div
                className={`flex items-center justify-between gap-3 border-b px-5 py-4 ${cfg.header}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                  <h3 className="text-sm font-semibold text-[#231815]">{stage}</h3>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.count}`}>
                  {groupedLeads[stage].length}
                </span>
              </div>

              <div className="flex flex-col gap-3 p-4">
                {groupedLeads[stage].length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[rgba(35,24,21,0.10)] px-4 py-8 text-center">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="mx-auto mb-2 text-[#c4b4ac]"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <path d="M8 12h8M12 8v8" strokeLinecap="round" />
                    </svg>
                    <p className="text-sm text-[#b0a099]">Nenhum lead aqui</p>
                  </div>
                ) : null}

                {groupedLeads[stage].map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    isMessageExpanded={expandedMessageLeadId === lead.id}
                    isCopyFeedback={copyFeedbackLeadId === lead.id}
                    isSendingGbpReport={gbpReportSendingLeadId === lead.id}
                    onToggleMessage={() =>
                      setExpandedMessageLeadId((currentId) =>
                        currentId === lead.id ? null : lead.id
                      )
                    }
                    onAdvanceStage={() => advanceStage(lead.id)}
                    onCloseLead={(s) => closeLead(lead.id, s)}
                    onMessageChange={(msg) => handleMessageChange(lead.id, msg)}
                    onCopyMessage={() => void copyMessage(lead.id, lead.message)}
                    onRegisterFollowUp={() => registerFollowUp(lead.id)}
                    onUpdateContactStatus={(status) => updateContactStatus(lead.id, status)}
                    onSendGbpReport={() => void sendGbpReport(lead.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function LeadCard({
  lead,
  isMessageExpanded,
  isCopyFeedback,
  isSendingGbpReport,
  onToggleMessage,
  onAdvanceStage,
  onCloseLead,
  onMessageChange,
  onCopyMessage,
  onRegisterFollowUp,
  onUpdateContactStatus,
  onSendGbpReport,
}: {
  lead: LeadRecord;
  isMessageExpanded: boolean;
  isCopyFeedback: boolean;
  isSendingGbpReport: boolean;
  onToggleMessage: () => void;
  onAdvanceStage: () => void;
  onCloseLead: (stage: "Fechado" | "Perdido") => void;
  onMessageChange: (message: string) => void;
  onCopyMessage: () => void;
  onRegisterFollowUp: () => void;
  onUpdateContactStatus: (status: "Mensagem enviada" | "Respondeu") => void;
  onSendGbpReport: () => void;
}): React.ReactElement {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm border border-[rgba(35,24,21,0.07)] transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#231815]">{lead.company}</p>
          <p className="mt-0.5 truncate text-xs text-[#7d6a60]">
            {lead.niche} · {lead.region}
          </p>
          <p className="mt-1 truncate text-[11px] text-[#8a7569]">
            {lead.source ?? defaultSource} · ICP: {lead.icp ?? defaultIcp}
          </p>
        </div>
        <span className={priorityBadge(lead.priority)}>{lead.priority}</span>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="rounded-lg bg-[rgba(160,75,44,0.07)] px-2.5 py-1 text-[11px] font-semibold text-[#a04b2c]">
          {lead.monthlyBudget}
        </span>
        <span className="rounded-lg bg-[rgba(35,24,21,0.05)] px-2.5 py-1 text-[11px] font-semibold text-[#5c4a40]">
          Score {lead.score}
        </span>
        <span className={contactStatusBadge(lead.contactStatus)}>{lead.contactStatus}</span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[#7d6a60] line-clamp-2">{lead.trigger}</p>
      <p className="mt-2 text-xs font-medium text-[#2a5a40]">{lead.contact}</p>
      <p className="mt-1 text-[11px] text-[#7d6a60]">
        Follow-up #{lead.followUpStep ?? 0} · Próximo {formatFollowUpDate(lead.nextFollowUpAt)}
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onToggleMessage}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(160,75,44,0.2)] px-3 py-2.5 text-xs font-semibold text-[#a04b2c] transition hover:bg-[rgba(160,75,44,0.06)]"
        >
          <IconMessage />
          {isMessageExpanded ? "Ocultar" : "Gerar mensagem"}
        </button>
        <button
          type="button"
          onClick={onAdvanceStage}
          disabled={
            lead.stage === "Proposta" || lead.stage === "Fechado" || lead.stage === "Perdido"
          }
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(35,24,21,0.10)] px-3 py-2.5 text-xs font-semibold text-[#231815] transition hover:bg-[rgba(35,24,21,0.04)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconArrow />
          {lead.stage === "Fechado" || lead.stage === "Perdido" ? "Final" : "Avançar etapa"}
        </button>
      </div>

      {lead.stage === "Proposta" ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onCloseLead("Fechado")}
            className="rounded-xl border border-[rgba(31,122,69,0.25)] bg-[rgba(31,122,69,0.08)] px-3 py-2 text-xs font-semibold text-[#1f7a45] transition hover:bg-[rgba(31,122,69,0.14)]"
          >
            Fechar ganho
          </button>
          <button
            type="button"
            onClick={() => onCloseLead("Perdido")}
            className="rounded-xl border border-[rgba(139,90,77,0.22)] bg-[rgba(139,90,77,0.08)] px-3 py-2 text-xs font-semibold text-[#6f4034] transition hover:bg-[rgba(139,90,77,0.14)]"
          >
            Marcar perdido
          </button>
        </div>
      ) : null}

      {lead.stage === "Diagnóstico" && lead.source === "Google Meu Negócio" ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={onSendGbpReport}
            disabled={isSendingGbpReport}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#2a8a50]/30 bg-[#2a8a50]/5 px-3 py-2.5 text-xs font-semibold text-[#2a8a50] transition hover:bg-[#2a8a50]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSendingGbpReport ? (
              "Enviando mensagem de acompanhamento..."
            ) : (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="shrink-0"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="8" cy="8" r="7" />
                  <path d="M5.5 8l1.8 1.8 3-3.5" />
                </svg>
                Já enviei o relatório
              </>
            )}
          </button>
        </div>
      ) : null}

      {isMessageExpanded ? (
        <div className="mt-4 rounded-2xl bg-[#fffaf5] border border-[rgba(160,75,44,0.12)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#a04b2c]">
            Mensagem sugerida
          </p>
          <textarea
            aria-label={`Mensagem do lead ${lead.company}`}
            value={lead.message}
            onChange={(event) => onMessageChange(event.target.value)}
            rows={6}
            className="mt-2 w-full rounded-xl border border-[rgba(160,75,44,0.14)] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#4a3830] outline-none transition focus:border-[#a04b2c] focus:ring-2 focus:ring-[#a04b2c]/10 resize-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopyMessage}
              className="flex items-center gap-1.5 rounded-xl bg-[#231815] px-3.5 py-2.5 text-xs font-semibold text-[#f8efe4] transition hover:bg-[#3a2b25]"
            >
              {isCopyFeedback ? (
                <>
                  <IconCheck /> Copiada!
                </>
              ) : (
                <>
                  <IconCopy /> Copiar mensagem
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onRegisterFollowUp}
              className="flex items-center gap-1.5 rounded-xl border border-[rgba(122,78,160,0.2)] px-3.5 py-2.5 text-xs font-semibold text-[#6b4a90] transition hover:bg-[rgba(122,78,160,0.08)]"
            >
              <IconClock /> Registrar follow-up
            </button>
            <button
              type="button"
              onClick={() => onUpdateContactStatus("Mensagem enviada")}
              className="flex items-center gap-1.5 rounded-xl border border-[rgba(35,24,21,0.12)] px-3.5 py-2.5 text-xs font-semibold text-[#231815] transition hover:bg-[rgba(35,24,21,0.04)]"
            >
              <IconSend /> Marcar enviada
            </button>
            <button
              type="button"
              onClick={() => onUpdateContactStatus("Respondeu")}
              className="flex items-center gap-1.5 rounded-xl border border-[rgba(36,59,48,0.2)] px-3.5 py-2.5 text-xs font-semibold text-[#243b30] transition hover:bg-[rgba(36,59,48,0.07)]"
            >
              <IconReply /> Marcar respondeu
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
