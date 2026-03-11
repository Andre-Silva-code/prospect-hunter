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
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
