import React, { useEffect, useState } from 'react';
import { Card } from '../components/common/Card';
import { CH } from '../components/common/CH';
import { Tag } from '../components/common/Tag';
import { Btn } from '../components/common/Btn';
import { EmptyState } from '../components/common/EmptyState';
import { apiGet } from '../lib/api';
import { sc, sb } from '../utils/colors';

// The report view shows exactly what is stored for this investigation and
// exports the same content it previews — no sections that only exist as ticks.

function buildMarkdown(meta, report, comparison, tools, template, findings, scanId) {
  const lines = [];
  const target = meta?.scan?.target || 'unknown';
  const isBounty = template !== 'standard';

  lines.push(`# ${isBounty ? `${template === 'hackerone' ? 'HackerOne' : 'Bugcrowd'} submission draft — ${target}` : `Penetration test report — ${target}`}`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)} · Investigation: #${meta?.scan?.id ?? scanId ?? '—'}`);
  lines.push('');

  lines.push('## Scope & methodology');
  lines.push('');
  lines.push(`- Target: ${target}`);
  lines.push(`- Duration: ${meta?.duration || meta?.scan?.duration || '—'}`);
  lines.push(`- Tools: ${tools || 'subfinder, nmap, HTTP probe, nuclei'}`);
  lines.push('');
  lines.push('Methodology: passive subdomain enumeration, TCP service scan, HTTP content discovery,');
  lines.push('nuclei template confirmation. AI output is marked as unconfirmed and never mixed into confirmed counts.');
  lines.push('');

  lines.push('## Executive summary');
  lines.push('');
  lines.push(report?.executive_summary || 'No summary available.');
  lines.push('');

  if (report?.key_findings?.length) {
    lines.push('## Findings');
    lines.push('');
    report.key_findings.forEach((item, index) => {
      lines.push(`${index + 1}. ${item}`);
    });
    lines.push('');
  }

  if (isBounty && findings.length) {
    lines.push('## Submission draft (one finding per report)');
    lines.push('');
    findings.slice(0, 5).forEach(finding => {
      lines.push(`### ${finding.title || finding.name || finding.cve_id || 'Finding'}`);
      lines.push('');
      lines.push(`- Severity: ${String(finding.severity || 'unknown').toUpperCase()}`);
      lines.push(`- Asset: ${finding.hostname || finding.ip || 'unknown'}${finding.matched_at ? ` (matched: ${finding.matched_at})` : ''}`);
      lines.push(`- Reference: ${finding.cve_id || finding.template_id || '—'}`);
      lines.push('');
      lines.push('**Steps to reproduce**');
      lines.push('');
      lines.push('1. Resolve the asset above.');
      lines.push('2. Re-run the matching nuclei template against it.');
      lines.push('3. Observe the match recorded in the attached evidence.');
      lines.push('');
      lines.push(`**Impact**: ${finding.description || 'See template reference for impact details.'}`);
      lines.push('');
    });
  }

  if (comparison) {
    const total = comparison.new.length + comparison.fixed.length + comparison.regressed.length;
    if (total > 0) {
      lines.push('## Delta vs previous scan');
      lines.push('');
      lines.push(`- New: ${comparison.new.length}`);
      lines.push(`- Fixed: ${comparison.fixed.length}`);
      lines.push(`- Regressed: ${comparison.regressed.length}`);
      lines.push('');
    }
  }

  if (report?.remediation_steps?.length) {
    lines.push('## Remediation');
    lines.push('');
    report.remediation_steps.forEach(step => {
      lines.push(`- **${step.cve}** (${step.priority}): ${step.fix}`);
    });
    lines.push('');
  }

  if (report?.immediate_actions?.length) {
    lines.push('## Immediate actions');
    lines.push('');
    report.immediate_actions.forEach(item => lines.push(`- ${item}`));
    lines.push('');
  }

  lines.push('## Conclusion');
  lines.push('');
  lines.push(report?.conclusion || 'No conclusion available.');
  lines.push('');
  return lines.join('\n');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(meta, report, comparison, tools, template, findings, scanId) {
  const target = escapeHtml(meta?.scan?.target || 'unknown');
  const title = template === 'standard' ? `Penetration Test Report — ${target}` : `${template === 'hackerone' ? 'HackerOne' : 'Bugcrowd'} Submission Draft — ${target}`;
  const date = new Date().toISOString().slice(0, 10);
  const risk = escapeHtml(report?.risk_rating || 'informational').toUpperCase();
  
  const findingsRows = (findings || []).map(f => `
    <tr>
      <td><span class="badge ${String(f.severity || '').toLowerCase()}">${escapeHtml(f.severity || 'UNKNOWN')}</span></td>
      <td><strong>${escapeHtml(f.title || f.name || f.cve_id || 'Finding')}</strong></td>
      <td><code>${escapeHtml(f.hostname || f.ip || '—')}</code></td>
      <td><code>${escapeHtml(f.matched_at || f.cve_id || f.template_id || '—')}</code></td>
    </tr>
  `).join('');

  const remediationRows = (report?.remediation_steps || []).map(r => `
    <div class="rem-item">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <strong>${escapeHtml(r.cve || 'Remediation')}</strong>
        <span class="badge ${String(r.priority || 'medium').toLowerCase()}">${escapeHtml(r.priority || 'medium')} priority</span>
      </div>
      <div>${escapeHtml(r.fix || '')}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #080b0d; color: #d0ded7; margin: 0; padding: 40px 20px; line-height: 1.6; }
    .report-wrap { max-width: 920px; margin: 0 auto; background: #0f1517; border: 1px solid #1c272a; border-radius: 12px; padding: 36px; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
    h1 { color: #b6f765; margin-top: 0; font-size: 26px; }
    h2 { color: #f0f7f2; border-bottom: 1px solid #1c272a; padding-bottom: 8px; margin-top: 30px; font-size: 16px; letter-spacing: 0.05em; text-transform: uppercase; }
    .meta-bar { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 24px; padding: 12px 16px; background: #151d20; border-radius: 8px; font-family: monospace; font-size: 12px; color: #8fa39a; }
    .meta-bar strong { color: #f0f7f2; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: bold; font-family: monospace; text-transform: uppercase; }
    .critical { background: rgba(255,101,124,.15); color: #ff657c; border: 1px solid rgba(255,101,124,.3); }
    .high { background: rgba(255,173,91,.15); color: #ffad5b; border: 1px solid rgba(255,173,91,.3); }
    .medium { background: rgba(245,213,104,.15); color: #f5d568; border: 1px solid rgba(245,213,104,.3); }
    .low { background: rgba(117,185,255,.15); color: #75b9ff; border: 1px solid rgba(117,185,255,.3); }
    .informational { background: #202a2d; color: #a0b1a9; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #1c272a; font-size: 13px; }
    th { color: #60706a; font-family: monospace; font-size: 11px; text-transform: uppercase; }
    code { font-family: monospace; font-size: 11px; color: #b6f765; background: #080b0d; padding: 2px 6px; border-radius: 4px; }
    .rem-item { padding: 12px 14px; margin-bottom: 10px; border-radius: 6px; background: #151d20; border: 1px solid #1c272a; font-size: 13px; }
    .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #1c272a; font-size: 11px; color: #60706a; text-align: center; }
    @media print {
      body { background: #fff; color: #111; padding: 0; }
      .report-wrap { border: none; box-shadow: none; padding: 0; }
      h1, h2 { color: #000; }
      .meta-bar, .rem-item { background: #f8f9fa; border: 1px solid #ddd; color: #222; }
      th, td { border-bottom: 1px solid #ddd; color: #111; }
      code { background: #eee; color: #000; }
    }
  </style>
</head>
<body>
  <div class="report-wrap">
    <h1>${title}</h1>
    <div class="meta-bar">
      <div>Target: <strong>${target}</strong></div>
      <div>Date: <strong>${date}</strong></div>
      <div>Scan ID: <strong>#${scanId || '—'}</strong></div>
      <div>Risk Rating: <span class="badge ${risk.toLowerCase()}">${risk}</span></div>
    </div>

    <h2>Scope & Methodology</h2>
    <p>Target: <code>${target}</code>. Tools: ${escapeHtml(tools || 'subfinder, nmap, HTTP probe, nuclei')}. Methodology included passive subdomain enumeration, TCP port & service detection, web probing, and nuclei template confirmation.</p>

    <h2>Executive Summary</h2>
    <p>${escapeHtml(report?.executive_summary || 'No summary available.')}</p>

    <h2>Confirmed Findings (${findings?.length || 0})</h2>
    ${findings?.length ? `
    <table>
      <thead>
        <tr><th>Severity</th><th>Finding</th><th>Asset</th><th>Reference</th></tr>
      </thead>
      <tbody>${findingsRows}</tbody>
    </table>` : '<p style="color:#60706a;">No vulnerabilities confirmed.</p>'}

    ${report?.remediation_steps?.length ? `
    <h2>Remediation Steps</h2>
    ${remediationRows}
    ` : ''}

    <h2>Conclusion</h2>
    <p>${escapeHtml(report?.conclusion || 'Assessment complete.')}</p>

    <div class="footer">Generated by Pentelligence · Authorized Security Testing Platform</div>
  </div>
</body>
</html>`;
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Report({ scanId, onGoLive }) {
  const [template, setTemplate] = useState('standard');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [meta, setMeta] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [tools, setTools] = useState('');
  const [nucleiFindings, setNucleiFindings] = useState([]);

  useEffect(() => {
    if (!scanId) return undefined;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [data, compareData, toolData, nucleiData] = await Promise.all([
          apiGet(`/recon/report/${scanId}`),
          apiGet(`/recon/compare/${scanId}`).catch(() => null),
          apiGet('/health/tools').catch(() => null),
          apiGet(`/nuclei/findings/${scanId}`).catch(() => null),
        ]);
        setReport(data.report || null);
        setMeta(data.meta || null);
        setComparison(compareData?.comparison || null);
        setNucleiFindings(nucleiData?.findings || []);
        if (toolData?.tools) {
          setTools(Object.entries(toolData.tools)
            .map(([name, info]) => `${name} ${info.version || ''}`.trim())
            .join(', '));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [scanId]);

  const exportMarkdown = () => {
    if (!meta) return;
    const md = buildMarkdown(meta, report, comparison, tools, template, nucleiFindings, scanId);
    downloadBlob(`report-scan-${scanId}.md`, md, 'text/markdown');
  };

  const exportHtml = () => {
    if (!meta) return;
    const html = buildHtml(meta, report, comparison, tools, template, nucleiFindings, scanId);
    downloadBlob(`report-scan-${scanId}.html`, html, 'text/html');
  };

  const exportPdf = () => {
    if (!meta) return;
    const html = buildHtml(meta, report, comparison, tools, template, nucleiFindings, scanId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Please allow popups to open the print/PDF view');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const exportJson = () => {
    if (!meta) return;
    downloadBlob(`report-scan-${scanId}.json`, JSON.stringify({ meta, report, comparison, findings: nucleiFindings }, null, 2), 'application/json');
  };

  if (!scanId) {
    return (
      <div className="page">
        <EmptyState eyebrow="REPORT" description="The report is generated from what the investigation actually stored — hosts, confirmed template matches, review status and the delta to the previous run. Start an investigation from Live first." onAction={onGoLive} />
      </div>
    );
  }

  const severityChips = [
    { label: 'RISK', value: report?.risk_rating?.toUpperCase() || '—' },
    { label: 'HOSTS', value: meta?.hostCount ?? 0 },
    { label: 'NUCLEI CONFIRMED', value: nucleiFindings.length },
    { label: 'EXPLOITS', value: meta?.exploitCount ?? 0 },
  ];
  const riskLevel = String(report?.risk_rating || 'informational').toLowerCase();
  const riskPercent = { informational: 12, low: 28, medium: 52, high: 76, critical: 100 }[riskLevel] || 0;

  return (
    <div className="page">
      {error && <div className="app-banner error">{error}</div>}

      <div className="report-cols">
        <Card>
          <CH left="REPORT PREVIEW" right={loading ? 'loading…' : meta?.scan?.target || '—'} />
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 600, color: 'var(--t1)' }}>
                {template === 'standard' ? 'Penetration test report' : `${template === 'hackerone' ? 'HackerOne' : 'Bugcrowd'} submission draft`}
              </div>
              <div className="finding-meta">
                {meta?.scan?.target || 'no target'} · investigation #{scanId} · {new Date().toISOString().slice(0, 10)}
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>SCOPE & METHODOLOGY</div>
              <p className="empty-copy" style={{ margin: 0 }}>
                Target {meta?.scan?.target || '—'}. Tools: {tools || 'subfinder, nmap, HTTP probe, nuclei'}.
                Passive enumeration + TCP service scan + nuclei template confirmation. AI output is
                labelled unconfirmed and excluded from confirmed counts.
              </p>
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>EXECUTIVE SUMMARY</div>
              <p className="empty-copy" style={{ margin: 0, color: 'var(--t2)' }}>
                {report?.executive_summary || 'Summary appears when the investigation completes.'}
              </p>
            </div>

            {nucleiFindings.length > 0 && (
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>CONFIRMED FINDINGS (NUCLEI)</div>
                {nucleiFindings.map(finding => (
                  <div key={finding.id} className="module-row" style={{ padding: '10px 0' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="module-name" style={{ fontSize: 12 }}>{finding.name || finding.template_id}</div>
                      <div className="finding-meta">{finding.hostname || finding.ip}{finding.matched_at ? ` · ${finding.matched_at}` : ''}</div>
                    </div>
                    <Tag label={String(finding.severity || '—').toUpperCase()} color={sc(finding.severity)} bg={sb(finding.severity)} />
                  </div>
                ))}
              </div>
            )}

            {comparison && (comparison.new.length + comparison.fixed.length + comparison.regressed.length > 0) && (
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>DELTA VS PREVIOUS SCAN</div>
                <p className="empty-copy" style={{ margin: 0 }}>
                  New: {comparison.new.length} · Fixed: {comparison.fixed.length} · Regressed: {comparison.regressed.length}
                </p>
              </div>
            )}

            {report?.remediation_steps?.length > 0 && (
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>REMEDIATION</div>
                {report.remediation_steps.map((step, index) => (
                  <div key={`${step.cve}-${index}`} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--border)', marginBottom: 8 }}>
                    <div style={{ marginBottom: 6 }}>
                      <Tag label={step.cve} color={sc(step.priority?.toUpperCase())} bg={sb(step.priority?.toUpperCase())} />
                    </div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>{step.fix}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CH left="SUMMARY" />
            <div className="report-summary-body">
              <div className={`risk-overview ${riskLevel}`}><div className="risk-overview-head"><span className="eyebrow">RISK RATING</span><strong>{riskLevel.toUpperCase()}</strong></div><div className="risk-meter"><span style={{ width: `${riskPercent}%` }} /></div><div className="risk-scale"><span>LOW</span><span>MEDIUM</span><span>HIGH</span><span>CRITICAL</span></div></div>
              <div className="report-stat-grid">
              {severityChips.map(item => (
                <div key={item.label} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 18, color: 'var(--acc)' }}>{item.value}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: 'var(--t3)', letterSpacing: '0.08em', marginTop: 4 }}>{item.label}</div>
                </div>
              ))}
              </div>
            </div>
          </Card>

          {comparison && <Card><CH left="SCAN DELTA" right={comparison.previous ? 'vs previous scan' : 'no previous baseline'} /><div className="report-delta-grid">{[['NEW', comparison.new.length, 'new'], ['FIXED', comparison.fixed.length, 'fixed'], ['REGRESSED', comparison.regressed.length, 'regressed']].map(([label, value, tone]) => <div key={label} className={`report-delta-card ${tone}`}><strong>{value}</strong><span>{label}</span></div>)}</div></Card>}

          <Card>
            <CH left="EXPORT" right="same data as preview" />
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select value={template} onChange={event => setTemplate(event.target.value)} style={{ padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--s2)', color: 'var(--t1)', fontFamily: 'var(--mono)', fontSize: 11 }}>
                <option value="standard">Standard report</option>
                <option value="hackerone">HackerOne submission draft</option>
                <option value="bugcrowd">Bugcrowd submission draft</option>
              </select>
              <p className="empty-copy" style={{ margin: 0 }}>
                Markdown/JSON export the previewed content. Bounty templates switch the document to a
                per-finding submission draft (severity, asset, steps to reproduce, impact).
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Btn accent onClick={exportMarkdown} disabled={!meta}>MARKDOWN</Btn>
                <Btn onClick={exportHtml} disabled={!meta}>HTML REPORT</Btn>
                <Btn onClick={exportPdf} disabled={!meta}>PRINT / PDF</Btn>
                <Btn onClick={exportJson} disabled={!meta}>JSON DATA</Btn>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
