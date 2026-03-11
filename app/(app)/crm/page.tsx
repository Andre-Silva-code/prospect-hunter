import React from "react";
import { getSessionUser } from "@/lib/auth-session";
import { ProspectingWorkspace } from "@/components/prospecting-workspace";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a04b2c] mb-3">
      {children}
    </p>
  );
}

export default async function CrmPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  return (
    <div className="p-8 space-y-8">
      <div>
        <SectionLabel>Pipeline de vendas</SectionLabel>
        <h1 className="text-2xl font-semibold text-[#231815]">CRM</h1>
        <p className="text-sm text-[#8a7569] mt-1">
          Gerencie seus leads da prospecção ao fechamento.
        </p>
      </div>
      <ProspectingWorkspace sessionUser={sessionUser} />
    </div>
  );
}
