import { cookies } from "next/headers";

const SESSION_COOKIE = "prospect_hunter_session";
const LOCAL_AUTH_EMAIL = process.env.LOCAL_AUTH_EMAIL ?? "admin@prospecthunter.local";
const LOCAL_AUTH_PASSWORD = process.env.LOCAL_AUTH_PASSWORD ?? "prospect123";
const LOCAL_AUTH_NAME = process.env.LOCAL_AUTH_NAME ?? "Operador Local";

type StoredSession = {
  provider: "supabase" | "local";
  accessToken?: string;
  refreshToken?: string;
  user?: SessionUser;
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

  if (session.provider === "local") {
    if (session.user) {
      return session.user;
    }

    return null;
  }

  if (!session.accessToken) {
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
  const canUseLocalAuth =
    process.env.NODE_ENV !== "production" || process.env.ENABLE_LOCAL_AUTH === "true";

  if (
    canUseLocalAuth &&
    email.toLowerCase() === LOCAL_AUTH_EMAIL.toLowerCase() &&
    password === LOCAL_AUTH_PASSWORD
  ) {
    await setStoredSession({
      provider: "local",
      user: {
        id: "local-dev-user",
        email: LOCAL_AUTH_EMAIL,
        name: LOCAL_AUTH_NAME,
      },
    });

    return { success: true };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Supabase Auth não configurado" };
  }

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { error: "Serviço de autenticação indisponível" };
  }

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
    provider: "supabase",
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
    if (parsed && typeof parsed === "object") {
      const candidate = parsed as {
        provider?: unknown;
        accessToken?: unknown;
        refreshToken?: unknown;
        user?: unknown;
      };

      if (candidate.provider === "local") {
        if (
          candidate.user &&
          typeof candidate.user === "object" &&
          typeof (candidate.user as { id?: unknown }).id === "string" &&
          typeof (candidate.user as { email?: unknown }).email === "string" &&
          typeof (candidate.user as { name?: unknown }).name === "string"
        ) {
          return {
            provider: "local",
            user: candidate.user as SessionUser,
          };
        }

        return null;
      }

      if (candidate.provider === "supabase" && typeof candidate.accessToken === "string") {
        return {
          provider: "supabase",
          accessToken: candidate.accessToken,
          refreshToken:
            typeof candidate.refreshToken === "string" ? candidate.refreshToken : undefined,
        };
      }

      // Backward compatibility with cookies saved before `provider` was introduced.
      if (typeof candidate.accessToken === "string") {
        return {
          provider: "supabase",
          accessToken: candidate.accessToken,
          refreshToken:
            typeof candidate.refreshToken === "string" ? candidate.refreshToken : undefined,
        };
      }
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
