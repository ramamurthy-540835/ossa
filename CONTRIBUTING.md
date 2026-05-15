# Contributing to OSSA

Thank you for your interest in contributing to OSSA! We welcome contributions in any form — bug reports, feature requests, documentation improvements, and code submissions.

## How to Contribute

### Reporting Bugs
If you find a bug, please open an issue with:
- A clear description of the problem
- Steps to reproduce it
- Expected vs. actual behavior
- Your environment (Python version, Node version, OS, API keys used)

### Suggesting Features
Feature requests should include:
- A clear use case or problem it solves
- Examples of how it would be used
- Any potential impact on existing functionality

### Submitting Code

1. **Fork the repository** and create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit with clear messages:
   ```bash
   git commit -m 'feat: add new feature' 
   git commit -m 'fix: resolve issue with X'
   git commit -m 'docs: clarify setup instructions'
   ```

3. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Open a Pull Request** against `main` with:
   - A clear title and description
   - Reference to any related issues
   - Screenshots for UI changes
   - Test results if applicable

### Commit Message Guidelines

Use conventional commits for clarity:
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `refactor:` — code restructuring (no feature change)
- `test:` — test additions or fixes
- `chore:` — maintenance tasks

Example: `feat: add cost tracking for Azure provider`

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/ossa.git
cd ossa

# Backend dependencies
cd backend && pip install -r requirements.txt

# Frontend dependencies
cd ../frontend && npm install

# Start dev environment
cd .. && ./start.sh
```

## Areas We Welcome

- **LLM Provider Integrations** — add Azure OpenAI, Cohere, or other providers
- **Governance Policies** — new compliance frameworks or audit capabilities
- **Dashboard UI** — improvements to the React/Next.js frontend
- **Test Coverage** — unit, integration, and E2E tests
- **Documentation** — guides, examples, and API clarifications

## Code Style

- **Python:** Follow PEP 8; use `black` for formatting
- **TypeScript/React:** Use `prettier` for formatting; aim for strict TypeScript
- **YAML:** Use 2 spaces for indentation

## Testing

Before submitting a PR:
- Test your changes locally via `./start.sh`
- Verify the dashboard executes agents without errors
- Check that audit logs record your changes correctly
- Test with multiple LLM providers if your change touches orchestration

## Questions?

- Check [docs/getting-started.md](docs/getting-started.md) for setup help
- Review [docs/manifest-reference.md](docs/manifest-reference.md) for manifest format
- Ask in issues or discussions — we're here to help!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

*Thank you for making OSSA better!*
