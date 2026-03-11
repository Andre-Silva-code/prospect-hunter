"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/prospecting",
    label: "Prospecção",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
  {
    href: "/icp",
    label: "ICP & Abordagem",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/crm",
    label: "CRM",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3h18v18H3z" />
        <path d="M3 9h18M3 15h18M9 3v18" />
      </svg>
    ),
  },
  {
    href: "/tutorials",
    label: "Tutoriais",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
];

interface SidebarProps {
  userEmail: string;
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-[#1c1410] flex flex-col flex-shrink-0 border-r border-white/5">
      {/* Logo */}
      <div className="p-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#a04b2c]">
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 2L15 6V12L9 16L3 12V6L9 2Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="9" r="2" fill="white" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-[#f8efe4] text-sm leading-none">Prospect Hunter</div>
            <div className="text-[10px] text-[#7a6258] mt-0.5">Agência de tráfego</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#4d3d35] px-3 py-2">
          Menu
        </p>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-[#a04b2c] text-white"
                  : "text-[#c4a898] hover:bg-white/5 hover:text-[#f8efe4]"
              }`}
            >
              <span className={active ? "text-white" : "text-[#7a6258]"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/[0.08]">
        <div className="px-3 py-2 rounded-xl bg-white/5 mb-1">
          <p className="text-xs font-medium text-[#c4a898] truncate">{userEmail}</p>
          <p className="text-[10px] text-[#4d3d35]">Agência</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
