export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Prospect Hunter API",
    description:
      "API para prospecção automatizada de leads B2B com busca multicanal, geração de mensagens por IA e gestão de pipeline.",
    version: "1.0.0",
  },
  servers: [{ url: "/api", description: "API principal" }],
  components: {
    schemas: {
      LeadRecord: {
        type: "object",
        required: [
          "id",
          "userId",
          "company",
          "niche",
          "region",
          "monthlyBudget",
          "contact",
          "trigger",
          "stage",
          "score",
          "priority",
          "message",
          "contactStatus",
          "createdAt",
        ],
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          company: { type: "string" },
          niche: { type: "string" },
          region: { type: "string" },
          monthlyBudget: { type: "string" },
          contact: { type: "string" },
          trigger: { type: "string" },
          stage: {
            type: "string",
            enum: ["Novo", "Contato", "Diagnóstico", "Proposta", "Fechado", "Perdido"],
          },
          score: { type: "number" },
          priority: { type: "string", enum: ["Alta", "Media", "Baixa"] },
          message: { type: "string" },
          contactStatus: {
            type: "string",
            enum: ["Pendente", "Mensagem enviada", "Respondeu"],
          },
          createdAt: { type: "string", format: "date-time" },
          source: {
            type: "string",
            enum: ["Instagram", "LinkedIn", "Google Maps", "Google Meu Negócio"],
          },
          icp: { type: "string" },
          followUpIntervalDays: { type: "number" },
          followUpStep: { type: "number" },
          nextFollowUpAt: { type: "string", format: "date-time", nullable: true },
          lastContactAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      ProspectSearchResult: {
        type: "object",
        properties: {
          id: { type: "string" },
          company: { type: "string" },
          niche: { type: "string" },
          region: { type: "string" },
          monthlyBudget: { type: "string" },
          score: { type: "number" },
          priority: { type: "string", enum: ["Alta", "Media", "Baixa"] },
          trigger: { type: "string" },
          source: { type: "string" },
          icp: { type: "string" },
          contact: { type: "string" },
          sourceUrl: { type: "string" },
        },
      },
      DashboardMetrics: {
        type: "object",
        properties: {
          totalLeads: { type: "number" },
          leadsByStage: { type: "object" },
          leadsBySource: { type: "object" },
          responseRate: { type: "number" },
          conversionRate: { type: "number" },
          avgScore: { type: "number" },
          followUpsPending: { type: "number" },
          followUpsOverdue: { type: "number" },
          leadsThisWeek: { type: "number" },
          contactedThisWeek: { type: "number" },
        },
      },
      FollowUpAction: {
        type: "object",
        properties: {
          leadId: { type: "string" },
          company: { type: "string" },
          currentStep: { type: "number" },
          totalSteps: { type: "number" },
          nextTouchpoint: { type: "string" },
          nextScript: { type: "string" },
          dueAt: { type: "string", format: "date-time" },
          overdueDays: { type: "number" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "session",
        description: "Cookie de sessão obtido via /auth/login",
      },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    "/auth/login": {
      post: {
        summary: "Login com email e senha",
        tags: ["Auth"],
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login bem-sucedido" },
          401: { description: "Credenciais inválidas" },
        },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Encerrar sessão",
        tags: ["Auth"],
        responses: {
          200: { description: "Sessão encerrada" },
        },
      },
    },
    "/auth/me": {
      get: {
        summary: "Dados do usuário logado",
        tags: ["Auth"],
        responses: {
          200: { description: "Dados do usuário" },
          401: { description: "Não autenticado" },
        },
      },
    },
    "/leads": {
      get: {
        summary: "Listar leads do usuário",
        tags: ["Leads"],
        responses: {
          200: {
            description: "Lista de leads",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/LeadRecord" } },
              },
            },
          },
          401: { description: "Não autenticado" },
        },
      },
      post: {
        summary: "Criar novo lead",
        tags: ["Leads"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LeadRecord" },
            },
          },
        },
        responses: {
          201: {
            description: "Lead criado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LeadRecord" },
              },
            },
          },
          401: { description: "Não autenticado" },
        },
      },
    },
    "/leads/{leadId}": {
      patch: {
        summary: "Atualizar lead",
        tags: ["Leads"],
        parameters: [{ name: "leadId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LeadRecord" },
            },
          },
        },
        responses: {
          200: {
            description: "Lead atualizado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LeadRecord" },
              },
            },
          },
          404: { description: "Lead não encontrado" },
        },
      },
    },
    "/leads/{leadId}/contact": {
      post: {
        summary: "Registrar contato e avançar follow-up",
        tags: ["Follow-up"],
        parameters: [{ name: "leadId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Follow-up avançado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LeadRecord" },
              },
            },
          },
          404: { description: "Lead não encontrado" },
        },
      },
    },
    "/leads/due-followups": {
      get: {
        summary: "Listar follow-ups pendentes/atrasados",
        tags: ["Follow-up"],
        responses: {
          200: {
            description: "Lista de follow-ups pendentes",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/FollowUpAction" },
                },
              },
            },
          },
          401: { description: "Não autenticado" },
        },
      },
    },
    "/prospecting/search": {
      post: {
        summary: "Buscar prospects em múltiplas fontes",
        tags: ["Prospecção"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["icp", "niche", "region", "sources"],
                properties: {
                  icp: { type: "string" },
                  niche: { type: "string" },
                  region: { type: "string" },
                  sources: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["Instagram", "LinkedIn", "Google Maps", "Google Meu Negócio"],
                    },
                  },
                  limitPerSource: { type: "number", default: 5, minimum: 1, maximum: 20 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Resultados da busca",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    results: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ProspectSearchResult" },
                    },
                    connectorStatus: { type: "object" },
                  },
                },
              },
            },
          },
          429: { description: "Rate limit excedido" },
        },
      },
    },
    "/gemini/generate-message": {
      post: {
        summary: "Gerar mensagem de outreach com IA",
        tags: ["Mensagens"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["company", "niche", "region", "trigger", "priority"],
                properties: {
                  company: { type: "string" },
                  niche: { type: "string" },
                  region: { type: "string" },
                  trigger: { type: "string" },
                  priority: { type: "string", enum: ["Alta", "Media", "Baixa"] },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Mensagem gerada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    provider: { type: "string", enum: ["gemini", "fallback"] },
                  },
                },
              },
            },
          },
          429: { description: "Rate limit excedido" },
        },
      },
    },
    "/analytics": {
      get: {
        summary: "Métricas do dashboard",
        tags: ["Analytics"],
        responses: {
          200: {
            description: "Métricas calculadas",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DashboardMetrics" },
              },
            },
          },
          401: { description: "Não autenticado" },
        },
      },
    },
  },
};
