export type IcpSegment = {
  title: string;
  pain: string;
  offer: string;
  cpl: string;
};

export type ChannelPlan = {
  channel: string;
  cadence: string;
  goal: string;
};

export type Prospect = {
  company: string;
  niche: string;
  region: string;
  monthlyBudget: string;
  score: number;
  priority: "Alta" | "Media" | "Baixa";
  trigger: string;
};

export type OutreachStep = {
  day: string;
  touchpoint: string;
  script: string;
};

export const icpSegments: IcpSegment[] = [
  {
    title: "Clinicas estéticas premium",
    pain: "Agenda inconsistente e dependência de indicação.",
    offer: "Funil com criativos UGC e remarketing para avaliação.",
    cpl: "R$ 18-35",
  },
  {
    title: "Infoprodutores locais",
    pain: "Lançamentos sem previsibilidade de lead qualificado.",
    offer: "Captação perpétua com VSL curta e automação comercial.",
    cpl: "R$ 12-28",
  },
  {
    title: "Escritórios de advocacia nichados",
    pain: "Baixo volume de casos consultivos de alto ticket.",
    offer: "Campanhas por intenção + landing page com prova social.",
    cpl: "R$ 35-70",
  },
];

export const channelPlan: ChannelPlan[] = [
  {
    channel: "Meta Ads",
    cadence: "Campanhas always-on, revisão 2x/semana",
    goal: "Gerar leads e mapear quem já tem verba ativa.",
  },
  {
    channel: "Instagram outbound",
    cadence: "20 contatos qualificados por dia",
    goal: "Abrir conversa com empresas que já produzem conteúdo.",
  },
  {
    channel: "WhatsApp comercial",
    cadence: "Follow-up em até 10 minutos do sinal",
    goal: "Converter interesse em diagnóstico agendado.",
  },
];

export const prospects: Prospect[] = [
  {
    company: "Oral Prime Jardins",
    niche: "Odonto premium",
    region: "Sao Paulo",
    monthlyBudget: "R$ 12k",
    score: 92,
    priority: "Alta",
    trigger: "Rodando criativos antigos ha 90 dias.",
  },
  {
    company: "Instituto Shape+",
    niche: "Estetica corporal",
    region: "Campinas",
    monthlyBudget: "R$ 8k",
    score: 84,
    priority: "Alta",
    trigger: "Bio com link de agendamento e captação fraca.",
  },
  {
    company: "Melo Advogados Previdenciario",
    niche: "Jurídico",
    region: "Belo Horizonte",
    monthlyBudget: "R$ 5k",
    score: 71,
    priority: "Media",
    trigger: "Publica casos reais, mas sem CTA comercial.",
  },
  {
    company: "Studio Vitta Pilates",
    niche: "Bem-estar",
    region: "Curitiba",
    monthlyBudget: "R$ 3k",
    score: 56,
    priority: "Baixa",
    trigger: "Bom orgânico, pouca maturidade para escala paga.",
  },
];

export const outreachSteps: OutreachStep[] = [
  {
    day: "Dia 1",
    touchpoint: "Instagram DM",
    script:
      "Notei que voces ja investem em aquisicao, mas a oferta principal nao aparece logo no primeiro impacto.",
  },
  {
    day: "Dia 3",
    touchpoint: "WhatsApp",
    script:
      "Gravei um diagnostico rapido mostrando onde da para reduzir custo por lead sem aumentar equipe comercial.",
  },
  {
    day: "Dia 5",
    touchpoint: "Email",
    script:
      "Envio comparativo com 3 ajustes de campanha, criativo e landing page para acelerar fechamento.",
  },
];

export const kpis = [
  { label: "Leads qualificados/semana", value: "45", detail: "Meta operacional do outbound" },
  { label: "Taxa de resposta", value: "18%", detail: "Com scripts por nicho e follow-up" },
  { label: "Diagnosticos agendados", value: "8", detail: "Capacidade ideal por estrategista" },
  { label: "Fechamentos/mês", value: "3", detail: "Base para crescer receita recorrente" },
];
