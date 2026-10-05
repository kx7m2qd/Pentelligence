import { z } from 'zod';

const text = z.string().max(12000);
const list = z.array(text).max(50);
const risk = z.enum(['critical', 'high', 'medium', 'low', 'informational', 'unknown']);
const cve = z.string().regex(/^CVE-\d{4}-\d{4,}$/);
const score = z.number().finite().transform(value => Math.max(0, Math.min(10, value)));
export const hostSchema = z.object({
  risk, cves: z.array(z.object({ id: cve, title: text, service: text, port: z.number().int().min(1).max(65535), score, exploitable: z.boolean(), description: text })).max(50),
  attack_surface: list, recommended_next: z.enum(['nuclei','sqlmap','manual','none']), reasoning: text,
});
export const decisionSchema = z.object({ next_action: z.enum(['exploit','nuclei','manual','report','done']), priority_target: text, module: text, reason: text, estimated_impact: text, commands: list });
export const reportSchema = z.object({ executive_summary: text, risk_rating: risk, key_findings: list, immediate_actions: list, remediation_steps: z.array(z.object({ cve: text, fix: text, priority: z.enum(['immediate','critical','high','medium','low','informational']), effort: z.enum(['hours','days','weeks']) })).max(50), conclusion: text });
export const payloadSchema = z.object({ attack_type: z.enum(['path_traversal','sqli','xss','rce','ssrf','lfi','auth_bypass']), payload: text, curl_command: text, expected_response: text, impact: text, bypass_techniques: list, confidence: z.number().finite().min(0).max(1) });
export const analysisSchema = z.object({ overall_severity: risk, attack_chain: text, worst_case: text, immediate_risk: text, patch_priority: list });
export function parseAI(raw, schema) {
  // Shape validation cannot prove a CVE exists. All model claims remain suggestions.
  return schema.parse(JSON.parse(raw));
}
