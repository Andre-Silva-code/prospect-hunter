import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";

export async function GET(): Promise<NextResponse> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const hasAnonKey = Boolean(process.env.SUPABASE_ANON_KEY);
  const storageProvider = process.env.LEADS_STORAGE_PROVIDER ?? "(não definido)";
  const usingSupabase = Boolean(supabaseUrl && hasAnonKey);

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
    containerEnvKeys: containerEnv,
  });
}
