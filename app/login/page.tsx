import React from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage(): React.ReactElement {
  return (
    <main className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between bg-[#1c1410] p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(160,75,44,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(47,71,60,0.3),transparent_50%)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,250,245,0.04) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#a04b2c]">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 2L15 6V12L9 16L3 12V6L9 2Z"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="9" r="2" fill="white" />
              </svg>
            </div>
            <span className="text-[#f8efe4] font-semibold tracking-tight text-lg">
              Prospect Hunter
            </span>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f6b37d] mb-4">
              Sistema de prospecção
            </p>
            <h1 className="text-4xl xl:text-5xl font-semibold text-[#f8efe4] leading-[1.1]">
              Encontre clientes com verba real e urgência.
            </h1>
            <p className="mt-5 text-[#c4a898] text-lg leading-relaxed max-w-md">
              Pipeline enxuto com ICPs, qualificação por score e cadência multicanal para agências
              de tráfego pago.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-4">
            {[
              {
                icon: (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ),
                label: "Score automático de qualificação",
                desc: "Verba, maturidade, prova social e urgência",
              },
              {
                icon: (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.14 2.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                ),
                label: "Cadência multicanal estruturada",
                desc: "Instagram, WhatsApp, cold e-mail e LinkedIn",
              },
              {
                icon: (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="18" rx="1" />
                    <rect x="14" y="3" width="7" height="10" rx="1" />
                    <rect x="14" y="17" width="7" height="4" rx="1" />
                  </svg>
                ),
                label: "Pipeline kanban em tempo real",
                desc: "Do contato até a proposta sem perder nada",
              },
            ].map((f) => (
              <div
                key={f.label}
                className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/[0.08] transition hover:bg-white/[0.08]"
              >
                <span className="text-[#f6b37d] shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-[#f8efe4] font-semibold text-sm">{f.label}</p>
                  <p className="text-[#a08a80] text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10">
          <p className="text-[#6a5248] text-xs">
            &copy; {new Date().getFullYear()} Prospect Hunter · Prospecção inteligente para agências
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-[#f8efe4] via-[#f4eadf] to-[#ede4d8] px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#a04b2c]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 2L15 6V12L9 16L3 12V6L9 2Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="9" r="2" fill="white" />
            </svg>
          </div>
          <span className="text-[#231815] font-semibold tracking-tight text-lg">
            Prospect Hunter
          </span>
        </div>

        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-[#231815]">Bem-vindo</h2>
            <p className="mt-2 text-[#7a6258]">Entre na sua conta para continuar</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
