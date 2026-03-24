"use client";

import React from "react";
import { useRouter } from "next/navigation";

const LOCAL_AUTH_HINT_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_LOCAL_AUTH_HINT === "true";
const LOCAL_AUTH_HINT_EMAIL =
  process.env.NEXT_PUBLIC_LOCAL_AUTH_EMAIL ?? "admin@prospecthunter.local";
const LOCAL_AUTH_HINT_PASSWORD = process.env.NEXT_PUBLIC_LOCAL_AUTH_PASSWORD ?? "prospect123";

export function LoginForm(): React.ReactElement {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!response.ok) {
      setError("Email ou senha incorretos. Verifique suas credenciais.");
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email */}
      <div>
        <label className="block text-sm font-semibold text-[#3e2e28] mb-2">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="w-full rounded-xl border border-[rgba(35,24,21,0.14)] bg-white px-4 py-3 text-sm text-[#231815] placeholder-[#b8a49c] shadow-sm transition"
        />
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-semibold text-[#3e2e28] mb-2">Senha</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-xl border border-[rgba(35,24,21,0.14)] bg-white px-4 py-3 text-sm text-[#231815] placeholder-[#b8a49c] shadow-sm transition"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
          <span className="text-red-500 mt-0.5 text-base">⚠</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[#231815] px-5 py-3.5 text-sm font-semibold text-[#f8efe4] transition hover:bg-[#3a2b25] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Entrando...
          </>
        ) : (
          "Entrar no sistema"
        )}
      </button>

      {LOCAL_AUTH_HINT_ENABLED ? (
        <div className="rounded-xl border border-[#d9c6b8] bg-[#f5e7dc] px-4 py-3">
          <p className="text-xs font-semibold text-[#5a3c30]">Acesso local (dev)</p>
          <p className="mt-1 text-xs text-[#6f5448]">
            Email: <span className="font-medium">{LOCAL_AUTH_HINT_EMAIL}</span>
          </p>
          <p className="text-xs text-[#6f5448]">
            Senha: <span className="font-medium">{LOCAL_AUTH_HINT_PASSWORD}</span>
          </p>
        </div>
      ) : null}

      <p className="text-center text-xs text-[#a0968e] pt-2">
        Autenticação segura via Supabase Auth
      </p>
    </form>
  );
}
