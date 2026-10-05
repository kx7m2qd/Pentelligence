# Hardening and product upgrade — 2026-10-02

These changes are local until reviewed and published. Existing installations migrate on next server startup. Back up `data/pentest.db` before upgrading; tests use an isolated in-memory database.

## Tier 1: secrets, limits, confidence

- `.env` is ignored and is not tracked in the available Git history. No secret values were printed during this review. Groq key revocation/replacement is an account action and **has not been performed**. If rotating, revoke the old key in the Groq console, create a replacement, update the local `.env`, then restart the service. Do not paste keys into chat or commit them.
- Rate-limit policies have independent counters and periodic expiry cleanup. Timers do not keep the process alive.
- `findings`, `nuclei_findings`, and `exploit_results` have constrained confidence values: `suggested`, `unconfirmed`, `confirmed`. Confidence is independent of severity. Model output defaults to suggested; legacy tool/exploit observations default to unconfirmed. New nuclei template matches are confirmed at the template-match level, which does not establish exploitability. sqlmap CSV matches require review. Existing evidence is preserved.
- Reports exclude suggestions and unconfirmed observations from verified counts. Finding confidence can be changed in Findings after entering a review/evidence note. Updates are audited. Exports retain confidence labels.

## Tier 2: verification

- Supertest runs the real Express application against isolated SQLite fixtures. Tests cover two-workspace ownership, session binding, analyst restrictions, scan consent, private addresses, scope rejection, workspace capacity/daily quotas, export ownership, append-only audit triggers, confidence review, SSE, and startup recovery.
- Parser fixtures cover nmap single/multiple/empty hosts and malformed XML, sqlmap structured rows, notes/false-positive rows, other origins, and malformed CSV. No live scan is needed to run tests.
- CI runs `npm run test:coverage`, lint, build, and a high-severity dependency audit. Coverage floors are 48% lines, 70% branches, 50% functions across loaded non-test code. These are initial regression floors, **not an 80% coverage claim**. External-tool execution and complete browser flows still need broader coverage.

## Tier 3: correctness and operations

- sqlmap uses a per-run temporary directory, bulk-target input, and `--results-file` CSV. Text in stdout never proves a vulnerability. Nonzero exits fail the task; rows with notes or another origin are not accepted. Temporary artifacts are removed after parsing.
- Zod validates all AI response shapes, CVE syntax, port ranges, enumerations and bounded text. Scores are bounded to 0–10. Validation cannot establish that a CVE really exists, so model claims remain suggestions.
- Existing startup recovery is retained and tested: interrupted `running` scans become `error` with an interruption message and a persisted phase event. The existing status vocabulary stays compatible with History retry.
- Pino replaces backend console calls. Requests receive generated correlation IDs; asynchronous scan work carries scan IDs. Logs omit request bodies/headers and audit entries identify session/workspace/action/outcome. Treat assessment evidence as sensitive even when credentials are redacted.

## Tier 4: safeguards

- Scope and DNS are rechecked when tool phases execute and on reruns. Nmap uses validated IPv4 addresses with DNS disabled and preserves the approved hostname in stored results. Public CIDR input is rejected unless the operator explicitly enables private-network scanning. Mixed private DNS answers are rejected. HTTP header/traversal checks no longer follow redirects automatically.
- **Residual boundary:** external tools and headless browsers can make subsequent DNS lookups, redirects and subresource requests. Phase-level checks and nmap pinning are not a universal network sandbox. Strong rebinding protection for every tool requires a controlled egress proxy/network policy; this is not claimed as complete here.
- `MAX_WORKSPACE_SCANS` (default 1), `MAX_DAILY_SCANS` (default 20), and per-workspace request budgets supplement the global scan limit. These are per workspace, not a per-human subscription/abuse quota. Server-side quotas cover API and scheduled pipeline admission, plus standalone agent/nuclei/exploit reruns. Standalone admissions retain target, session, request ID and authorization note in the audit trail.
- SQLite audit events reject updates/deletes through triggers. The administrator audit endpoint is workspace-scoped and paginated. A database administrator with filesystem access can alter the database/triggers; this is not a cryptographically tamper-proof external log or a guarantee of legal protection.
- Compatible npm audit fixes and Dependabot configuration are included. Tool pins are nuclei v3.8.0 and subfinder v2.14.0, matching the locally installed versions. Docker builds no longer fetch a changing template set. Templates are managed at runtime. Base OS package feeds remain mutable, so this is not a bit-for-bit reproducibility claim. Docker execution was not verified because the daemon was unavailable.

## Tier 5: product features

- Dashboard, Recon, Findings, active-check results and nuclei views use authenticated SSE snapshots to refresh on changes instead of periodic client status polling. Streams stay open for later reruns and close when the client disconnects. The server checks persisted state periodically; this is not a distributed event broker.
- Workspace-scoped `/api/exports/:scanId/{md,pdf,sarif}` provides Markdown, direct PDF and SARIF 2.1.0 downloads. Report includes PDF/SARIF buttons alongside existing export formats.
- Stable fingerprints deduplicate scan comparisons. Reappearing findings are classified as regressed using up to 100 older completed scans of the same target/workspace. “Fixed” means absent in the comparison scan, not independent proof of remediation.
- `APP_PASSWORD` grants the administrator role. Optional, distinct `ANALYST_PASSWORD` grants the analyst role; each must be at least 16 characters. Analysts can investigate/read/triage their workspace, but cannot change scope/schedules, delete data, administer templates, run active exploitation, or read the administrator audit endpoint. Roles are assigned server-side. With authentication disabled this remains a single-operator admin tool. This is a two-role access model, not multi-user invitations/SSO.

## Verification limits and external actions

The 2026-10-05 CI audit identified a vulnerable transitive dependency in Nodemon. Development now uses Node 24's native `--watch` mode instead. A clean `npm ci`, fresh audit (zero vulnerabilities), lint, coverage tests and production build all passed after removing that dependency chain.

Local verification on 2026-10-05 passed: ESLint, all 52 tests with coverage gates, and the Vite production build. Measured coverage across loaded non-test code: 50.42% lines, 70.80% branches, 56.30% functions. The dependency audit reported zero vulnerabilities after compatible updates on 2026-10-02. A mocked browser fixture verified the confidence-review interaction; it did not modify real findings.

No customer/third-party targets were scanned and no existing scan was deleted during verification. HTTP tests use fixtures, not production data. Groq key rotation and a Docker build are still outstanding. Run an authorized staging assessment and exercise the updated UI before deployment; no claim is made that the new code has been tested against live sqlmap/nmap services or production targets.

Parser reference: [sqlmap CSV format and multiple-target behavior](https://github.com/sqlmapproject/sqlmap/blob/master/lib/core/target.py), [CSV result writing and false positives](https://github.com/sqlmapproject/sqlmap/blob/master/lib/controller/controller.py).
