import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'pentest.db'));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS access_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
  );
  CREATE TABLE IF NOT EXISTS scope_authorizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    target TEXT NOT NULL,
    authorization_note TEXT NOT NULL DEFAULT '',
    authorized_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    scope_json TEXT NOT NULL DEFAULT '[]',
    excludes_json TEXT NOT NULL DEFAULT '[]',
    profile_json TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS finding_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    scan_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    finding_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    assignee TEXT NOT NULL DEFAULT '',
    remediation_due_at DATETIME,
    analyst_note TEXT NOT NULL DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, source, finding_id)
  );
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target TEXT NOT NULL,
    status TEXT DEFAULT 'running',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS hosts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER,
    ip TEXT,
    hostname TEXT,
    os TEXT,
    status TEXT DEFAULT 'up',
    risk TEXT DEFAULT 'unknown',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES scans(id)
  );

  CREATE TABLE IF NOT EXISTS ports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host_id INTEGER,
    port INTEGER,
    protocol TEXT,
    service TEXT,
    version TEXT,
    state TEXT,
    FOREIGN KEY (host_id) REFERENCES hosts(id)
  );

  CREATE TABLE IF NOT EXISTS subdomains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER,
    subdomain TEXT,
    ip TEXT,
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES scans(id)
  );
  CREATE TABLE IF NOT EXISTS web_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    hostname TEXT NOT NULL,
    url TEXT NOT NULL,
    status_code INTEGER,
    title TEXT NOT NULL DEFAULT '',
    server TEXT NOT NULL DEFAULT '',
    content_type TEXT NOT NULL DEFAULT '',
    content_length INTEGER,
    redirect_url TEXT NOT NULL DEFAULT '',
    response_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES scans(id)
  );
  CREATE TABLE IF NOT EXISTS evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    target TEXT NOT NULL,
    path TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES scans(id)
  );

  CREATE TABLE IF NOT EXISTS findings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id     INTEGER,
    host_id     INTEGER,
    cve_id      TEXT,
    title       TEXT,
    service     TEXT,
    port        INTEGER,
    score       REAL,
    severity    TEXT,
    description TEXT,
    exploitable INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES scans(id),
    FOREIGN KEY (host_id) REFERENCES hosts(id)
  );

  CREATE TABLE IF NOT EXISTS agent_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id    INTEGER,
    host_id    INTEGER,
    type       TEXT,
    content    TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES scans(id)
  );

  CREATE TABLE IF NOT EXISTS nuclei_findings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id     INTEGER,
    host_id     INTEGER,
    template_id TEXT,
    name        TEXT,
    severity    TEXT,
    cvss_score  REAL    DEFAULT 0,
    cve_id      TEXT,
    description TEXT,
    matched_at  TEXT,
    curl_cmd    TEXT,
    confirmed   INTEGER DEFAULT 1,
    source      TEXT    DEFAULT 'nuclei',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES scans(id),
    FOREIGN KEY (host_id) REFERENCES hosts(id)
  );

  CREATE TABLE IF NOT EXISTS exploit_results (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id    INTEGER,
    host_id    INTEGER,
    type       TEXT,
    target     TEXT,
    payload    TEXT,
    output     TEXT,
    confirmed  INTEGER DEFAULT 0,
    severity   TEXT,
    evidence   TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES scans(id),
    FOREIGN KEY (host_id) REFERENCES hosts(id)
  );
