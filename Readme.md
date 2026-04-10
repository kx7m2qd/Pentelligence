# Pentelligence

> AI-powered automated penetration testing engine built with Node.js, React, and Claude API.

![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-active--development-orange)
![Branch](https://img.shields.io/badge/branch-feat%2Frecon--engine-blue)

---

## What is this

Pentelligence is a full-stack automated pentest platform that combines traditional security tooling (nmap, subfinder, nuclei, sqlmap) with an AI agent layer powered by Claude. The AI reasons over scan output, matches CVEs to fingerprints, generates targeted payloads, and writes human-readable reports — all from a single dashboard.

---

## Architecture

```
Target
  │
  ▼
Recon (nmap + subfinder)
  │
  ▼
Fingerprint DB (SQLite)
  │
  ├──► Claude Agent  →  CVE matching + next action decisions
  │
  ▼
Scan (nuclei templates)
  │
  ▼
Exploit Engine (sqlmap + playwright + custom payloads)
  │
  ▼
Report Generator (Claude + pdfkit)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | SQLite via better-sqlite3 |
| AI Agent | Claude API (Anthropic) |
| Recon | nmap, subfinder |
| Scanning | nuclei |
| Exploitation | sqlmap, playwright |
| Reporting | pdfkit + handlebars |
| Task Queue | p-queue |
| Process runner | execa |

---

## Project Structure

```
pentelligence/
├── server/
│   ├── index.js              # Express server entry point
│   ├── db.js                 # SQLite setup + schema
│   ├── routes/
│   │   ├── recon.js          # /api/recon endpoints
│   │   ├── scan.js           # /api/scan endpoints (coming)
│   │   ├── exploit.js        # /api/exploit endpoints (coming)
│   │   └── report.js         # /api/report endpoints (coming)
│   └── modules/
│       ├── nmap.js           # nmap wrapper + XML parser
│       ├── subfinder.js      # subfinder wrapper
│       ├── nuclei.js         # nuclei wrapper (coming)
│       ├── claude.js         # Claude agent loop (coming)
│       └── report.js         # pdfkit report generator (coming)
├── src/
│   ├── App.jsx               # Root + sidebar + routing
│   ├── main.jsx              # React entry point
│   ├── index.css             # Global styles + CSS vars
│   ├── components/           # Shared UI components
│   ├── views/
│   │   ├── Dashboard.jsx     # Overview + live terminal
│   │   ├── Recon.jsx         # Host map + subdomains
│   │   ├── Scan.jsx          # Nuclei template config
│   │   ├── Exploit.jsx       # Payload editor + output
│   │   └── Report.jsx        # Report builder + export
│   ├── data/
│   │   └── constants.js      # Shared mock data + constants
│   └── utils/                # Helper functions
├── data/
│   └── pentest.db            # SQLite database (auto-created)
├── .env
├── .env.example
├── vite.config.js
├── package.json
└── README.md
```

---

## Prerequisites

Make sure these are installed before running the project.

### Required

- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/) v9+

### Security Tools (for real scans)

```bash
# nmap — port scanner
# macOS
brew install nmap

# Ubuntu / Debian
sudo apt install nmap

# subfinder — subdomain enumeration
# requires Go installed first: https://go.dev/dl/
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
```

Verify installations:

```bash
nmap --version
subfinder --version
```

> **Note:** If these tools are not installed, the engine falls back to mock data automatically so the UI still works during development.

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/pentelligence.git
cd pentelligence
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
PORT=3001
ANTHROPIC_API_KEY=your_claude_api_key_here
```

### 4. Run the app

```bash
# Run both frontend and backend together
npm start

# Or separately
npm run server   # backend on :3001
npm run dev      # frontend on :5173
```

### 5. Open in browser

```
http://localhost:5173
```

---

## API Reference

### Recon

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/recon/start` | Start a new recon scan |
| GET | `/api/recon/status/:scanId` | Get scan results |
| GET | `/api/recon/scans` | List all past scans |
| DELETE | `/api/recon/scan/:scanId` | Delete a scan |

**Start a scan:**

```bash
curl -X POST http://localhost:3001/api/recon/start \
  -H "Content-Type: application/json" \
  -d '{"target": "scanme.nmap.org"}'
```

**Get results:**

```bash
curl http://localhost:3001/api/recon/status/1
```

> `scanme.nmap.org` is a legal public target hosted by the nmap project for testing purposes.

---

## Development Roadmap

| Branch | Status | Description |
|---|---|---|
| `feature/initial-setup` | ✅ merged | Full frontend scaffold — all 5 views |
| `feat/recon-engine` | 🔄 in progress | nmap + subfinder + SQLite + REST API |
| `feat/claude-agent` | ⬜ queued | Claude API loop — CVE matching + decisions |
| `feat/nuclei-integration` | ⬜ queued | nuclei scanner + live results feed |
| `feat/exploit-engine` | ⬜ queued | sqlmap + playwright + payload engine |
| `feat/report-generator` | ⬜ queued | Claude report writer + pdfkit PDF export |
| `feat/sqlite-db` | ⬜ queued | Full persistent DB across all modules |
| `feat/ml-cve-pipeline` | ⬜ future | NVD feed ingestion + vector embeddings |

---

## Feature Status

| Feature | Status |
|---|---|
| Dashboard UI | ✅ done |
| Recon UI | ✅ done |
| Scan UI | ✅ done |
| Exploit UI | ✅ done |
| Report UI | ✅ done |
| Express backend | ✅ done |
| SQLite schema | ✅ done |
| nmap wrapper | ✅ done |
| subfinder wrapper | ✅ done |
| Claude agent loop | 🔄 coming |
| nuclei integration | 🔄 coming |
| Real exploit engine | 🔄 coming |
| PDF report export | 🔄 coming |
| ML / CVE embeddings | 🔄 future |

---

## Legal & Ethics

This tool is intended for **authorized penetration testing and security research only**.

- Only scan targets you have **explicit written permission** to test
- Never run this against systems you do not own or have authorization for
- The authors are not responsible for any misuse of this software
- Always comply with local laws and regulations regarding security testing

**Safe targets for development testing:**

- `scanme.nmap.org` — official nmap test host
- Your own local VMs or lab environments
- CTF / HackTheBox / TryHackMe machines

---

## Contributing

```bash
# create a feature branch
git checkout -b feat/your-feature

# make changes, then
git add .
git commit -m "feat: describe what you did"
git push origin feat/your-feature

# open a pull request into main
```

Commit message convention:

| Prefix | Use for |
|---|---|
| `feat:` | new feature |
| `fix:` | bug fix |
| `refactor:` | code cleanup, no feature change |
| `docs:` | README or comment updates |
| `chore:` | dependency updates, config |

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

<div align="center">
  Built with Claude API · nmap · subfinder · nuclei · React · Node.js
</div>