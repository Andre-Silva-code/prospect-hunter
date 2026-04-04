import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const hasAnonKey = Boolean(process.env.SUPABASE_ANON_KEY);
  const storageProvider = process.env.LEADS_STORAGE_PROVIDER ?? "(não definido)";
  const usingSupabase = Boolean(supabaseUrl && hasAnonKey);

  return NextResponse.json({
    storage: usingSupabase ? "supabase" : "file",
    supabaseUrl: supabaseUrl ?? "(não definido)",
    hasAnonKey,
    storageProvider,
  });
}
