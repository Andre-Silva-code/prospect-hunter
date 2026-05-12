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
    steps: [
      "Acesse a aba de prospecção e defina nicho, cidade e porte do negócio.",
      "Use o ICP para filtrar empresas com maior potencial de fechamento.",
      "Rode a busca nas fontes disponíveis e revise o score sugerido.",
      "Envie os melhores leads para o CRM para começar o outreach.",
    ],
  },
  {
    category: "Prospecção",
    title: "Prospecção no Google Maps",
    desc: "Como identificar negócios com presença digital fraca e alta propensão a investir em tráfego pago.",
    duration: "8 min",
    level: "Iniciante",
    icon: "🌐",
    steps: [
      "Busque por nicho + cidade (ex.: clínica odontológica em São Paulo).",
      "Priorize perfis com nota baixa, poucas avaliações ou pouca atividade.",
      "Confira sinais de oportunidade: site fraco, sem anúncios, baixa prova social.",
      "Marque os leads de maior aderência ao seu ICP e mova para o CRM.",
    ],
  },
  {
    category: "Prospecção",
    title: "Prospecção no Instagram",
    desc: "Técnicas para identificar negócios com potencial no Instagram e como personalizar a abordagem.",
    duration: "10 min",
    level: "Intermediário",
    icon: "📸",
    steps: [
      "Filtre perfis com boa oferta, mas baixa consistência de conteúdo.",
      "Observe bio, destaques, frequência de postagem e qualidade do criativo.",
      "Registre brechas claras de aquisição para personalizar a mensagem.",
      "Use o gerador de outreach e ajuste o texto com contexto real do perfil.",
    ],
  },
  {
    category: "ICP & Score",
    title: "Definindo seu ICP ideal",
    desc: "Como definir seu Perfil de Cliente Ideal para maximizar a taxa de conversão da prospecção.",
    duration: "12 min",
    level: "Intermediário",
    icon: "🎯",
    steps: [
      "Defina segmento, ticket médio, maturidade digital e região alvo.",
      "Liste critérios eliminatórios para reduzir leads de baixo fit.",
      "Defina critérios de priorização: urgência, potencial de ROI e autoridade.",
      "Revise semanalmente o ICP com base nas respostas de outreach.",
    ],
  },
  {
    category: "ICP & Score",
    title: "Entendendo o sistema de score",
    desc: "Como o score é calculado e como usar essa informação para priorizar seus leads.",
    duration: "6 min",
    level: "Iniciante",
    icon: "📊",
    steps: [
      "Use o score como triagem inicial, não como decisão final.",
      "Cruze score com sinais de dor visíveis no canal analisado.",
      "Priorize score alto + dor clara + aderência forte ao ICP.",
      "Ajuste o peso dos critérios quando houver padrão de baixa resposta.",
    ],
  },
  {
    category: "CRM",
    title: "Gerenciando leads no CRM",
    desc: "Como mover leads pelo pipeline, registrar interações e maximizar suas taxas de fechamento.",
    duration: "15 min",
    level: "Intermediário",
    icon: "📋",
    steps: [
      "Crie estágios claros: novo, abordado, respondeu, qualificado e fechado.",
      "Registre cada interação com data, canal e próxima ação.",
      "Defina follow-up com prazo para não perder leads quentes.",
      "Revise o funil diariamente para destravar gargalos de conversão.",
    ],
  },
  {
    category: "Integrações",
    title: "Configuração real de fontes (Apify + Google Places)",
    desc: "Ative as integrações reais para evitar busca sem resultados na operação.",
    duration: "10 min",
    level: "Intermediário",
    icon: "🔌",
    steps: [
      "Configure no .env.local: APIFY_TOKEN, task/actor IDs e GOOGLE_MAPS_API_KEY.",
      "Mantenha PROSPECTING_ENABLE_DEMO_FALLBACK=false para operação real.",
      "Valide token/task do Apify e teste busca local ponta a ponta.",
      "Execute npm run check:prospecting-sources para validar conectores.",
    ],
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
                <ol className="mb-4 space-y-1.5 text-xs text-[#5f4b40] leading-relaxed list-decimal pl-4">
                  {tutorial.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
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
