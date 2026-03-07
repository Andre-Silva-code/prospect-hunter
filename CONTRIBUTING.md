# Contributing to Prospect Hunter

Thank you for contributing! This guide explains how to submit code, follow standards, and maintain quality.

## Code Style

We use **ESLint** and **Prettier** to enforce consistent code style.

### Before Committing

```bash
npm run lint -- --fix    # Auto-fix linting issues
npm run format           # Format all files with Prettier
```

Git hooks (Husky) will prevent commits with linting violations.

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format
```
type(scope): description

[optional body]
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring (no functional change)
- `perf` - Performance improvement
- `test` - Adding or updating tests
- `docs` - Documentation updates
- `chore` - Maintenance tasks
- `ci` - CI/CD configuration changes

### Examples
```bash
git commit -m "feat(auth): add Google OAuth login"
git commit -m "fix(api): handle Apify timeout errors"
git commit -m "refactor(components): simplify ProspectCard logic"
git commit -m "test: add tests for message validation"
git commit -m "docs: update API endpoint documentation"
```

## Pull Request Process

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes & test**
   ```bash
   npm run lint      # Check code quality
   npm test          # Run tests
   npm run type-check # Validate TypeScript
   ```

3. **Commit with conventional messages**
   ```bash
   git commit -m "feat: your feature description"
   ```

4. **Push to GitHub**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Provide clear description
   - Reference related issues (#123)
   - Ensure GitHub Actions CI passes

6. **Get review approval**
   - Address feedback from reviewers
   - Make additional commits if needed
   - Rebase and squash if requested

7. **Merge to main**
   - Maintainer merges PR
   - Feature branch auto-deleted

## Testing Requirements

- Add tests for new features
- Maintain >80% code coverage
- Run full test suite before committing

```bash
npm test              # Run all tests
npm test -- --ui     # Run tests with UI
```

## TypeScript

- Use strict mode (`strict: true`)
- Explicitly type function parameters and return values
- Avoid `any` types

```typescript
// ❌ Bad
function getMessage(data) {
  return data.message;
}

// ✅ Good
function getMessage(data: { message: string }): string {
  return data.message;
}
```

## File Naming

- **Components:** PascalCase (`ProspectCard.tsx`)
- **Utilities:** camelCase (`formatDate.ts`)
- **Types:** PascalCase (`Prospect.ts`)
- **Hooks:** camelCase with `use` prefix (`useProspects.ts`)

## Questions?

- Check [README.md](./README.md) for setup instructions
- See [docs/architecture.md](./docs/architecture.md) for system design
- Open a discussion for feature ideas
- Report bugs as GitHub issues

---

Thank you for making Prospect Hunter better! 🚀
