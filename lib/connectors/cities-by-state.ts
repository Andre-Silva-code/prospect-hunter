/**
 * Principais cidades por estado (UF), usadas na busca multi-cidade da fonte
 * "Sem Google Meu Negócio". Quando o usuário escolhe um estado sem cidade
 * específica, buscamos negócios sem GMN em cada uma destas cidades e juntamos
 * os resultados — mais volume de leads mantendo a qualidade.
 *
 * Lista curada com os maiores municípios de cada UF (foco em densidade de
 * negócios locais). Não é exaustiva: é um recorte prático para prospecção.
 */
export const MAIN_CITIES_BY_STATE: Record<string, string[]> = {
  AC: ["Rio Branco", "Cruzeiro do Sul"],
  AL: ["Maceió", "Arapiraca"],
  AP: ["Macapá", "Santana"],
  AM: ["Manaus", "Parintins"],
  BA: ["Salvador", "Feira de Santana", "Vitória da Conquista", "Camaçari", "Itabuna"],
  CE: ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Sobral"],
  DF: ["Brasília", "Taguatinga", "Ceilândia"],
  ES: ["Vitória", "Vila Velha", "Serra", "Cariacica"],
  GO: ["Goiânia", "Aparecida de Goiânia", "Anápolis"],
  MA: ["São Luís", "Imperatriz", "Timon"],
  MT: ["Cuiabá", "Várzea Grande", "Rondonópolis"],
  MS: ["Campo Grande", "Dourados", "Três Lagoas"],
  MG: ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim", "Uberaba"],
  PA: ["Belém", "Ananindeua", "Santarém", "Marabá"],
  PB: ["João Pessoa", "Campina Grande"],
  PR: ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel", "Foz do Iguaçu"],
  PE: ["Recife", "Jaboatão dos Guararapes", "Olinda", "Caruaru", "Petrolina"],
  PI: ["Teresina", "Parnaíba"],
  RJ: [
    "Rio de Janeiro",
    "São Gonçalo",
    "Duque de Caxias",
    "Nova Iguaçu",
    "Niterói",
    "Campos dos Goytacazes",
  ],
  RN: ["Natal", "Mossoró", "Parnamirim"],
  RS: ["Porto Alegre", "Caxias do Sul", "Pelotas", "Canoas", "Santa Maria"],
  RO: ["Porto Velho", "Ji-Paraná"],
  RR: ["Boa Vista"],
  SC: ["Florianópolis", "Joinville", "Blumenau", "Chapecó", "Criciúma", "Itajaí"],
  SP: [
    "São Paulo",
    "Guarulhos",
    "Campinas",
    "São Bernardo do Campo",
    "Santo André",
    "Ribeirão Preto",
    "Sorocaba",
    "Osasco",
  ],
  SE: ["Aracaju", "Nossa Senhora do Socorro"],
  TO: ["Palmas", "Araguaína"],
};

/**
 * Retorna as principais cidades de um estado (por UF ou nome). Quantidade
 * limitada por `max` para controlar o consumo de buscas. Se não reconhecer o
 * estado, retorna lista vazia (o chamador decide o fallback).
 */
export function mainCitiesForState(stateOrUf: string, max = 6): string[] {
  const uf = stateOrUf.trim().toUpperCase();
  const cities = MAIN_CITIES_BY_STATE[uf];
  if (cities) return cities.slice(0, max);
  return [];
}