`);

const existingScanColumns = db.prepare("PRAGMA table_info(scans)").all();
const scanColumnNames = new Set(existingScanColumns.map(column => column.name));

if (!scanColumnNames.has("phase")) {
  db.exec("ALTER TABLE scans ADD COLUMN phase TEXT DEFAULT 'queued'");
}

if (!scanColumnNames.has("message")) {
  db.exec("ALTER TABLE scans ADD COLUMN message TEXT DEFAULT ''");
}

if (!scanColumnNames.has("error_message")) {
  db.exec("ALTER TABLE scans ADD COLUMN error_message TEXT DEFAULT ''");
}

if (!scanColumnNames.has("workspace_id")) {
  db.exec("ALTER TABLE scans ADD COLUMN workspace_id INTEGER");
}
if (!scanColumnNames.has("program_id")) {
  db.exec("ALTER TABLE scans ADD COLUMN program_id INTEGER");
}
if (!scanColumnNames.has("profile_json")) {
  db.exec("ALTER TABLE scans ADD COLUMN profile_json TEXT DEFAULT '{}'");
}

const existingWorkspaceColumns = db.prepare("PRAGMA table_info(workspaces)").all();
const workspaceColumnNames = new Set(existingWorkspaceColumns.map(column => column.name));
if (!workspaceColumnNames.has("access_session_id")) {
  db.exec("ALTER TABLE workspaces ADD COLUMN access_session_id INTEGER");
}

db.exec("CREATE INDEX IF NOT EXISTS idx_scans_workspace_created ON scans(workspace_id, created_at DESC)");
db.exec("CREATE INDEX IF NOT EXISTS idx_programs_workspace_updated ON programs(workspace_id, updated_at DESC)");
db.exec("CREATE INDEX IF NOT EXISTS idx_access_sessions_expiry ON access_sessions(expires_at)");
db.exec("CREATE INDEX IF NOT EXISTS idx_scope_authorizations_workspace_target ON scope_authorizations(workspace_id, target)");
db.exec("CREATE INDEX IF NOT EXISTS idx_web_assets_scan_host ON web_assets(scan_id, hostname)");
db.exec("CREATE INDEX IF NOT EXISTS idx_evidence_scan_created ON evidence(scan_id, created_at DESC)");
db.exec("CREATE INDEX IF NOT EXISTS idx_finding_reviews_workspace_scan ON finding_reviews(workspace_id, scan_id)");

// Fix stale phase/message on scans that completed before these columns existed
db.prepare(`
  UPDATE scans
  SET phase = 'done', message = 'Recon pipeline complete'
  WHERE status = 'done' AND (phase IS NULL OR phase = '' OR phase = 'queued')
`).run();

db.prepare(`
  UPDATE scans
  SET phase = 'error', message = 'Scan failed'
  WHERE status = 'error' AND (phase IS NULL OR phase = '' OR phase = 'queued')
`).run();

db.exec(`
  DELETE FROM subdomains
  WHERE rowid NOT IN (
    SELECT MIN(rowid)
    FROM subdomains
    GROUP BY scan_id, subdomain
  );
  DELETE FROM ports
  WHERE rowid NOT IN (
    SELECT MIN(rowid)
    FROM ports
    GROUP BY host_id, port, protocol
  );
  DELETE FROM hosts
  WHERE rowid NOT IN (
    SELECT MIN(rowid)
    FROM hosts
    GROUP BY scan_id, ip, hostname
  );
  DELETE FROM findings
  WHERE rowid NOT IN (
    SELECT MIN(rowid)
    FROM findings
    GROUP BY scan_id, host_id, cve_id, port
  );
  DELETE FROM nuclei_findings
  WHERE rowid NOT IN (
    SELECT MIN(rowid)
    FROM nuclei_findings
    GROUP BY scan_id, host_id, template_id, matched_at
  );
  DELETE FROM exploit_results
  WHERE rowid NOT IN (
    SELECT MIN(rowid)
    FROM exploit_results
    GROUP BY scan_id, host_id, type, target, payload
  );
`);

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_hosts_scan_identity
    ON hosts(scan_id, ip, hostname);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_ports_host_socket
    ON ports(host_id, port, protocol);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_subdomains_scan_name
    ON subdomains(scan_id, subdomain);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_findings_scan_host_cve
    ON findings(scan_id, host_id, cve_id, port);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_nuclei_scan_host_match
    ON nuclei_findings(scan_id, host_id, template_id, matched_at);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_exploit_scan_host_payload
    ON exploit_results(scan_id, host_id, type, target, payload);
`);

export default db;
