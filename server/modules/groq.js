import Groq from "groq-sdk";
import { config } from "../config.js";

const groq = config.aiProvider === 'groq' && config.groqApiKey ? new Groq({ apiKey: config.groqApiKey }) : null;

function isRetryable(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  return status === 429 || status >= 500 || error?.code === 'ETIMEDOUT' || error?.code === 'ECONNRESET';
}

async function createOllamaCompletion(params) {
  const response = await fetch(`${config.ollamaBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.ollamaApiKey ? { Authorization: `Bearer ${config.ollamaApiKey}` } : {}),
    },
    body: JSON.stringify({ ...params, model: config.ollamaModel }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240);
    throw new Error(`Ollama request failed (${response.status})${detail ? `: ${detail}` : ''}`);
  }
  return response.json();
}

export async function createCompletion(params) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      if (config.aiProvider === 'ollama') return await createOllamaCompletion(params);
      if (!groq) throw new Error("GROQ_API_KEY is not configured");
      return await groq.chat.completions.create({ ...params, model: config.groqModel });
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === 2) throw error;
      const retryAfter = Number(error?.headers?.['retry-after'] || 0);
      const delay = retryAfter > 0 ? retryAfter * 1000 : 500 * (2 ** attempt);
      await new Promise(resolve => setTimeout(resolve, Math.min(delay, 8000)));
    }
  }
  throw lastError;
}

export async function checkAI() {
  if (config.aiProvider === 'ollama') {
    try {
      const response = await fetch(`${config.ollamaBaseUrl}/models`, {
        headers: config.ollamaApiKey ? { Authorization: `Bearer ${config.ollamaApiKey}` } : {},
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`health check returned ${response.status}`);
      const payload = await response.json();
      const models = (payload.data || []).map(model => model.id);
      const available = models.includes(config.ollamaModel);
      return { provider: 'ollama', configured: true, reachable: true, available, model: config.ollamaModel, message: available ? 'Local Ollama model is available' : `Ollama is reachable; pull ${config.ollamaModel}` };
    } catch (error) {
      return { provider: 'ollama', configured: true, reachable: false, available: false, model: config.ollamaModel, message: error?.message || 'Ollama health check failed' };
    }
  }
  if (!groq) return { provider: 'groq', configured: false, reachable: false, model: config.groqModel, message: 'GROQ_API_KEY is not configured' };
  try {
    const response = await groq.models.list();
    const available = (response.data || []).some(model => model.id === config.groqModel);
    return { provider: 'groq', configured: true, reachable: available, available, model: config.groqModel, message: available ? 'Groq model is available' : 'Selected Groq model is unavailable' };
  } catch (error) {
    return { provider: 'groq', configured: true, reachable: false, available: false, model: config.groqModel, message: error?.message || 'Groq health check failed' };
  }
}

export const checkGroq = checkAI;

const SYSTEM_PROMPT = `You are an expert penetration tester and security researcher.
You analyse scan results and make decisions about what vulnerabilities exist and what to test next.
You ALWAYS respond in valid JSON only. No explanation outside the JSON.
Be precise, technical, and focus on exploitability.`;

export async function analyseHost(host) {
  const prompt = `
Analyse this host from a penetration test recon scan and identify applicable CVEs.

Host data:
- IP: ${host.ip}
- Hostname: ${host.hostname || "unknown"}
- OS: ${host.os || "unknown"}
- Open ports and services:
${host.ports.map(p => `  • Port ${p.port}/${p.protocol} — ${p.service} ${p.version || ""}`).join("\n")}

Respond with this exact JSON structure:
{
  "risk": "critical|high|medium|low",
  "cves": [
    {
      "id": "CVE-XXXX-XXXXX",
      "title": "short title",
      "service": "affected service",
      "port": 443,
      "score": 9.8,
      "exploitable": true,
      "description": "one sentence"
    }
  ],
  "attack_surface": ["list", "of", "notable", "findings"],
  "recommended_next": "nuclei|sqlmap|manual|none",
  "reasoning": "2-3 sentence explanation of risk assessment"
}`;

  const response = await createCompletion({
    model: config.aiModel,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: prompt },
    ],
    temperature: 0.2,
    max_tokens:  1024,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return { risk: "unknown", cves: [], attack_surface: [], reasoning: raw };
  }
}

export async function decideNextAction(findings, target) {
  const prompt = `
You are mid-way through a penetration test against ${target}.

Current findings so far:
${findings.map((f, i) => `${i + 1}. [${f.severity}] ${f.cve_id} on ${f.host}:${f.port} — ${f.title}`).join("\n")}

Based on these findings, decide the next action to maximise impact.

Respond with this exact JSON:
{
  "next_action": "exploit|nuclei|manual|report|done",
  "priority_target": "host:port",
  "module": "specific tool or module to run",
  "reason": "why this is the highest priority next step",
  "estimated_impact": "what we expect to achieve",
  "commands": ["suggested command 1", "suggested command 2"]
}`;

  const response = await createCompletion({
    model: config.aiModel,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: prompt },
    ],
    temperature: 0.2,
    max_tokens:  512,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return { next_action: "manual", reason: raw };
  }
}

export async function generateReport(scanData) {
  const prompt = `
Write a professional penetration test report summary for this engagement.

Target: ${scanData.target}
Hosts scanned: ${scanData.hosts?.length || 0}
Findings: ${scanData.findings?.length || 0} vulnerabilities

Findings detail:
${(scanData.findings || []).map(f =>
  `- [${f.severity}] ${f.cve_id}: ${f.title} on ${f.host}:${f.port} (CVSS ${f.score})`
).join("\n")}

Respond with this exact JSON:
{
  "executive_summary": "3-4 sentence non-technical summary for management",
  "risk_rating": "critical|high|medium|low",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "immediate_actions": ["action 1", "action 2", "action 3"],
  "remediation_steps": [
    {
      "cve": "CVE-XXXX-XXXXX",
      "fix": "specific remediation step",
      "priority": "immediate|high|medium|low",
      "effort": "hours|days|weeks"
    }
  ],
  "conclusion": "2-3 sentence closing statement"
}`;

  const response = await createCompletion({
    model: config.aiModel,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: prompt },
    ],
    temperature: 0.3,
    max_tokens:  1500,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return { executive_summary: raw };
  }
}
