import { cookies } from "next/headers";

const SESSION_COOKIE = "prospect_hunter_session";

type StoredSession = {
  accessToken: string;
  refreshToken?: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getStoredSession();

  if (!session) {
    return null;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    email?: string;
    id?: string;
    user_metadata?: { full_name?: string; name?: string };
  };

  if (!payload.id || !payload.email) {
    return null;
  }

  return {
    id: payload.id,
    email: payload.email,
    name:
      payload.user_metadata?.full_name ??
      payload.user_metadata?.name ??
      payload.email.split("@")[0] ??
      "Operador",
  };
}

export async function createSessionFromPassword(
  email: string,
  password: string
): Promise<{ success: true } | { error: string }> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Supabase Auth não configurado" };
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    return { error: "Credenciais inválidas" };
  }

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
  };

  if (!payload.access_token) {
    return { error: "Sessão inválida" };
  }

  await setStoredSession({
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
  });

  return { success: true };
}

export async function clearSessionUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

async function getStoredSession(): Promise<StoredSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { accessToken?: unknown }).accessToken === "string"
    ) {
      return parsed as StoredSession;
    }
  } catch {
    return null;
  }

  return null;
}

async function setStoredSession(session: StoredSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
