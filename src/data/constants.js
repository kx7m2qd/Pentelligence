export const FINDINGS = [
  {sev:"CRITICAL",cve:"CVE-2021-41773",title:"Path traversal + RCE",  host:"api.target.io:443", score:9.8,service:"Apache 2.4.49"},
  {sev:"HIGH",    cve:"CVE-2022-22963",title:"Spring4Shell RCE",       host:"app.target.io:8080",score:8.1,service:"Spring Boot 2.7"},
  {sev:"HIGH",    cve:"CVE-2023-44487",title:"HTTP/2 Rapid Reset",     host:"cdn.target.io:443", score:7.5,service:"nginx 1.22"},
  {sev:"MEDIUM",  cve:"CVE-2022-3786", title:"OpenSSL buf overflow",   host:"mail.target.io:25", score:5.9,service:"OpenSSL 3.0.5"},
  {sev:"LOW",     cve:"MISC-0192",     title:"Open redirect",          host:"app.target.io:80",  score:3.1,service:"nginx 1.22"},
];

export const HOSTS = [
  {ip:"10.0.1.4",  host:"api.target.io",    os:"Linux",   ports:[443,8443],    risk:"critical"},
  {ip:"10.0.1.8",  host:"app.target.io",    os:"Linux",   ports:[80,443,8080], risk:"high"},
  {ip:"10.0.1.12", host:"cdn.target.io",    os:"Linux",   ports:[80,443],      risk:"high"},
  {ip:"10.0.1.19", host:"mail.target.io",   os:"Linux",   ports:[25,465,587],  risk:"medium"},
  {ip:"10.0.1.23", host:"vpn.target.io",    os:"Linux",   ports:[1194,443],    risk:"low"},
  {ip:"10.0.1.30", host:"dev.target.io",    os:"Windows", ports:[3389,445,80], risk:"medium"},
  {ip:"10.0.1.44", host:"db.target.io",     os:"Linux",   ports:[5432,3306],   risk:"high"},
  {ip:"10.0.1.51", host:"monitor.target.io",os:"Linux",   ports:[9090,3000],   risk:"low"},
];

export const SUBS = ["api","app","cdn","mail","vpn","dev","db","monitor","staging","beta","admin","auth","internal","ci","logs"];

export const TEMPLATES = [
  {name:"CVEs — Critical",     count:412,  enabled:true,  cat:"cve"},
  {name:"CVEs — High",         count:1830, enabled:true,  cat:"cve"},
  {name:"Misconfigurations",   count:640,  enabled:true,  cat:"misc"},
  {name:"Exposed panels",      count:228,  enabled:false, cat:"exposure"},
  {name:"Default credentials", count:311,  enabled:true,  cat:"exposure"},
  {name:"Tech detection",      count:193,  enabled:true,  cat:"misc"},
  {name:"Fuzzing payloads",    count:889,  enabled:false, cat:"fuzzing"},
  {name:"Network protocols",   count:174,  enabled:false, cat:"network"},
];

export const EXPLOITS = [
  {id:"EX-01",title:"CVE-2021-41773 path traversal",target:"api.target.io:443",  status:"confirmed",method:"GET /cgi-bin/.%2e/.%2e/etc/passwd",ai:true},
  {id:"EX-02",title:"Spring4Shell — RCE",            target:"app.target.io:8080",status:"ready",    method:"POST /spring-mvc/uploadFile",     ai:true},
  {id:"EX-03",title:"HTTP/2 Rapid Reset DoS",        target:"cdn.target.io:443",  status:"ready",    method:"SETTINGS + RST_STREAM flood",     ai:false},
  {id:"EX-04",title:"OpenSSL punycode overflow",     target:"mail.target.io:25",  status:"testing",  method:"STARTTLS handshake fuzzing",      ai:true},
];

export const LOGS = [
  "[00:00] Initializing pentest engine v0.1.0",
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

export const NAV = [
  {id:"dashboard",icon:"⬡",label:"Dashboard"},
  {id:"recon",    icon:"◎",label:"Recon"},
  {id:"scan",     icon:"⊞",label:"Scan"},
  {id:"exploit",  icon:"⚡",label:"Exploit"},
  {id:"report",   icon:"▤", label:"Report"},
];

export const PAGE_LABELS = {
  dashboard:"Dashboard / Overview",recon:"Recon / Discovery",
  scan:"Scan / Nuclei",exploit:"Exploit / Payloads",report:"Report / Export"
};
