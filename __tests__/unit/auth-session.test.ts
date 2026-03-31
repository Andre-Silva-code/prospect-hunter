import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getSessionUser, createSessionFromPassword, clearSessionUser } from "@/lib/auth-session";

const COOKIE_NAME = "prospect_hunter_session";

function setCookie(value: unknown) {
  mockCookieStore.get.mockReturnValue({ value: JSON.stringify(value) });
}

function setNoCookie() {
  mockCookieStore.get.mockReturnValue(undefined);
}

describe("auth-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setNoCookie();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  describe("getSessionUser", () => {
    it("returns null when no cookie exists", async () => {
      const user = await getSessionUser();
      expect(user).toBeNull();
    });

    it("returns local user from session", async () => {
      setCookie({
        provider: "local",
        user: { id: "local-1", email: "dev@test.com", name: "Dev" },
      });

      const user = await getSessionUser();
      expect(user).toEqual({ id: "local-1", email: "dev@test.com", name: "Dev" });
    });

    it("returns null for local session without user", async () => {
      setCookie({ provider: "local" });

      const user = await getSessionUser();
      expect(user).toBeNull();
    });

    it("returns null for supabase session without accessToken", async () => {
      setCookie({ provider: "supabase" });

      const user = await getSessionUser();
      expect(user).toBeNull();
    });

    it("returns null when supabase env vars are missing", async () => {
      setCookie({ provider: "supabase", accessToken: "tok-123" });

      const user = await getSessionUser();
      expect(user).toBeNull();
    });

    it("fetches user from supabase API", async () => {
      process.env.SUPABASE_URL = "https://fake.supabase.co";
      process.env.SUPABASE_ANON_KEY = "anon-key";
      setCookie({ provider: "supabase", accessToken: "tok-123" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "supa-1",
            email: "user@example.com",
            user_metadata: { full_name: "Full Name" },
          }),
      });

      const user = await getSessionUser();

      expect(mockFetch).toHaveBeenCalledWith("https://fake.supabase.co/auth/v1/user", {
        headers: {
          apikey: "anon-key",
          Authorization: "Bearer tok-123",
        },
        cache: "no-store",
      });
      expect(user).toEqual({ id: "supa-1", email: "user@example.com", name: "Full Name" });
    });

    it("falls back to name when full_name is missing", async () => {
      process.env.SUPABASE_URL = "https://fake.supabase.co";
      process.env.SUPABASE_ANON_KEY = "anon-key";
      setCookie({ provider: "supabase", accessToken: "tok-123" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "supa-2",
            email: "user@example.com",
            user_metadata: { name: "Short Name" },
          }),
      });

      const user = await getSessionUser();
      expect(user?.name).toBe("Short Name");
    });

    it("falls back to email prefix when no name metadata", async () => {
      process.env.SUPABASE_URL = "https://fake.supabase.co";
      process.env.SUPABASE_ANON_KEY = "anon-key";
      setCookie({ provider: "supabase", accessToken: "tok-123" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "supa-3",
            email: "john@example.com",
            user_metadata: {},
          }),
      });

      const user = await getSessionUser();
      expect(user?.name).toBe("john");
    });

    it("returns null when supabase API returns non-ok", async () => {
      process.env.SUPABASE_URL = "https://fake.supabase.co";
      process.env.SUPABASE_ANON_KEY = "anon-key";
      setCookie({ provider: "supabase", accessToken: "tok-123" });

      mockFetch.mockResolvedValueOnce({ ok: false });

      const user = await getSessionUser();
      expect(user).toBeNull();
    });

    it("returns null when supabase payload has no id", async () => {
      process.env.SUPABASE_URL = "https://fake.supabase.co";
      process.env.SUPABASE_ANON_KEY = "anon-key";
      setCookie({ provider: "supabase", accessToken: "tok-123" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ email: "user@example.com" }),
      });

      const user = await getSessionUser();
      expect(user).toBeNull();
    });

    it("handles backward-compatible cookie without provider field", async () => {
      process.env.SUPABASE_URL = "https://fake.supabase.co";
      process.env.SUPABASE_ANON_KEY = "anon-key";
      setCookie({ accessToken: "legacy-tok" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "legacy-1",
            email: "legacy@example.com",
            user_metadata: { full_name: "Legacy" },
          }),
      });

      const user = await getSessionUser();
      expect(user).toEqual({ id: "legacy-1", email: "legacy@example.com", name: "Legacy" });
    });

    it("returns null for invalid JSON in cookie", async () => {
      mockCookieStore.get.mockReturnValue({ value: "not-json{{{" });

      const user = await getSessionUser();
      expect(user).toBeNull();
    });

    it("returns null for non-object cookie value", async () => {
      mockCookieStore.get.mockReturnValue({ value: '"just a string"' });

      const user = await getSessionUser();
      expect(user).toBeNull();
    });
  });

  describe("createSessionFromPassword", () => {
    it("authenticates with local credentials in non-production", async () => {
      vi.stubEnv("NODE_ENV", "test");

      const result = await createSessionFromPassword("admin@prospecthunter.local", "prospect123");

      expect(result).toEqual({ success: true });
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        COOKIE_NAME,
        expect.stringContaining('"provider":"local"'),
        expect.objectContaining({ httpOnly: true, path: "/" })
      );
    });

    it("local auth is case-insensitive for email", async () => {
      vi.stubEnv("NODE_ENV", "test");

      const result = await createSessionFromPassword("ADMIN@PROSPECTHUNTER.LOCAL", "prospect123");

      expect(result).toEqual({ success: true });
    });

    it("rejects wrong local password", async () => {
      vi.stubEnv("NODE_ENV", "test");

      const result = await createSessionFromPassword(
        "admin@prospecthunter.local",
        "wrong-password"
      );

      expect(result).toEqual({ error: "Supabase Auth não configurado" });
    });

    it("returns error when supabase is not configured", async () => {
      vi.stubEnv("NODE_ENV", "test");

      const result = await createSessionFromPassword("user@example.com", "pass");

      expect(result).toEqual({ error: "Supabase Auth não configurado" });
    });

    it("authenticates via supabase successfully", async () => {
      vi.stubEnv("NODE_ENV", "test");
      process.env.SUPABASE_URL = "https://fake.supabase.co";
      process.env.SUPABASE_ANON_KEY = "anon-key";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "new-access",
            refresh_token: "new-refresh",
          }),
      });

      const result = await createSessionFromPassword("user@example.com", "pass123");

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://fake.supabase.co/auth/v1/token?grant_type=password",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "user@example.com", password: "pass123" }),
        })
      );
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        COOKIE_NAME,
        expect.stringContaining('"provider":"supabase"'),
        expect.objectContaining({ httpOnly: true })
      );
    });

    it("returns error for invalid supabase credentials", async () => {
      vi.stubEnv("NODE_ENV", "test");
      process.env.SUPABASE_URL = "https://fake.supabase.co";
      process.env.SUPABASE_ANON_KEY = "anon-key";

      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const result = await createSessionFromPassword("user@example.com", "wrong");

      expect(result).toEqual({ error: "Credenciais inválidas" });
    });

    it("returns error when fetch throws (network failure)", async () => {
      vi.stubEnv("NODE_ENV", "test");
      process.env.SUPABASE_URL = "https://fake.supabase.co";
      process.env.SUPABASE_ANON_KEY = "anon-key";

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await createSessionFromPassword("user@example.com", "pass");

      expect(result).toEqual({ error: "Serviço de autenticação indisponível" });
    });

    it("returns error when access_token is missing from response", async () => {
      vi.stubEnv("NODE_ENV", "test");
      process.env.SUPABASE_URL = "https://fake.supabase.co";
      process.env.SUPABASE_ANON_KEY = "anon-key";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await createSessionFromPassword("user@example.com", "pass");

      expect(result).toEqual({ error: "Sessão inválida" });
    });

    it("allows local auth in production when ENABLE_LOCAL_AUTH is true", async () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.ENABLE_LOCAL_AUTH = "true";

      const result = await createSessionFromPassword("admin@prospecthunter.local", "prospect123");

      expect(result).toEqual({ success: true });

      delete process.env.ENABLE_LOCAL_AUTH;
    });

    it("blocks local auth in production without ENABLE_LOCAL_AUTH", async () => {
      vi.stubEnv("NODE_ENV", "production");
      delete process.env.ENABLE_LOCAL_AUTH;

      const result = await createSessionFromPassword("admin@prospecthunter.local", "prospect123");

      expect(result).toEqual({ error: "Supabase Auth não configurado" });

      vi.stubEnv("NODE_ENV", "test");
    });
  });

  describe("clearSessionUser", () => {
    it("deletes the session cookie", async () => {
      await clearSessionUser();

      expect(mockCookieStore.delete).toHaveBeenCalledWith(COOKIE_NAME);
    });
  });
});
