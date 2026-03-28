import type { LeadPriority, LeadSource } from "@/types/prospecting";

export type IcpOption = {
  value: string;
  niche: string;
  monthlyBudget: string;
  region: string;
};

export type ProspectResult = {
  id: string;
  company: string;
  niche: string;
  region: string;
  monthlyBudget: string;
  score: number;
  priority: LeadPriority;
  trigger: string;
  source: LeadSource;
  icp: string;
  contact: string;
  sourceUrl?: string;
};

export type SortField = "score" | "priority" | "company" | "source";
export type SortDirection = "asc" | "desc";
