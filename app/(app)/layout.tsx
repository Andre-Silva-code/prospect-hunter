import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  return (
    <div className="flex min-h-screen bg-[#f4eadf]">
      <Sidebar userEmail={sessionUser.email} />
      <main
        className="flex-1 overflow-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 60% 0%, rgba(160,75,44,0.07) 0%, transparent 60%), #f4eadf",
        }}
      >
        {children}
      </main>
    </div>
  );
}
