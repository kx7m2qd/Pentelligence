# Pentelligence

AI-assisted recon and vulnerability triage dashboard with real scanner integrations.

## What Docker Solves

The app depends on external security tools:

- `subfinder` for subdomain discovery
- `nmap` for port and service detection
- `nuclei` for vulnerability confirmation
- `sqlmap` for optional SQL injection checks

Without Docker, every laptop must install those tools manually. With Docker, the image bundles them, so a new user only needs Docker and a `.env` file.

## Quick Start With Docker

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Configure deployment access in `.env`:

```bash
APP_PASSWORD=optional-local-access-gate
GROQ_API_KEY=your_key_here
```

3. Start the full app:

```bash
docker compose up --build
```

4. Open:

```text
http://localhost:3001
```

The React app and API are served from the same container on port `3001`.

If port `3001` is already busy:

```bash
APP_PORT=3015 docker compose up --build
```

Then open `http://localhost:3015`.

## Data Persistence

Docker Compose creates named volumes:

- `pentelligence-data` keeps `data/pentest.db`
- `nuclei-templates` keeps Nuclei template data

Stopping the container does not delete scan history.

## Using the Workspace

The UI is organized around one investigation at a time:

- **Setup** (shown when nothing is running): pick the target, link a bounty program, choose scan intensity (safe / balanced / fast) and port coverage (quick / standard / full), then confirm you are authorized. Without a linked program a second confirmation is required, and scans stay restricted to the single target entered.
- **Investigation** nav stages: Live (progress and engine log), Surface (topology map, hosts, HTTP services, subdomains), Findings (inbox with filters and review states), Report (preview plus Markdown/JSON export).
- **Workspace** nav: Programs (scope rules) and History (previous scans).
- **Advanced** nav: Nuclei rerun and active checks. Active checks are off by default and must be armed per investigation.

Findings are separated by source: nuclei template matches are marked confirmed, AI suggestions are labelled as suggestions and never counted as confirmed.

## Local Development

Use Node.js 22.12 or later (the repository includes `.nvmrc` for version managers that support it).

Install dependencies:

```bash
npm install
```

Run the dev frontend and backend:

```bash
npm run dev:all
```

Open:

```text
http://localhost:5173
```

For local development without Docker, your machine must have scanner tools installed and available in `PATH`.

## Production Run Without Docker

Build the frontend:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

Open:

```text
http://localhost:3001
```

## Environment

Important `.env` values:

- `GROQ_API_KEY`: enables AI analysis and report generation.
- `APP_PASSWORD`: optional local access gate. It protects the web UI with server-side sessions and is never sent to the browser.
- `SESSION_TTL_HOURS`: how long a signed-in browser may access the application.
- `ALLOW_PRIVATE_TARGETS`: keep `false` unless you intentionally scan private/internal ranges.
- `MAX_CONCURRENT_SCANS`: hard cap on active scanner tasks. Keep this low on a small host.
- `DISCORD_WEBHOOK_URL`: optional server-side Discord webhook for scan completion/failure notifications.

Programs are managed from the `Programs` screen. Use one exact rule for a single asset or a wildcard such as `*.example.com` for approved subdomains; exclusions always win. A selected program is attached to the scan record and discovered subdomains outside its rules are filtered before Nmap runs.
- `APP_PORT`: host port used by Docker Compose.
- `NUCLEI_VERSION` and `SUBFINDER_VERSION`: use `latest` or pin exact versions for reproducible images.

## Scanner Notes

Docker scans from inside the container network namespace. Public targets work normally. For local/private networks, routing and Docker Desktop network behavior can differ from a native host scan.

The compose file grants `NET_RAW` and `NET_ADMIN` to support deeper scanner behavior.

Port coverage is chosen at scan start: `quick` scans the top 100 ports, `standard` the top 1000, and `full` every TCP port with a 10 minute per-host timeout. The full profile is substantially slower and noisier, so the setup screen shows a warning for it.

## Verification

Run:

```bash
npm run lint
npm test
npm run build
```

When Docker is running, verify:

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/health/tools
```

## Production Checklist

- Set a unique `APP_PASSWORD` with at least 16 characters if the app is shared or exposed beyond your laptop.
- Put the container behind an HTTPS reverse proxy and expose only the proxy port publicly.
- Keep `ALLOW_PRIVATE_TARGETS=false` and `ENABLE_ACTIVE_EXPLOITATION=false` unless you have a documented, authorized internal-testing workflow.
- Persist and back up the `pentelligence-data` Docker volume. It contains scan records and authorization notes.
- Use a private image registry, pin scanner versions after validating them, and deploy updates through CI.
- Do not share the deployment password. For a true multi-user deployment, connect the API to an identity provider before granting external access.

The built-in HTTP probe records status, title, server header, content type, response size, redirect location, and response time without requiring a separate `httpx` installation. Nuclei rate limits and retries come from the scan intensity chosen at start: safe is 25 requests per second, balanced 50, fast 100 (no retries). A linked program profile is used as fallback when no intensity is sent. Nuclei templates are read from `NUCLEI_TEMPLATES_DIR` (default `~/nuclei-templates`); when that directory is missing, CVE-specific scans fall back to severity-based default templates.
