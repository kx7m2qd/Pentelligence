export const NAV = [
  { id:"dashboard", icon:"⬡", label:"Dashboard" },
  { id:"recon",     icon:"◎", label:"Recon" },
  { id:"scan",      icon:"⊞", label:"Scan" },
  { id:"exploit",   icon:"⚡", label:"Exploit" },
  { id:"report",    icon:"▤",  label:"Report" },
];

export const MODULES = [
  { key:"recon",   label:"Subdomain enum",    status:"done",    time:"0:34", count:23 },
  { key:"portscan",label:"Port scan",          status:"done",    time:"1:12", count:8  },
  { key:"nuclei",  label:"Nuclei templates",  status:"running", time:"2:41", count:4  },
  { key:"api",     label:"API surface map",   status:"pending", time:"—",    count:0  },
  { key:"exploit", label:"Exploit engine",    status:"pending", time:"—",    count:0  },
];

export const FINDINGS = [
  { sev:"CRITICAL", cve:"CVE-2021-41773", title:"Path traversal + RCE",  host:"api.target.io:443",  score:9.8 },
  { sev:"HIGH",     cve:"CVE-2022-22963", title:"Spring4Shell RCE",       host:"app.target.io:8080", score:8.1 },
  { sev:"HIGH",     cve:"CVE-2023-44487", title:"HTTP/2 Rapid Reset",     host:"cdn.target.io:443",  score:7.5 },
  { sev:"MEDIUM",   cve:"CVE-2022-3786",  title:"OpenSSL buffer overflow", host:"mail.target.io:25", score:5.9 },
  { sev:"LOW",      cve:"MISC-0192",      title:"Open redirect",          host:"app.target.io:80",   score:3.1 },
];

export const LOGS = [
  "[00:00] Initializing Pentelligence engine v0.1.0",
  "[00:01] Target: app.target.io — scope: all",
  "[00:02] Starting subdomain enumeration via subfinder",
  "[00:12] Found 23 subdomains — writing to db",
  "[00:14] Nmap scan started on 23 hosts (SYN stealth)",
  "[00:46] Open ports: 8x hosts with interesting services",
  "[00:47] Sending fingerprints to Claude agent...",
  "[00:48] Claude: Apache 2.4.49 detected → CVE-2021-41773 applicable",
  "[00:49] Claude: Spring Boot 2.7.0 → running Spring4Shell check",
  "[00:51] Nuclei scanning with 6,412 templates...",
  "[02:41] 4 critical hits confirmed by Claude triage",
  "[02:42] Exploit engine queued — awaiting Phase 3",
];
