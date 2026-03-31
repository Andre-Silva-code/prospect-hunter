import React from "react";

import { followUpPriorityBadge } from "@/components/pipeline/stage-config";
import { formatFollowUpDate } from "@/hooks/use-leads";
import type { LeadRecord } from "@/types/prospecting";

export function FollowUpQueue({ queue }: { queue: LeadRecord[] }): React.ReactElement {
  return (
    <section className="rounded-3xl bg-[#243b30] p-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7ec8a4]">
            Follow-ups prioritários
          </p>
          <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-white">
            Ataque primeiro quem tem score alto e ainda não respondeu.
          </h3>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-[#a8c9ba] lg:text-right">
          A fila combina score e status para apontar os próximos contatos do dia.
        </p>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {queue.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 px-5 py-6 text-sm leading-relaxed text-[#a8c9ba]">
            Nenhum follow-up prioritário com os filtros atuais.
          </div>
        ) : null}

        {queue.map((lead, index) => (
          <article
            key={lead.id}
            className="rounded-2xl bg-white/[0.07] p-5 border border-white/[0.06] transition hover:bg-white/[0.10]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7ec8a4]/20 text-[11px] font-bold text-[#7ec8a4]">
                    {index + 1}
                  </span>
                  <p className="text-[10px] font-semibold tracking-[0.15em] text-[#7ec8a4]">
                    #{index + 1} da fila
                  </p>
                </div>
                <h4 className="mt-2 text-lg font-semibold text-white">{lead.company}</h4>
              </div>
              <span className={followUpPriorityBadge(lead.priority)}>
                {lead.priority} · {lead.score}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#c0ddd1]">{lead.trigger}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7ec8a4]" />
              <p className="text-xs text-[#a8c9ba]">
                {lead.contactStatus} · {lead.stage} · Próximo:{" "}
                {formatFollowUpDate(lead.nextFollowUpAt)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
