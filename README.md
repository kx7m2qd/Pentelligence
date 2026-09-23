<div align="center">
  <img src="design/brand/connected-p.svg" alt="Pentelligence Connected P concept" width="88" height="88">
  <h1>Pentelligence</h1>
  <p><strong>Discover. Connect. Investigate.</strong></p>
  <p>Recon, evidence, and exposure changes in one self-hosted workspace.<br>Real scanner integrations. Optional local AI. Your investigations, on your machine.</p>
  <p>
    <a href="https://github.com/kx7m2qd/Pentelligence/actions/workflows/ci.yml"><img src="https://github.com/kx7m2qd/Pentelligence/actions/workflows/ci.yml/badge.svg" alt="Verification workflow"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-b6f765?labelColor=111719" alt="MIT license"></a>
    <a href="#local-development"><img src="https://img.shields.io/badge/Node-24.21.0-b6f765?labelColor=111719" alt="Node 24.21.0"></a>
  </p>
  <p><a href="#quick-start">Quick start</a> · <a href="#the-workspace">Features</a> · <a href="#terminal-companion">Terminal</a> · <a href="#configuration">Configuration</a> · <a href="SECURITY.md">Security</a></p>
</div>

---

```text
  [P>] pentelligence
  ─────────────────────────────────────────────────────────
  RECON          Subdomains · ports · HTTP services
  INVESTIGATE    Surface map · findings · captured evidence
  COMPARE        New exposure · resolved findings · regressions
  REPORT         Review in the browser · export Markdown/JSON
  ─────────────────────────────────────────────────────────
  Self-hosted / SQLite / Groq or Ollama
```

*Product overview—not a screenshot of CLI output. The Connected P mark is an evolving logo concept.*

## The workspace

Start with an authorized target, explore discovered assets, inspect findings, and compare results over time.

| Capability | What you can do |
| --- | --- |
| **Recon pipeline** | Discover subdomains with Subfinder, enumerate ports/services with Nmap, and collect HTTP metadata |
| **Attack Surface Map** | Explore hosts and ports with risk styling, node inspection, zoom, recentering, and optional motion |
| **Finding review** | Filter findings, inspect evidence, and record review states |
| **Change comparison** | Identify new, resolved, or regressed findings between investigations |
| **AI assistance** | Choose Groq for cloud analysis or Ollama for local analysis |
| **Program scope** | Save allowed targets and exclusions; apply scope checks before reconnaissance |
| **Program monitoring** | Schedule an authorized target daily or weekly, with change-based Discord alerts |
| **History and reports** | Retain SQLite records and retry history; export Markdown/JSON reports |

AI suggestions are labelled separately from scanner findings. The interface uses “confirmed” for Nuclei template matches; a match still needs review and is not a guarantee of exploitability.

## Quick start

**Requirements:** Git, Docker with Compose, and an AI provider configured for AI analysis. The Docker image bundles scanner binaries.

### 1. Get the project

```bash
git clone https://github.com/kx7m2qd/Pentelligence.git
cd Pentelligence
cp .env.example .env
```

### 2. Choose your AI provider

Edit `.env` with one of these configurations:

<details open>
<summary><strong>Groq — cloud analysis</strong></summary>

```dotenv
AI_PROVIDER=groq
GROQ_API_KEY=your_key_here
```

Scan metadata used for AI analysis is sent to the configured cloud provider.

</details>

<details>
<summary><strong>Ollama — local analysis</strong></summary>

Start Ollama and pull your selected model:

```bash
ollama pull llama3.1:8b
```

For Pentelligence running inside Docker Desktop:

```dotenv
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
OLLAMA_MODEL=llama3.1:8b
```

For native Node execution, use `http://127.0.0.1:11434/v1`. Other Docker environments need a host address reachable from the container. Verify connectivity to Ollama from that environment.

</details>

### 3. Start the workspace

```bash
docker compose up --build
```

