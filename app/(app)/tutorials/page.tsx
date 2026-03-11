import React from "react";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a04b2c] mb-3">
      {children}
    </p>
  );
}

const TUTORIALS = [
  {
    category: "Primeiros passos",
    title: "Como usar o Prospect Hunter",
    desc: "Aprenda a configurar seu ICP, entender o sistema de score e fazer suas primeiras prospecções.",
    duration: "5 min",
    level: "Iniciante",
    icon: "🚀",
  },
  {
    category: "Prospecção",
    title: "Prospecção no Google Maps",
    desc: "Como identificar negócios com presença digital fraca e alta propensão a investir em tráfego pago.",
    duration: "8 min",
    level: "Iniciante",
    icon: "🌐",
  },
  {
    category: "Prospecção",
    title: "Prospecção no Instagram",
    desc: "Técnicas para identificar negócios com potencial no Instagram e como personalizar a abordagem.",
    duration: "10 min",
    level: "Intermediário",
    icon: "📸",
  },
  {
    category: "ICP & Score",
    title: "Definindo seu ICP ideal",
    desc: "Como definir seu Perfil de Cliente Ideal para maximizar a taxa de conversão da prospecção.",
    duration: "12 min",
    level: "Intermediário",
    icon: "🎯",
  },
  {
    category: "ICP & Score",
    title: "Entendendo o sistema de score",
    desc: "Como o score é calculado e como usar essa informação para priorizar seus leads.",
    duration: "6 min",
    level: "Iniciante",
    icon: "📊",
  },
  {
    category: "CRM",
    title: "Gerenciando leads no CRM",
    desc: "Como mover leads pelo pipeline, registrar interações e maximizar suas taxas de fechamento.",
    duration: "15 min",
    level: "Intermediário",
    icon: "📋",
  },
];

export default function TutorialsPage() {
  const categories = [...new Set(TUTORIALS.map((t) => t.category))];

  return (
    <div className="p-8 space-y-8">
      <div>
        <SectionLabel>Aprenda a usar</SectionLabel>
        <h1 className="text-2xl font-semibold text-[#231815]">Tutoriais</h1>
        <p className="text-sm text-[#8a7569] mt-1">
          Aprenda a usar o Prospect Hunter para maximizar seus resultados.
        </p>
      </div>

      {categories.map((cat) => (
        <div key={cat}>
          <h2 className="text-base font-semibold text-[#231815] mb-4">{cat}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TUTORIALS.filter((t) => t.category === cat).map((tutorial) => (
              <div
                key={tutorial.title}
                className="rounded-2xl bg-white border border-[rgba(35,24,21,0.07)] p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-2xl">{tutorial.icon}</span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      tutorial.level === "Iniciante"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}
                  >
                    {tutorial.level}
                  </span>
                </div>
                <h3 className="font-semibold text-[#231815] mb-2 group-hover:text-[#a04b2c] transition-colors">
                  {tutorial.title}
                </h3>
                <p className="text-sm text-[#655248] leading-relaxed mb-4">{tutorial.desc}</p>
                <p className="text-xs text-[#a04b2c] font-semibold">
                  ⏱ {tutorial.duration} de leitura
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
