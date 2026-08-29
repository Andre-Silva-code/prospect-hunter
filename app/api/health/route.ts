import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";

import { getInstanceStatus } from "@/lib/connectors/uazapi";

export async function GET(): Promise<NextResponse> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const hasAnonKey = Boolean(process.env.SUPABASE_ANON_KEY);
  const storageProvider = process.env.LEADS_STORAGE_PROVIDER ?? "(não definido)";
  const usingSupabase = Boolean(supabaseUrl && hasAnonKey);

  // Saúde da conexão do WhatsApp: se desconectada, nenhum outreach é enviado.
  const uazapi = await getInstanceStatus();
  const whatsapp = {
    configured: uazapi.configured,
    connected: uazapi.connected,
    loggedIn: uazapi.loggedIn,
    status: uazapi.status,
    healthy: uazapi.connected && uazapi.loggedIn,
    error: uazapi.error,
  };

  let containerEnv: string[] = [];
  try {
    const raw = await readFile("/app/data/container-env-debug.txt", "utf8");
    // Mostra só as chaves (sem valores) para não expor secrets
    containerEnv = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split("=")[0])
      .sort();
  } catch {
    containerEnv = ["(arquivo não encontrado)"];
  }

  return NextResponse.json({
    storage: usingSupabase ? "supabase" : "file",
    supabaseUrl: supabaseUrl ?? "(não definido)",
    hasAnonKey,
    storageProvider,
    whatsapp,
    containerEnvKeys: containerEnv,
  });
}