Open **[localhost:3001](http://localhost:3001)**. The production frontend and API share this port.

Create a program with your authorized scope, choose a target and scan profile, confirm authorization, and begin your investigation.

<details>
<summary><strong>Port already in use?</strong></summary>

```bash
APP_PORT=3015 docker compose up --build
```

Open [localhost:3015](http://localhost:3015). Update `CORS_ORIGINS` to match customized browser origins if needed.

</details>

## An investigation, from start to finish

```text
  Scope + target
       │
       ▼
  Discovery ──► Ports + services ──► HTTP observations
                                         │
                                         ▼
  Report ◄── Review findings ◄── AI ranking + Nuclei checks
```

1. **Live:** follow scan progress and engine logs.
2. **Surface:** investigate the topology, hosts, HTTP services, and subdomains.
3. **Findings:** inspect evidence and review individual results.
4. **Changes:** compare findings with an earlier investigation.
5. **Report:** review the summary and export results.

Programs hold scope rules; History reopens saved investigations. Active checks are disabled by default and must be enabled and armed separately.

### Scan profiles

| Port coverage | Selection |
| --- | --- |
| `quick` | Top 100 TCP ports |
| `standard` | Top 1,000 TCP ports |
| `full` | All TCP ports with a 10-minute per-host timeout; completion depends on the target and network |

Nuclei intensity is configured separately: **safe** uses 25 requests/second, **balanced** 50, and **fast** 100 with no retries. Full-port scans take longer and generate more traffic. A linked program profile supplies the fallback intensity when none is sent.

### Scheduled monitoring

Programs can watch one exact in-scope target every **24 hours** or **7 days** after recurring authorization is confirmed. The first run waits for the selected interval. Keep the backend running for schedules to execute.

The first successful scheduled investigation establishes a baseline. Later runs send Discord alerts for new/regressed findings or operational failures. Overlapping scans of the target are rejected.

Pausing prevents future scheduled runs without revalidating DNS or scope and preserves the saved target, cadence, and history. It does not cancel an already-running scan. Enabling a schedule still requires target/scope validation and recurring authorization.

## Terminal companion

The repository includes an **early CLI launcher** at [`bin/pentelligence.mjs`](bin/pentelligence.mjs). It calls a running backend to start a scan and prints its identifier and dashboard address.

```bash
# Show the current usage syntax (exits with status 1)
npm run pentelligence --
```

```text
Usage: npm run pentelligence -- scan example.com [--base http://localhost:3001] [--program ID]
```

The launcher supports `PENTELLIGENCE_URL` and `PENTELLIGENCE_ACCESS_TOKEN`. It creates a workspace session and submits authorization confirmation on invocation; use it only for explicitly authorized targets. Program IDs must belong to the resulting workspace. Browser session sharing, interactive authentication, live terminal progress, and a full terminal UI are not implemented by this launcher. The browser is currently the primary workflow.

## Configuration

See [`.env.example`](.env.example) for the full reference. Keep credentials in your local environment, not in Git.

| Variable | Purpose |
| --- | --- |
| `AI_PROVIDER` | `groq` or `ollama` |
| `GROQ_API_KEY`, `GROQ_MODEL` | Cloud AI credentials and model |
| `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Local provider endpoint and model |
| `APP_PASSWORD` | Optional access gate; at least 16 characters when set |
| `SESSION_TTL_HOURS` | Access-session lifetime |
| `APP_PORT`, `CORS_ORIGINS` | Docker host port and allowed browser origins |
| `MAX_CONCURRENT_SCANS` | Concurrent scanner task limit |
| `DISCORD_WEBHOOK_URL` | Optional notification destination |
| `ALLOW_PRIVATE_TARGETS` | Private/internal targets; defaults to `false` |
| `ENABLE_ACTIVE_EXPLOITATION` | Optional active-check workflow; defaults to `false` |
| `NUCLEI_TEMPLATES_DIR` | Nuclei template directory |
| `NUCLEI_VERSION`, `SUBFINDER_VERSION` | Docker scanner build versions; pin for reproducible releases |

Scope accepts exact assets or wildcard rules such as `*.example.com`. Exclusions take precedence. A linked program is recorded with the scan, and discovered out-of-scope subdomains are filtered before Nmap runs.

## Data and recovery

Docker Compose uses named volumes:

- `pentelligence-data`: SQLite investigation data in `data/pentest.db`.
- `nuclei-templates`: scanner template data.

Stopping the container preserves these volumes. Removing volumes deletes their stored data, so back them up before cleanup or migration.

Phase events and retry attempts persist in SQLite and are included in the JSON backup export. If the app stops during a scan, it marks that scan interrupted on the next startup. Retry it from History; automatic phase-by-phase resume is not implemented.

## Local development

Use **Node.js 24.21.0**, as specified in [`.nvmrc`](.nvmrc). Native development also requires scanner binaries in `PATH`: Subfinder, Nmap, Nuclei, and sqlmap for optional SQL injection checks.

```bash
cp .env.example .env  # First setup only; preserve an existing configuration
npm ci
npm run dev:all
```

Frontend: **[localhost:5173](http://localhost:5173)**. API: **port 3001**. For native runs, set `NUCLEI_TEMPLATES_DIR` to a host directory rather than the Docker-specific path in the environment template.

<details>
<summary><strong>Production build without Docker</strong></summary>

```bash
npm run build
npm start
```

Open [localhost:3001](http://localhost:3001). Scanner binaries and provider configuration are still required on the host.

</details>

### Verification

```bash
npm run lint
npm test
npm run build
```

For a running backend:

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/health/tools
```

## Deployment notes

- Set a unique `APP_PASSWORD` before sharing the instance or exposing it beyond your laptop.
- Use an HTTPS reverse proxy for remote access and restrict direct backend access.
- Back up persistent data and validate upgrades before replacing a working deployment.
- Keep private-target and active-check options disabled unless needed for your authorized workflow.
- The shared access gate is not a full multi-user identity and permissions system.
- Docker scans from its own network namespace. Private-network routing can differ from native execution. The supplied Compose configuration grants `NET_RAW` and `NET_ADMIN`; review those capabilities for your deployment.

The HTTP probe captures status, title, server header, content type, response size, redirect location, and response time without a separate `httpx` installation. Nuclei reads the configured template directory; missing templates can affect scan coverage.

## Feedback and security

[Open an issue](https://github.com/kx7m2qd/Pentelligence/issues) with reproducible steps and redacted diagnostics. Include your runtime and installation method; omit credentials and private target evidence.

For security concerns, follow [SECURITY.md](SECURITY.md).

## License and authorized use

Released under the [MIT License](LICENSE).

Use Pentelligence only against systems you own or have explicit permission to test, within the permitted scope and rate limits.
