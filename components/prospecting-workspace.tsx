"use client";

import React from "react";

import { FollowUpQueue } from "@/components/follow-up-queue";
import { MetricsSection, FilterBar } from "@/components/metrics-bar";
import { OutreachStatusSection } from "@/components/outreach-status-section";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import type { SessionUser } from "@/lib/auth-session";
import { useLeads } from "@/hooks/use-leads";

export function ProspectingWorkspace({
  sessionUser,
}: {
  sessionUser: SessionUser;
}): React.ReactElement {
  const hook = useLeads(sessionUser.id);

  return (
    <section className="grid gap-5 content-start">
      {hook.isLoading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-[rgba(35,24,21,0.07)] bg-white px-5 py-4 text-sm text-[#6c5a51] shadow-sm">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-[#a04b2c] border-t-transparent animate-spin" />
          Carregando leads do servidor...
        </div>
      ) : null}

      <MetricsSection metrics={hook.metrics} />

      <FilterBar
        search={hook.search}
        onSearchChange={hook.setSearch}
        priorityFilter={hook.priorityFilter}
        onPriorityChange={hook.setPriorityFilter}
      />

      <FollowUpQueue queue={hook.followUpQueue} />

      <OutreachStatusSection leads={hook.leads} />

      <PipelineBoard
        groupedLeads={hook.groupedLeads}
        expandedMessageLeadId={hook.expandedMessageLeadId}
        setExpandedMessageLeadId={hook.setExpandedMessageLeadId}
        copyFeedbackLeadId={hook.copyFeedbackLeadId}
        advanceStage={hook.advanceStage}
        closeLead={hook.closeLead}
        handleMessageChange={hook.handleMessageChange}
        copyMessage={hook.copyMessage}
        registerFollowUp={hook.registerFollowUp}
        updateContactStatus={hook.updateContactStatus}
        sendGbpReport={hook.sendGbpReport}
        gbpReportSendingLeadId={hook.gbpReportSendingLeadId}
        markConsultingDone={hook.markConsultingDone}
        consultingDoneLeadId={hook.consultingDoneLeadId}
      />
    </section>
  );
}
