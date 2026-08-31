# Pentelligence

Pentelligence is a local, AI-assisted reconnaissance dashboard for **authorized** security testing. It combines a React/Vite interface with an Express and SQLite API that can coordinate Nmap, Subfinder, Nuclei, and Groq-based analysis.

> Only scan systems you own or have explicit written authorization to test. The operator is responsible for defining scope and complying with all applicable rules.

## Current capabilities

- Start and track reconnaissance scans from the dashboard.
- Discover subdomains with Subfinder and enumerate services with Nmap.
- Store scans, hosts, ports, agent logs, and findings in SQLite.
- Run Groq-assisted analysis when `GROQ_API_KEY` is configured.
- Run Nuclei scans and view confirmed findings.

The external tools are optional during development: missing tools are reported by the application rather than installed automatically.

## Requirements

- Node.js 22.12 or newer (`.nvmrc` pins the baseline version).
- npm 10 or newer.
- Optional scanner tools: Nmap, Subfinder, and Nuclei.
- A Groq API key only if AI-assisted analysis is required.

## Local setup

```bash
git clone https://github.com/kx7m2qd/Pentelligence.git
cd Pentelligence
npm ci
cp .env.example .env
```

Set only the values you need in `.env`; never commit it. At minimum, the server uses `PORT=3001`. Add `GROQ_API_KEY` to enable AI analysis.

Run the frontend and API together:

```bash
npm start
```

Open <http://localhost:5173>. The API runs on <http://localhost:3001>.

## Verification

Before opening a pull request, run:

```bash
npm run lint
npm run build
```

Run these checks locally before opening a pull request; the pull-request template records the results.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check API availability and Groq configuration status. |
| `POST` | `/api/recon/start` | Start an authorized recon scan with `{ "target": "example.com" }`. |
| `GET` | `/api/recon/status/:scanId` | Read scan status, hosts, ports, and subdomains. |
| `GET` | `/api/recon/scans` | List prior scans. |
| `DELETE` | `/api/recon/scan/:scanId` | Delete a scan and its related records. |
| `POST` | `/api/agent/run/:scanId` | Start Groq-assisted analysis for an existing scan. |
| `GET` | `/api/agent/findings/:scanId` | Read AI-generated findings. |
| `POST` | `/api/nuclei/run/:scanId` | Start Nuclei against hosts in an existing scan. |
| `GET` | `/api/nuclei/findings/:scanId` | Read confirmed Nuclei findings. |

## Contributing workflow

1. Start from updated `main` and create one focused branch: `feat/...`, `fix/...`, `docs/...`, or `chore/...`.
2. Keep each pull request scoped to one purpose and describe the user-facing impact.
3. Update documentation when behavior, configuration, or an API contract changes.
4. Run the verification commands above and state the results in the pull request.
5. Never commit secrets, scanner output, SQLite data, `node_modules`, or built `dist` assets.

Use conventional commit prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, and `chore:`.

## Repository structure

```text
src/                 React dashboard
server/              Express API, database, routes, scanner/AI modules
.env.example         Safe environment-variable template
.github/workflows/   Continuous-integration checks
```

## Security note

Treat scanner results, target names, and access credentials as sensitive. Keep production API keys in local environment variables or a secrets manager; rotate a key immediately if it is exposed.
