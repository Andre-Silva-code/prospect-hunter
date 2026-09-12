# Prospect Hunter

[![CI](https://github.com/your-username/prospect-hunter/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/prospect-hunter/actions/workflows/ci.yml)

Sistema de prospecção comercial da L3A Digital para o serviço de gestão de Google Meu Negócio (GMN). Encontra empresas, qualifica oportunidades e executa a cadência de contato por WhatsApp com apoio de IA.

## 📋 Overview

O Prospect Hunter centraliza o funil comercial de ponta a ponta:

- **Prospecção multi-fonte** — busca empresas por nicho e cidade em Google Places, Instagram, LinkedIn, Apify, Serper e Google CSE (com fallback entre as fontes)
- **GBP Check** — detecta se a empresa tem perfil no Google Meu Negócio e gera auditoria/relatório
- **Qualificação de leads** — score de fit comercial (0–100) que recomenda o Funil A (empresa COM perfil GMN) ou o Funil B (empresa SEM perfil GMN)
- **Cadência de WhatsApp (Uazapi)** — sequência SPIN automática com follow-ups e gatilhos de saída (resposta ou silêncio)
- **Mensagens com IA** — Google Gemini para abordagem personalizada, com geração de relatórios em PDF
- **CRM / Pipeline** — move os leads por estágios, com analytics de resposta e follow-ups pendentes

## 🚀 Quick Start

### Prerequisites

- Node.js 18 LTS or higher
- npm or yarn
- GitHub account
- Supabase project (URL + anon key)
- Apify API token (for scraping)
- Google Gemini API key
- Uazapi token (para a cadência de WhatsApp)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/prospect-hunter.git
   cd prospect-hunter
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local and fill in your API keys
   ```

4. **Configure o login local (dev)**

   O Prospect Hunter usa sessão própria via cookie (não usa NextAuth). Para o ambiente
   de desenvolvimento, defina no `.env.local`:

   ```bash
   ENABLE_LOCAL_AUTH=true
   LOCAL_AUTH_EMAIL=voce@exemplo.com
   LOCAL_AUTH_PASSWORD=uma-senha-forte
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` - você verá a tela de login do Prospect Hunter.

## 📦 Available Scripts

```bash
# Development
npm run dev           # Start development server (http://localhost:3000)
npm run build         # Build for production
npm start             # Start production server

# Quality & Testing
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
npm test              # Run tests with Vitest
npm run type-check    # Check TypeScript types

# Pre-commit
husky install         # Initialize git hooks
```

## 🛠️ Development Workflow

### Creating a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### Code Quality

1. **ESLint & Prettier** run automatically on commit (via Husky pre-commit hook)
2. **Tests** must pass before committing
3. **TypeScript** types must be valid

### Committing Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add Instagram scraper integration"
git commit -m "fix: resolve authentication timeout"
git commit -m "refactor: simplify message generation logic"
git commit -m "docs: update API documentation"
git commit -m "test: add tests for message validation"
```

### Push & Create PR

```bash
git push origin feature/your-feature-name
# Then create PR on GitHub
```

## 📁 Project Structure

```
prospect-hunter/
├── app/                    # Next.js App Router pages & API routes
├── components/             # React components
├── lib/                    # Utilities, API clients, helpers
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript interfaces
├── services/               # Business logic (external API integration)
├── __tests__/              # Unit & integration tests
├── public/                 # Static assets
├── .github/workflows/      # GitHub Actions CI/CD
├── .env.example            # Environment variables template
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript configuration
├── next.config.mjs         # Next.js configuration
├── tailwind.config.mjs     # Tailwind CSS configuration
└── README.md               # This file
```

## 🔐 Environment Variables

Create `.env.local` from `.env.example`:

| Variable              | Required | Description                                                   |
| --------------------- | -------- | ------------------------------------------------------------- |
| `SUPABASE_URL`        | Yes      | Supabase project URL                                          |
| `SUPABASE_ANON_KEY`   | Yes      | Supabase public key                                           |
| `APIFY_TOKEN`         | Yes      | Apify API token (scraping)                                    |
| `GEMINI_API_KEY`      | Yes      | Google Gemini API key                                         |
| `UAZAPI_API_URL`      | Yes      | Endpoint da Uazapi (cadência de WhatsApp)                     |
| `UAZAPI_API_TOKEN`    | Yes      | Token da Uazapi                                               |
| `ENABLE_LOCAL_AUTH`   | No       | Ativa login local por email/senha (dev)                       |
| `LOCAL_AUTH_EMAIL`    | No       | Email do usuário local (quando `ENABLE_LOCAL_AUTH=true`)      |
| `LOCAL_AUTH_PASSWORD` | No       | Senha do usuário local (quando `ENABLE_LOCAL_AUTH=true`)      |
| `GOOGLE_MAPS_API_KEY` | No       | Google Places (fonte de prospecção)                           |
| `SERPER_API_KEY`      | No       | Serper.dev (alternativa de baixo custo ao Apify no Instagram) |
| `GOOGLE_CSE_API_KEY`  | No       | Google Custom Search (alternativa gratuita ao Apify)          |
| `SENTRY_DSN`          | No       | Sentry error tracking                                         |

> A lista completa de variáveis (incluindo os IDs de tasks/actors do Apify) está em [`.env.example`](./.env.example).

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test example.test.ts
```

Tests are located in `__tests__/` directory using Vitest.

## 🚢 Deployment

### Deploy to Vercel

1. **Push to GitHub**

   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import repository
   - Add environment variables (from `.env.example`)
   - Deploy

3. **Environment Variables in Vercel**
   - Add all variables from `.env.example` in Vercel dashboard
   - Deploy will run automatically on push to main

## 🐛 Troubleshooting

### Port 3000 already in use

```bash
npm run dev -- -p 3001
```

### Module not found errors

```bash
rm -rf node_modules package-lock.json
npm install
```

### ESLint errors prevent commit

```bash
npm run lint -- --fix
```

### Type checking errors

```bash
npm run type-check
```

## 📖 Documentation

- [Real Search Setup (Apify + Google Places)](./docs/real-search-setup.md)
- [Serper.dev — alternativa de custo baixo ao Apify (Instagram)](./docs/serper-setup.md)
- [Google Custom Search — alternativa gratuita ao Apify (Instagram)](./docs/google-cse-setup.md)
- [API Routes Design](./docs/api-spec.md)
- [Database Schema](./docs/schema.md)
- [Architecture](./docs/architecture.md)

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines.

## 📄 License

MIT License - see LICENSE file for details

## 👤 Author

André Silva - [@andresilva](https://github.com/andresilva)

---

**Status:** 🚀 Active Development

For issues or feature requests, please [open a GitHub issue](https://github.com/your-username/prospect-hunter/issues).
