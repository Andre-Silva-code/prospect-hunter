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
  markConsultingDone: (leadId: string) => Promise<void>;
  consultingDoneLeadId: string | null;
  outreachStatusMap: Record<string, string>;
  onPhoneAdded: (leadId: string, contact: string, queued: boolean) => void;
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
  markConsultingDone,
  consultingDoneLeadId,
  outreachStatusMap,
  onPhoneAdded,
}: PipelineBoardProps): React.ReactElement {
  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <div className="flex gap-4 min-w-max">
        {pipelineStages.map((stage) => {
          const cfg = stageConfig[stage];
          return (
            <section
              key={stage}
              className="w-[300px] flex-shrink-0 overflow-hidden rounded-[20px] border border-[rgba(35,24,21,0.07)] bg-[#fffaf5] shadow-[0_1px_2px_rgba(35,24,21,0.04)]"
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
                    outreachStatus={outreachStatusMap[lead.id]}
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
                    onMarkConsultingDone={() => void markConsultingDone(lead.id)}
                    isConsultingDone={consultingDoneLeadId === lead.id}
                    onPhoneAdded={(contact, queued) => onPhoneAdded(lead.id, contact, queued)}
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
  outreachStatus,
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
  onMarkConsultingDone,
  isConsultingDone,
  onPhoneAdded,
}: {
  lead: LeadRecord;
  outreachStatus: string | undefined;
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
  onMarkConsultingDone: () => void;
  isConsultingDone: boolean;
  onPhoneAdded: (contact: string, queued: boolean) => void;
}): React.ReactElement {
  const [showPhoneInput, setShowPhoneInput] = React.useState(false);
  const [phoneValue, setPhoneValue] = React.useState("");
  const [isSavingPhone, setIsSavingPhone] = React.useState(false);

  const hasMobilePhone = lead.contact
    .split(/[|,/;]/)
    .map((p) => p.trim())
    .some((part) => {
      if (/^https?:\/\//i.test(part)) return false;
      if (part.startsWith("@")) return false;
      const digits = part.replace(/\D/g, "");
      // Remove prefixo 55 se houver
      const local = digits.startsWith("55") ? digits.slice(2) : digits;
      // Celular brasileiro: DDD (2 dígitos) + 9 dígitos começando com 9
      return local.length === 11 && local[2] === "9";
    });

  const handleSavePhone = async () => {
    if (!phoneValue.trim()) return;
    setIsSavingPhone(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneValue.trim() }),
      });
      if (res.ok) {
        const data = (await res.json()) as { lead: { contact: string }; queued: boolean };
        onPhoneAdded(data.lead.contact, data.queued);
        setShowPhoneInput(false);
        setPhoneValue("");
      }
    } finally {
      setIsSavingPhone(false);
    }
  };

  return (
    <article className="rounded-2xl border border-[rgba(35,24,21,0.07)] bg-white p-4 shadow-[0_1px_2px_rgba(35,24,21,0.04)] transition hover:border-[rgba(160,75,44,0.18)] hover:shadow-[0_8px_24px_rgba(84,55,31,0.10)]">
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
        {outreachStatus === "phone_invalid" && (
          <span
            className="rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 border border-red-200"
            title="Número cadastrado é fixo — não tem WhatsApp. Adicione um celular para retomar o outreach automático."
          >
            📵 Sem WhatsApp
          </span>
        )}
        {outreachStatus === "scheduled" && (
          <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
            🕐 Agendado
          </span>
        )}
        {outreachStatus === "sent" && (
          <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 border border-orange-200">
            ✉️ Enviado
          </span>
        )}
        {(outreachStatus === "follow_up_1" || outreachStatus === "follow_up_2") && (
          <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700 border border-purple-200">
            🔁 {outreachStatus === "follow_up_1" ? "Follow-up 1" : "Follow-up 2"}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[#7d6a60] line-clamp-2">{lead.trigger}</p>
      <p className="mt-2 text-xs font-medium text-[#2a5a40]">{lead.contact}</p>

      {!hasMobilePhone && (
        <div className="mt-1">
          {showPhoneInput ? (
            <div className="flex items-center gap-1.5">
              <input
                type="tel"
                value={phoneValue}
                onChange={(e) => setPhoneValue(e.target.value)}
                placeholder="(11) 99999-9999"
                className="flex-1 rounded-lg border border-[rgba(160,75,44,0.25)] px-2.5 py-1.5 text-xs text-[#231815] outline-none focus:border-[#a04b2c] focus:ring-1 focus:ring-[#a04b2c]/10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSavePhone();
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => void handleSavePhone()}
                disabled={isSavingPhone || !phoneValue.trim()}
                className="rounded-lg bg-[#a04b2c] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#8a3e24] disabled:opacity-50"
              >
                {isSavingPhone ? "..." : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPhoneInput(false);
                  setPhoneValue("");
                }}
                className="rounded-lg border border-[rgba(35,24,21,0.12)] px-2.5 py-1.5 text-[11px] font-semibold text-[#7d6a60] transition hover:bg-[rgba(35,24,21,0.04)]"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPhoneInput(true)}
              className="text-[11px] font-medium text-[#a04b2c] underline-offset-2 hover:underline"
            >
              + Adicionar telefone para outreach automático
            </button>
          )}
        </div>
      )}

      {(() => {
        const isOverdue = lead.nextFollowUpAt != null && new Date(lead.nextFollowUpAt) < new Date();
        const overdueDays = isOverdue
          ? Math.floor(
              (new Date().getTime() - new Date(lead.nextFollowUpAt!).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;
        return (
          <p
            className={`mt-1 text-[11px] font-medium ${isOverdue ? "text-red-500" : "text-[#7d6a60]"}`}
          >
            {isOverdue && "⚠️ "}Follow-up #{lead.followUpStep ?? 0} · Próximo{" "}
            {formatFollowUpDate(lead.nextFollowUpAt)}
            {isOverdue && ` · ${overdueDays}d atrasado`}
          </p>
        );
      })()}

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
            lead.stage === "Proposta" ||
            lead.stage === "Fechado" ||
            lead.stage === "Perdido" ||
            (lead.stage === "Diagnóstico" &&
              (lead.source === "Instagram" || lead.source === "Google Meu Negócio"))
          }
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(35,24,21,0.10)] px-3 py-2.5 text-xs font-semibold text-[#231815] transition hover:bg-[rgba(35,24,21,0.04)] disabled:cursor-not-allowed disabled:opacity-40"
          title={
            lead.stage === "Diagnóstico" &&
            (lead.source === "Instagram" || lead.source === "Google Meu Negócio")
              ? "Use o botão específico abaixo para avançar este lead"
              : undefined
          }
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

      {lead.stage === "Diagnóstico" && lead.source === "Instagram" ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={onMarkConsultingDone}
            disabled={isConsultingDone}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#5a3a8a]/30 bg-[#5a3a8a]/5 px-3 py-2.5 text-xs font-semibold text-[#7a5aaa] transition hover:bg-[#5a3a8a]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConsultingDone ? (
              "Enviando mensagem pos-consultoria..."
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
                Consultoria feita — iniciar sequencia
              </>
            )}
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
