// Re-export from modular connectors — see lib/connectors/ for implementation
export type {
  ProspectSearchResult,
  ProspectSearchRequest,
  ProspectSearchResponse,
} from "./connectors";

export { searchProspects } from "./connectors";
