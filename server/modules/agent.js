import db from "../db.js";
import { analyseHost, decideNextAction } from "./groq.js";

export async function runAgentLoop(scanId, emitLog) {
  const log = msg => {
    console.log(`[agent] ${msg}`);
    if (emitLog) emitLog(msg);
  };

  log("Agent loop starting...");

  const scan = db.prepare("SELECT * FROM scans WHERE id = ?").get(scanId);
  if (!scan) return log("Scan not found");

  const hosts = db.prepare("SELECT * FROM hosts WHERE scan_id = ?").all(scanId);
  if (!hosts.length) return log("No hosts found to analyse");

  log(`Analysing ${hosts.length} hosts with Groq (Llama 3.3-70B)...`);

  const allFindings = [];

  for (const host of hosts) {
    const ports = db.prepare("SELECT * FROM ports WHERE host_id = ?").all(host.id);

    log(`Groq: Analysing ${host.hostname || host.ip}...`);

    let analysis;
    try {
      analysis = await analyseHost({ ...host, ports });
    } catch (err) {
      log(`Groq error on ${host.ip}: ${err.message}`);
      continue;
    }

    // update host risk in DB
    db.prepare("UPDATE hosts SET risk = ? WHERE id = ?")
      .run(analysis.risk || "unknown", host.id);

    // save each CVE as a finding
    for (const cve of analysis.cves || []) {
      db.prepare(`
        INSERT INTO findings (scan_id, host_id, cve_id, title, service, port, score, severity, description, exploitable)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        scanId, host.id,
        cve.id, cve.title, cve.service,
        cve.port, cve.score,
        cve.score >= 9 ? "CRITICAL" : cve.score >= 7 ? "HIGH" : cve.score >= 4 ? "MEDIUM" : "LOW",
        cve.description,
        cve.exploitable ? 1 : 0
      );

      allFindings.push({ ...cve, host: host.hostname || host.ip, severity: analysis.risk?.toUpperCase() });
      log(`Groq: Found ${cve.id} on ${host.hostname || host.ip}:${cve.port} — CVSS ${cve.score}`);
    }

    // save agent reasoning log
    db.prepare(`
      INSERT INTO agent_logs (scan_id, host_id, type, content)
      VALUES (?, ?, ?, ?)
    `).run(scanId, host.id, "analysis", JSON.stringify(analysis));

    log(`Groq: ${host.hostname || host.ip} — risk=${analysis.risk}, CVEs=${analysis.cves?.length || 0}`);
    if (analysis.reasoning) log(`Groq: ${analysis.reasoning}`);

    // small delay to respect rate limits
    await new Promise(r => setTimeout(r, 600));
  }

  // final decision
  if (allFindings.length > 0) {
    log("Groq: All hosts analysed — deciding next action...");

    let decision;
    try {
      decision = await decideNextAction(allFindings, scan.target);
    } catch (err) {
      log(`Groq decision error: ${err.message}`);
      return;
    }

    db.prepare(`
      INSERT INTO agent_logs (scan_id, host_id, type, content)
      VALUES (?, ?, ?, ?)
    `).run(scanId, null, "decision", JSON.stringify(decision));

    log(`Groq decision: ${decision.next_action?.toUpperCase()} — ${decision.reason}`);
    log(`Groq: Priority target → ${decision.priority_target}`);
    log(`Groq: Expected impact → ${decision.estimated_impact}`);
  } else {
    log("Groq: No CVEs found — target may be patched or out of scope");
  }

  log("Agent loop complete.");
}
