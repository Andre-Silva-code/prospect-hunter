# Prospect Hunter

[![CI](https://github.com/your-username/prospect-hunter/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/prospect-hunter/actions/workflows/ci.yml)

Automated prospect hunting system with Instagram scraping and AI-powered personalized messaging for medical professionals.

## 📋 Overview

Prospect Hunter automates the process of finding and contacting medical professionals on Instagram through:

- **Automated scraping** of Instagram profiles using Apify
- **AI-powered messaging** with Google Gemini for personalized outreach
- **Dashboard** to manage prospects and track engagement
- **Analytics** to measure response rates and conversion

## 🚀 Quick Start

### Prerequisites

- Node.js 18 LTS or higher
- npm or yarn
- GitHub account
- Apify API token (for scraping)
- Google Gemini API key

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

4. **Generate NextAuth secret**

   ```bash
   openssl rand -base64 32
   ```

   Copy the output and paste into `NEXTAUTH_SECRET` in `.env.local`

5. **Start development server**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` - you should see the Prospect Hunter canary page.

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
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── README.md               # This file
```

## 🔐 Environment Variables

Create `.env.local` from `.env.example`:

| Variable            | Required | Description                                                      |
| ------------------- | -------- | ---------------------------------------------------------------- |
| `SUPABASE_URL`      | Yes      | Supabase project URL                                             |
| `SUPABASE_ANON_KEY` | Yes      | Supabase public key                                              |
| `NEXTAUTH_SECRET`   | Yes      | Session encryption key (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL`      | Yes      | Auth callback URL (http://localhost:3000 for dev)                |
| `APIFY_TOKEN`       | Yes      | Apify API token for scraping                                     |
| `GEMINI_API_KEY`    | Yes      | Google Gemini API key                                            |
| `REDIS_URL`         | No       | Redis connection (for job queue)                                 |
| `SENTRY_DSN`        | No       | Sentry error tracking                                            |

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
