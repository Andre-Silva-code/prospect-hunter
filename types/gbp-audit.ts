export type GbpAuditData = {
  companyName: string;
  address: string;
  rating: number;
  reviewCount: number;
  hasWebsite: boolean;
  websiteUrl: string;
  phoneNumber: string;
  photoEstimate: "Poucos" | "Moderado" | "Muitos" | "Desconhecido";
  categoryOptimization: "Nao otimizada" | "Parcial" | "Otimizada";
  responseRate: string;
  overallScore: number;
  improvements: GbpImprovement[];
  competitors: GbpCompetitorInsight[];
};

export type GbpImprovement = {
  area: string;
  currentStatus: string;
  recommendation: string;
  impact: "Alto" | "Medio" | "Baixo";
};

export type GbpCompetitorInsight = {
  metric: string;
  yourValue: string;
  regionAverage: string;
  verdict: "Acima" | "Na media" | "Abaixo";
};

/** Campos que ficam borrados (redacted) no PDF teaser */
export type GbpBlurrableField =
  | "improvements"
  | "competitors"
  | "responseRate"
  | "categoryOptimization";

export type GbpAuditPdfOptions = {
  data: GbpAuditData;
  blurredFields: GbpBlurrableField[];
  brandName: string;
  brandColor: string;
};
