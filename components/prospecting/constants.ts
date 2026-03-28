import type { LeadSource } from "@/types/prospecting";
import type { IcpOption } from "./types";

export const SOURCE_CHANNELS: Array<{ id: LeadSource; label: string; desc: string; icon: string }> =
  [
    {
      id: "Instagram",
      label: "Instagram",
      desc: "Perfis ativos com sinal de investimento e dor comercial.",
      icon: "📸",
    },
    {
      id: "LinkedIn",
      label: "LinkedIn",
      desc: "Empresas B2B com decisores acessíveis e contexto profissional.",
      icon: "💼",
    },
    {
      id: "Google Maps",
      label: "Google Maps",
      desc: "Negócios locais com demanda e presença digital validada.",
      icon: "🌐",
    },
    {
      id: "Google Meu Negócio",
      label: "Google Meu Negócio",
      desc: "Empresas com reputação local e intenção de compra clara.",
      icon: "📍",
    },
  ];

export const BRAZILIAN_STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

export const ICP_OPTIONS: IcpOption[] = [
  // --- Saúde e Bem-Estar ---
  {
    value: "Clínicas estéticas premium",
    niche: "Estética premium",
    monthlyBudget: "R$ 12k",
    region: "SP",
  },
  {
    value: "Dentistas e ortodontistas",
    niche: "Odontologia",
    monthlyBudget: "R$ 10k",
    region: "SP",
  },
  { value: "Clínicas veterinárias", niche: "Veterinária", monthlyBudget: "R$ 6k", region: "RS" },
  {
    value: "Clínicas de fisioterapia",
    niche: "Fisioterapia",
    monthlyBudget: "R$ 7k",
    region: "MG",
  },
  { value: "Psicólogos e terapeutas", niche: "Psicologia", monthlyBudget: "R$ 5k", region: "RJ" },
  { value: "Nutricionistas", niche: "Nutrição", monthlyBudget: "R$ 5k", region: "SP" },
  { value: "Médicos e clínicas médicas", niche: "Medicina", monthlyBudget: "R$ 15k", region: "SP" },
  {
    value: "Estúdios de pilates e yoga",
    niche: "Pilates e Yoga",
    monthlyBudget: "R$ 6k",
    region: "SC",
  },
  {
    value: "Academias e personal trainers",
    niche: "Fitness",
    monthlyBudget: "R$ 8k",
    region: "RJ",
  },
  {
    value: "Clínicas de dermatologia",
    niche: "Dermatologia",
    monthlyBudget: "R$ 12k",
    region: "SP",
  },
  { value: "Oftalmologistas", niche: "Oftalmologia", monthlyBudget: "R$ 11k", region: "MG" },
  { value: "Fonoaudiólogos", niche: "Fonoaudiologia", monthlyBudget: "R$ 5k", region: "PR" },
  {
    value: "Clínicas de reprodução humana",
    niche: "Reprodução humana",
    monthlyBudget: "R$ 20k",
    region: "SP",
  },
  {
    value: "Farmácias de manipulação",
    niche: "Farmácia manipulação",
    monthlyBudget: "R$ 8k",
    region: "GO",
  },
  {
    value: "Laboratórios de análises clínicas",
    niche: "Laboratório clínico",
    monthlyBudget: "R$ 10k",
    region: "BA",
  },

  // --- Serviços Profissionais ---
  { value: "Escritórios de advocacia", niche: "Advocacia", monthlyBudget: "R$ 9k", region: "MG" },
  {
    value: "Contabilidade consultiva",
    niche: "Contabilidade",
    monthlyBudget: "R$ 7k",
    region: "PR",
  },
  {
    value: "Consultorias B2B especializadas",
    niche: "Consultoria B2B",
    monthlyBudget: "R$ 14k",
    region: "SP",
  },
  {
    value: "Escritórios de engenharia",
    niche: "Engenharia",
    monthlyBudget: "R$ 10k",
    region: "MG",
  },
  {
    value: "Consultorias de RH e recrutamento",
    niche: "RH e Recrutamento",
    monthlyBudget: "R$ 9k",
    region: "SP",
  },
  {
    value: "Assessorias de investimento",
    niche: "Investimentos",
    monthlyBudget: "R$ 15k",
    region: "SP",
  },
  { value: "Corretores de seguros", niche: "Seguros", monthlyBudget: "R$ 7k", region: "PR" },
  {
    value: "Despachantes e assessorias documentais",
    niche: "Despachante",
    monthlyBudget: "R$ 4k",
    region: "GO",
  },

  // --- Educação ---
  { value: "Escolas de idiomas", niche: "Educação idiomas", monthlyBudget: "R$ 5k", region: "PE" },
  {
    value: "Cursos profissionalizantes",
    niche: "Cursos profissionalizantes",
    monthlyBudget: "R$ 6k",
    region: "CE",
  },
  {
    value: "Escolas particulares",
    niche: "Educação particular",
    monthlyBudget: "R$ 10k",
    region: "SP",
  },
  {
    value: "Infoprodutores e cursos online",
    niche: "Infoproduto",
    monthlyBudget: "R$ 8k",
    region: "SP",
  },
  { value: "Autoescolas", niche: "Autoescola", monthlyBudget: "R$ 5k", region: "MG" },
  { value: "Escolas de música", niche: "Educação musical", monthlyBudget: "R$ 4k", region: "RJ" },

  // --- Imóveis e Construção ---
  {
    value: "Imobiliárias e corretores",
    niche: "Imobiliário",
    monthlyBudget: "R$ 9k",
    region: "SC",
  },
  {
    value: "Arquitetos e designers de interiores",
    niche: "Arquitetura",
    monthlyBudget: "R$ 8k",
    region: "RJ",
  },
  {
    value: "Construtoras e incorporadoras",
    niche: "Construção civil",
    monthlyBudget: "R$ 18k",
    region: "SP",
  },
  {
    value: "Lojas de materiais de construção",
    niche: "Materiais de construção",
    monthlyBudget: "R$ 7k",
    region: "GO",
  },
  {
    value: "Empresas de energia solar",
    niche: "Energia solar",
    monthlyBudget: "R$ 12k",
    region: "MG",
  },
  { value: "Paisagistas e jardinagem", niche: "Paisagismo", monthlyBudget: "R$ 5k", region: "SP" },

  // --- Alimentação e Gastronomia ---
  {
    value: "Restaurantes e gastronomia",
    niche: "Gastronomia",
    monthlyBudget: "R$ 6k",
    region: "SP",
  },
  { value: "Confeitarias e docerias", niche: "Confeitaria", monthlyBudget: "R$ 4k", region: "MG" },
  {
    value: "Franquias de alimentação",
    niche: "Franquia alimentação",
    monthlyBudget: "R$ 10k",
    region: "SP",
  },
  {
    value: "Distribuidoras de alimentos",
    niche: "Distribuição alimentos",
    monthlyBudget: "R$ 8k",
    region: "PR",
  },

  // --- Beleza e Moda ---
  { value: "Salões de beleza e barbearias", niche: "Beleza", monthlyBudget: "R$ 5k", region: "RJ" },
  { value: "Lojas de roupas e moda", niche: "Moda", monthlyBudget: "R$ 7k", region: "SP" },
  { value: "E-commerces de cosméticos", niche: "Cosméticos", monthlyBudget: "R$ 9k", region: "SP" },
  { value: "Joalherias e relojoarias", niche: "Joalheria", monthlyBudget: "R$ 10k", region: "SP" },

  // --- Tecnologia e Digital ---
  {
    value: "Agências de marketing digital",
    niche: "Marketing digital",
    monthlyBudget: "R$ 10k",
    region: "SP",
  },
  {
    value: "Software houses e startups SaaS",
    niche: "SaaS",
    monthlyBudget: "R$ 15k",
    region: "SC",
  },
  {
    value: "E-commerces e lojas virtuais",
    niche: "E-commerce",
    monthlyBudget: "R$ 8k",
    region: "SP",
  },
  {
    value: "Empresas de TI e suporte técnico",
    niche: "TI e suporte",
    monthlyBudget: "R$ 9k",
    region: "PR",
  },

  // --- Automotivo ---
  {
    value: "Oficinas mecânicas",
    niche: "Mecânica automotiva",
    monthlyBudget: "R$ 5k",
    region: "MG",
  },
  {
    value: "Concessionárias e revendas de veículos",
    niche: "Revenda veículos",
    monthlyBudget: "R$ 14k",
    region: "SP",
  },
  {
    value: "Locadoras de veículos",
    niche: "Locação veículos",
    monthlyBudget: "R$ 10k",
    region: "RJ",
  },
  {
    value: "Auto centers e acessórios",
    niche: "Auto center",
    monthlyBudget: "R$ 6k",
    region: "GO",
  },

  // --- Pet ---
  { value: "Pet shops e banho e tosa", niche: "Pet shop", monthlyBudget: "R$ 5k", region: "SP" },
  { value: "Hotéis e creches para pets", niche: "Hotel pet", monthlyBudget: "R$ 6k", region: "RJ" },

  // --- Turismo e Eventos ---
  { value: "Agências de viagem e turismo", niche: "Turismo", monthlyBudget: "R$ 7k", region: "SC" },
  { value: "Hotéis e pousadas", niche: "Hotelaria", monthlyBudget: "R$ 10k", region: "BA" },
  {
    value: "Organizadoras de eventos e buffets",
    niche: "Eventos",
    monthlyBudget: "R$ 8k",
    region: "SP",
  },
  { value: "Fotógrafos e videomakers", niche: "Fotografia", monthlyBudget: "R$ 5k", region: "RJ" },

  // --- Indústria e Comércio ---
  {
    value: "Indústrias de pequeno porte",
    niche: "Indústria",
    monthlyBudget: "R$ 12k",
    region: "SP",
  },
  {
    value: "Distribuidoras e atacadistas",
    niche: "Distribuição",
    monthlyBudget: "R$ 10k",
    region: "PR",
  },
  {
    value: "Gráficas e comunicação visual",
    niche: "Gráfica",
    monthlyBudget: "R$ 6k",
    region: "MG",
  },
  {
    value: "Empresas de logística e transporte",
    niche: "Logística",
    monthlyBudget: "R$ 11k",
    region: "SP",
  },

  // --- Agro ---
  { value: "Empresas do agronegócio", niche: "Agronegócio", monthlyBudget: "R$ 15k", region: "MT" },
  {
    value: "Cooperativas agrícolas",
    niche: "Cooperativa agrícola",
    monthlyBudget: "R$ 12k",
    region: "PR",
  },
  {
    value: "Revendas de insumos agrícolas",
    niche: "Insumos agrícolas",
    monthlyBudget: "R$ 10k",
    region: "GO",
  },

  // --- Serviços Gerais ---
  {
    value: "Empresas de limpeza e conservação",
    niche: "Limpeza",
    monthlyBudget: "R$ 5k",
    region: "SP",
  },
  {
    value: "Empresas de segurança patrimonial",
    niche: "Segurança",
    monthlyBudget: "R$ 8k",
    region: "RJ",
  },
  { value: "Lavanderias", niche: "Lavanderia", monthlyBudget: "R$ 4k", region: "SP" },
  { value: "Chaveiros e assistência 24h", niche: "Chaveiro", monthlyBudget: "R$ 3k", region: "MG" },
  {
    value: "Dedetizadoras e controle de pragas",
    niche: "Controle de pragas",
    monthlyBudget: "R$ 5k",
    region: "SP",
  },
];
