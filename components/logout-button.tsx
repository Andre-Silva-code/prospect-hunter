"use client";

import React from "react";
import { useRouter } from "next/navigation";

export function LogoutButton(): React.ReactElement {
  const router = useRouter();

  const handleLogout = async (): Promise<void> => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className="w-full rounded-xl px-3 py-2 text-xs font-semibold text-[#c4a898] transition hover:bg-white/5 hover:text-white text-left"
    >
      Sair da conta
    </button>
  );
}
