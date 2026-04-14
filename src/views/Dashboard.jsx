import React, { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { CH } from '../components/common/CH';
import { Tag } from '../components/common/Tag';
import { sc, sb } from '../utils/colors';

const API = "http://localhost:3001/api";

export default function Dashboard({ scanning, setScanning, termRef, scanId }) {
  const [logs, setLogs] = useState([]);
  const [findings, setFindings] = useState([]);
  const [stats, setStats] = useState({ hostsFound: 0, openPorts: 0, subdomainsFound: 0 });
  const [scanStatus, setScanStatus] = useState(null);
  const [decision, setDecision] = useState(null);

  // poll recon status + agent logs + findings every 2s when scan is active
  useEffect(() => {
    if (!scanId) return;

    const poll = async () => {
      try {
        // fetch recon status (hosts, ports, subdomains)
        const statusRes = await fetch(`${API}/recon/status/${scanId}`);
        const statusData = await statusRes.json();
        setStats(statusData.stats || { hostsFound: 0, openPorts: 0, subdomainsFound: 0 });
        setScanStatus(statusData.scan?.status);

        // fetch agent + nuclei logs
        const logsRes = await fetch(`${API}/agent/logs/${scanId}`);
        const logsData = await logsRes.json();
        // show all log types in the terminal
        setLogs(
          (logsData.logs || [])
            .filter(l => l.type === 'log' || l.type === 'nuclei-log')
            .map(l => l.content)
        );

        // fetch Groq findings
        const findingsRes = await fetch(`${API}/agent/findings/${scanId}`);
        const findingsData = await findingsRes.json();

        // fetch nuclei confirmed findings and merge
        try {
          const nucRes  = await fetch(`${API}/nuclei/findings/${scanId}`);
          const nucData = await nucRes.json();
          const nucFindings = (nucData.findings || []).map(f => ({
            ...f,
            title:    f.name,
            score:    f.cvss_score,
            severity: f.severity,
            source:   'nuclei',
          }));
          setFindings([...(findingsData.findings || []), ...nucFindings]);
        } catch {
          setFindings(findingsData.findings || []);
        }

        // fetch decision
        const decRes = await fetch(`${API}/agent/decision/${scanId}`);
        const decData = await decRes.json();
        setDecision(decData.decision);

        // auto-stop when fully done
        if (statusData.scan?.status === "done" || statusData.scan?.status === "error") {
          setScanning(false);
        }
      } catch (err) {
        // ignore fetch errors during polling
      }
    };

    poll(); // immediate first fetch
    const iv = setInterval(poll, 2000);
    return () => clearInterval(iv);
  }, [scanId, setScanning]);

  // auto-scroll terminal
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [logs]);

  const criticalCount = findings.filter(f => f.severity === "CRITICAL").length;
  const highCount = findings.filter(f => f.severity === "HIGH").length;

  // derive module statuses from logs
  const hasSubfinder = logs.some(l => l.includes("subfinder") || l.includes("Subdomain"));
  const hasNmap      = logs.some(l => l.includes("nmap") || l.includes("Port scan") || l.includes("hosts"));
  const hasAgent     = logs.some(l => l.includes("Groq") || l.includes("Agent"));
  const agentDone    = logs.some(l => l.includes("Agent loop complete"));
  const hasNuclei    = logs.some(l => l.includes("nuclei") || l.includes("Nuclei"));
  const nucleiDone   = logs.some(l => l.includes("Nuclei scan complete"));

  const MODS = [
    { label: "Subdomain enum", status: scanId ? (hasSubfinder ? "done" : (scanning ? "running" : "pending")) : "pending" },
    { label: "Port scan",      status: scanId ? (hasNmap ? "done" : (hasSubfinder && scanning ? "running" : "pending")) : "pending" },
    { label: "Groq AI agent",  status: scanId ? (agentDone ? "done" : (hasAgent ? "running" : "pending")) : "pending" },
    { label: "Nuclei scanner", status: scanId ? (nucleiDone ? "done" : (hasNuclei ? "running" : "pending")) : "pending" },
  ];

  const doneCount = MODS.filter(m => m.status === "done").length;
  const coveragePct = scanId ? Math.round((doneCount / MODS.length) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: 22 }}>
      {/* STATS CARDS — live data */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { label: "Hosts alive",     val: stats.hostsFound,       sub: "discovered",          color: "var(--acc)" },
          { label: "Open ports",      val: stats.openPorts,        sub: "services mapped",     color: "var(--t1)" },
          { label: "Vulnerabilities", val: findings.length,        sub: `${criticalCount} critical · ${highCount} high`, color: "var(--red)" },
          { label: "Scan coverage",   val: `${coveragePct}%`,      sub: `${doneCount}/${MODS.length} modules`, color: "var(--yellow)" },
        ].map((s, i) => (
          <Card key={i} style={{ padding: "16px 18px", animation: `fadeUp .3s ease ${i * .07}s both` }}>
            <div style={{ fontFamily: "var(--sans)", fontSize: 11, letterSpacing: "0.1em", color: "var(--t3)", marginBottom: 8 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 28, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 6 }}>{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* MODULES + TERMINAL */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
        <Card>
          <CH left="MODULES" right={`${doneCount}/${MODS.length} done`} />
          {MODS.map((m, i) => (
            <div key={i} style={{
              padding: "11px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12,
              background: m.status === "running" ? "rgba(184,255,87,.03)" : "transparent"
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: m.status === "done" ? "var(--acc)" : m.status === "running" ? "var(--orange)" : "var(--t3)",
                animation: m.status === "running" ? "pulse 1s infinite" : "none"
              }} />
              <div style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, color: m.status === "pending" ? "var(--t3)" : "var(--t1)" }}>{m.label}</div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: m.status === "running" ? "var(--orange)" : "var(--t3)" }}>
                {m.status === "done" ? "✓" : m.status === "running" ? "running…" : "—"}
              </span>
            </div>
          ))}

          {/* Decision card */}
          {decision && (
            <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--sans)", fontSize: 10, letterSpacing: "0.1em", color: "var(--t3)", marginBottom: 8 }}>AI DECISION</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--acc)", marginBottom: 4 }}>
                → {decision.next_action?.toUpperCase()}
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--t2)", lineHeight: 1.5 }}>
                {decision.reason}
              </div>
              {decision.priority_target && (
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--t3)", marginTop: 6 }}>
                  target: {decision.priority_target}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* TERMINAL — live logs only */}
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--red)" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--yellow)" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--acc)" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)", marginLeft: 6 }}>engine.log</span>
            {scanning && <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 10, color: "var(--orange)" }}>● live</span>}
          </div>
          <div ref={termRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 3, minHeight: 200 }}>
            {logs.map((l, i) => {
              const ai = l.includes("Groq:") || l.includes("Agent");
              return (
                <div key={i} style={{
                  fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.7,
                  color: ai ? "var(--acc)" : l.toLowerCase().includes("critical") ? "var(--orange)" : "var(--t2)",
                  animation: "termIn .15s ease both",
                  paddingLeft: ai ? 8 : 0,
                  borderLeft: ai ? "2px solid var(--acc)" : "none"
                }}>{l}</div>
              );
            })}
            {scanning && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--acc)", animation: "blink 1s infinite" }}>█</span>}
            {!scanning && logs.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 8 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--t3)" }}>// no scan running</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--t3)" }}>Enter a target above and hit RUN SCAN</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FINDINGS TABLE — live from API */}
      <Card>
        <CH left="FINDINGS" right={findings.length > 0 ? `${findings.length} results · sorted by severity` : "no findings yet"} />
        {findings.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["SEVERITY", "CVE", "TITLE", "HOST", "CVSS"].map(h => (
                    <th key={h} style={{ padding: "9px 18px", textAlign: "left", fontFamily: "var(--sans)", fontSize: 11, letterSpacing: "0.1em", color: "var(--t3)", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {findings.map((f, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)", transition: "background .15s", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--s2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "12px 18px" }}><Tag label={f.severity} color={sc(f.severity)} bg={sb(f.severity)} /></td>
                    <td style={{ padding: "12px 18px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)" }}>{f.cve_id}</td>
                    <td style={{ padding: "12px 18px", fontFamily: "var(--sans)", fontSize: 13, color: "var(--t1)" }}>{f.title}</td>
                    <td style={{ padding: "12px 18px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--t2)" }}>{f.hostname || f.ip}:{f.port}</td>
                    <td style={{ padding: "12px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 3, background: "var(--border)", borderRadius: 2, maxWidth: 60 }}>
                          <div style={{
                            height: "100%", borderRadius: 2, width: `${f.score / 10 * 100}%`,
                            background: f.score >= 9 ? "var(--red)" : f.score >= 7 ? "var(--orange)" : f.score >= 5 ? "var(--yellow)" : "var(--t3)"
                          }} />
                        </div>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t2)", minWidth: 24 }}>{f.score}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "40px 18px", textAlign: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--t3)" }}>
              {scanning ? "⏳ Scanning — findings will appear here..." : "No findings yet. Run a scan to discover vulnerabilities."}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
