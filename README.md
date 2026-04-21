<div align="center">

```
██████╗ ███████╗███╗   ██╗████████╗███████╗██╗     ██╗     ██╗ ██████╗ ███████╗███╗   ██╗ ██████╗███████╗
██╔══██╗██╔════╝████╗  ██║╚══██╔══╝██╔════╝██║     ██║     ██║██╔════╝ ██╔════╝████╗  ██║██╔════╝██╔════╝
██████╔╝█████╗  ██╔██╗ ██║   ██║   █████╗  ██║     ██║     ██║██║  ███╗█████╗  ██╔██╗ ██║██║     █████╗
██╔═══╝ ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ██║     ██║     ██║██║   ██║██╔══╝  ██║╚██╗██║██║     ██╔══╝
██║     ███████╗██║ ╚████║   ██║   ███████╗███████╗███████╗██║╚██████╔╝███████╗██║ ╚████║╚██████╗███████╗
╚═╝     ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
```

### *AI-powered penetration testing. From recon to report — fully automated.*

<br/>

[![Live Demo](https://img.shields.io/badge/🔐_Live_Demo-Try_Pentelligence-red?style=for-the-badge)](#)
[![Claude AI](https://img.shields.io/badge/Agent-Claude_API-blueviolet?style=for-the-badge&logo=anthropic)](https://anthropic.com)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Status](https://img.shields.io/badge/Status-Active_Development-orange?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br/>

> **A senior pentester takes days to go from recon to report.**  
> *Pentelligence does it in minutes — and writes the report too.*

<br/>

![Pentelligence Dashboard Preview](https://raw.githubusercontent.com/yourusername/pentelligence/main/docs/assets/dashboard-preview.gif)

</div>

---

## ✦ What Is Pentelligence?

Pentelligence is a **full-stack AI-powered penetration testing platform** that automates the entire pentest lifecycle — from initial reconnaissance to exploit execution to client-ready PDF report — using a Claude AI agent loop at its core.

It doesn't just run tools. It **reasons** over the output, matches CVEs to fingerprints, decides what to probe next, generates targeted payloads, and explains every finding in plain English — the way a seasoned security engineer would.

Point it at an authorized target. Watch it think.

---

## ✦ The Pipeline

```
                         ┌─────────────────────┐
  Target URL / IP  ─────►│   Recon Engine       │
                         │  nmap · subfinder    │
                         └────────┬────────────┘
                                  │  open ports · subdomains · services
                                  ▼
                         ┌─────────────────────┐
                         │   Fingerprint DB     │
                         │      SQLite          │
                         └────────┬────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │       Claude AI Agent       │
                    │                            │
                    │  • Maps services → CVEs     │
                    │  • Decides next action      │
                    │  • Generates payloads       │
                    │  • Reasons over findings    │
                    └──────┬──────────┬──────────┘
                           │          │
               ┌───────────▼──┐  ┌────▼──────────────┐
               │ Scan Engine  │  │  Exploit Engine    │
               │   nuclei     │  │  sqlmap · playwright│
               │  templates   │  │  custom payloads   │
               └───────┬──────┘  └────────┬───────────┘
                       │                  │
                       └────────┬─────────┘
                                ▼
                    ┌───────────────────────┐
                    │    Report Generator   │
                    │  Claude + pdfkit      │
                    │  Human-readable PDF   │
                    └───────────────────────┘
```

---

## ✦ Why This Is Different

Most "automated pentest tools" are just scanners with a UI slapped on top. They run nmap, dump raw output, and call it a day.

Pentelligence has an **AI agent that actually thinks** between each phase:

- After recon → Claude reads the port map and decides *which* nuclei templates are actually relevant for these specific services
- After scanning → Claude maps findings to real CVE entries and ranks them by exploitability
- Before exploiting → Claude generates targeted payloads based on the tech stack, not generic ones
- After everything → Claude writes the report in the tone and structure a real client expects — executive summary, technical findings, remediation steps

It's not a scanner. It's a reasoning loop that uses scanners as tools.

---

## ✦ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite | Fast dev, clean component model |
| Backend | Node.js + Express | Non-blocking I/O — ideal for long-running scan processes |
| Database | SQLite (better-sqlite3) | Zero-config persistence, fast reads, perfect for scan data |
| AI Agent | Claude API (Anthropic) | Best-in-class reasoning, structured JSON output, large context window |
| Recon | nmap + subfinder | Industry standard — trusted by professionals worldwide |
| Scanning | nuclei | Template-based, maintained by ProjectDiscovery |
| Exploitation | sqlmap + Playwright | SQL injection automation + headless browser-based attacks |
| Reporting | pdfkit + Handlebars | Programmatic PDF generation with template engine |
| Task Queue | p-queue | Concurrency control for parallel scan operations |
| Process Runner | execa | Clean child process management for external tool calls |

---

## ✦ Features

| Feature | Status |
|---|---|
| 🖥️ Full dashboard UI with live terminal output | ✅ Done |
| 🔍 Recon view — host map + subdomain enumeration | ✅ Done |
| 🧪 Scan view — nuclei template configuration | ✅ Done |
| 💥 Exploit view — payload editor + output panel | ✅ Done |
| 📄 Report view — builder + PDF export | ✅ Done |
| ⚙️ Express backend + REST API | ✅ Done |
| 🗄️ SQLite schema + persistence layer | ✅ Done |
| 🛰️ nmap wrapper + XML parser | ✅ Done |
| 🌐 subfinder subdomain wrapper | ✅ Done |
| 🤖 Claude AI agent loop (CVE matching + decisions) | 🔄 In Progress |
| 🔬 nuclei scanner integration + live results | 🔄 In Progress |
| 💉 sqlmap + Playwright exploit engine | 🔄 In Progress |
| 📑 Claude-written PDF report export | 🔄 In Progress |
| 🧠 NVD feed ingestion + CVE vector embeddings | 📋 Planned |

---

## ✦ Claude Agent — How It Thinks

The AI agent loop is the core of what makes Pentelligence different from a script that runs tools.

```javascript
// Claude receives the full context at each decision point
const agentPrompt = `
You are a senior penetration tester.

TARGET: ${target}
OPEN PORTS: ${JSON.stringify(ports)}
SERVICES DETECTED: ${JSON.stringify(services)}
SUBDOMAINS FOUND: ${JSON.stringify(subdomains)}
PRIOR FINDINGS: ${JSON.stringify(previousFindings)}

Based on this fingerprint:
1. Which CVEs are most relevant? (list with CVSS scores)
2. What should we scan next and with which nuclei templates?
3. What payloads should we attempt first?
4. What is the overall risk level and why?

Respond in structured JSON.
`;

// Claude returns a structured decision
{
  "cves": [
    { "id": "CVE-2023-44487", "cvss": 7.5, "service": "nginx/1.18.0", "confidence": "high" },
    { "id": "CVE-2021-41773", "cvss": 9.8, "service": "Apache/2.4.49", "confidence": "medium" }
  ],
  "next_action": "scan",
  "nuclei_templates": ["http/cves/2023/CVE-2023-44487.yaml", "http/vulnerabilities/apache/"],
  "risk_level": "critical",
  "reasoning": "Apache version 2.4.49 is confirmed by banner grab on port 443. CVE-2021-41773 is a path traversal with known public exploits..."
}
```

Every decision is logged. You see exactly what the agent reasoned and why it did what it did.

---

## ✦ Project Structure

```
pentelligence/
├── server/
│   ├── index.js                # Express entry point
│   ├── db.js                   # SQLite schema + setup
│   ├── routes/
│   │   ├── recon.js            # /api/recon — nmap + subfinder
│   │   ├── scan.js             # /api/scan — nuclei runner
│   │   ├── exploit.js          # /api/exploit — sqlmap + playwright
│   │   └── report.js           # /api/report — Claude + pdfkit
│   └── modules/
│       ├── nmap.js             # nmap process wrapper + XML parser
│       ├── subfinder.js        # subfinder subprocess wrapper
│       ├── nuclei.js           # nuclei template runner
│       ├── claude.js           # Claude agent loop + decision engine
│       └── report.js           # PDF report generator
│
├── src/
│   ├── App.jsx                 # Root layout + sidebar + routing
│   ├── views/
│   │   ├── Dashboard.jsx       # Overview + live terminal
│   │   ├── Recon.jsx           # Host map + subdomain tree
│   │   ├── Scan.jsx            # Template picker + live results
│   │   ├── Exploit.jsx         # Payload editor + output console
│   │   └── Report.jsx          # Report builder + PDF export
│   └── components/             # Shared UI — Terminal, Badge, etc.
│
├── data/
│   └── pentest.db              # SQLite — auto-created on first run
│
├── .env.example
├── vite.config.js
└── package.json
```

---

## ✦ Getting Started

### Prerequisites

```bash
node >= 18.0.0
npm  >= 9.0.0
```

### Security Tools

```bash
# nmap — port scanner
brew install nmap          # macOS
sudo apt install nmap      # Ubuntu / Debian

# subfinder — subdomain enumeration (requires Go)
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

# nuclei — vulnerability scanner
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Verify all installs
nmap --version && subfinder --version && nuclei --version
```

> **No tools?** No problem. The engine **auto-falls back to mock data** if security tools aren't installed — the full UI works during development without any of them.

### Installation

```bash
# 1. Clone
git clone https://github.com/yourusername/pentelligence.git
cd pentelligence

# 2. Install
npm install

# 3. Environment
cp .env.example .env
```

Edit `.env`:

```env
PORT=3001
ANTHROPIC_API_KEY=sk-ant-...
```

### Run

```bash
# Both frontend + backend together
npm start

# Or separately
npm run server    # API on :3001
npm run dev       # UI on :5173
```

Open [`http://localhost:5173`](http://localhost:5173)

---

## ✦ API Reference

### Recon Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/recon/start` | Launch recon against a target |
| `GET` | `/api/recon/status/:scanId` | Poll scan results |
| `GET` | `/api/recon/scans` | List all historical scans |
| `DELETE` | `/api/recon/scan/:scanId` | Remove a scan record |

```bash
# Start a recon scan
curl -X POST http://localhost:3001/api/recon/start \
  -H "Content-Type: application/json" \
  -d '{"target": "scanme.nmap.org"}'

# Poll for results
curl http://localhost:3001/api/recon/status/1
```

> `scanme.nmap.org` is a **legal public test host** maintained by the nmap project. Safe to use during development.

---

## ✦ Development Roadmap

| Branch | Status | Scope |
|---|---|---|
| `feature/initial-setup` | ✅ Merged | Full frontend scaffold — all 5 views |
| `feat/recon-engine` | 🔄 In Progress | nmap + subfinder + SQLite + REST API |
| `feat/claude-agent` | ⬜ Queued | Claude AI loop — CVE matching + next-action decisions |
| `feat/nuclei-integration` | ⬜ Queued | nuclei scanner + live streaming results |
| `feat/exploit-engine` | ⬜ Queued | sqlmap + Playwright + custom payload generation |
| `feat/report-generator` | ⬜ Queued | Claude-written report + pdfkit PDF export |
| `feat/sqlite-db` | ⬜ Queued | Full persistent DB across all modules |
| `feat/ml-cve-pipeline` | 🔮 Future | NVD feed ingestion + CVE vector embeddings |

---

## ✦ Legal & Ethics

**This tool is built for authorized security testing only.**

- ✅ Only scan targets you have **explicit written permission** to test
- ✅ Use against your own systems, lab VMs, or legal CTF environments
- ❌ Never run against systems you do not own or have authorization for
- ❌ The authors bear no responsibility for misuse

**Legal targets for development and testing:**

| Target | Type | Notes |
|---|---|---|
| `scanme.nmap.org` | Public host | Officially maintained by nmap project |
| Local VMs / Docker | Self-hosted | Safest option — full control |
| HackTheBox machines | CTF platform | Requires active subscription |
| TryHackMe rooms | CTF platform | Many free rooms available |

Security is about protecting people. Build responsibly.

---

## ✦ Contributing

```bash
# 1. Fork the repo, then clone
git clone https://github.com/yourusername/pentelligence.git

# 2. Create a feature branch
git checkout -b feat/your-feature-name

# 3. Make your changes and commit
git commit -m "feat: describe what you built"

# 4. Push and open a PR into main
git push origin feat/your-feature-name
```

**Commit convention:**

| Prefix | Use for |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code cleanup — no behaviour change |
| `docs:` | README or comment updates |
| `chore:` | Deps, config, tooling |

---

## ✦ License

MIT — see [LICENSE](./LICENSE) for full terms.

---

<div align="center">

**A penetration test should find what attackers would find.**  
*Pentelligence finds it first — and explains exactly what to do about it.*

<br/>

Built with  Nmap · subfinder · nuclei · sqlmap · React · Node.js

</div>
