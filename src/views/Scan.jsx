import React, { useEffect, useRef, useState } from 'react';
import { Card } from '../components/common/Card';
import { CH } from '../components/common/CH';
import { Tag } from '../components/common/Tag';
import { Btn } from '../components/common/Btn';
import { EmptyState } from '../components/common/EmptyState';
import { apiGet, apiPost } from '../lib/api';
import { sc, sb } from '../utils/colors';

// Advanced / Nuclei rerun. Deliberately minimal: this view does not pretend
// to configure the engine — the pipeline applies the profile chosen at start.
// It shows what nuclei actually confirmed and lets you rerun the same checks.

export default function Scan({ scanId, intensity, onGoLive }) {
  const [findings, setFindings] = useState([]);
  const [status, setStatus] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    if (!scanId) return undefined;

    const poll = async () => {
      try {
        const [nucleiData, statusData] = await Promise.all([
          apiGet(`/nuclei/findings/${scanId}`),
          apiGet(`/nuclei/status/${scanId}`).catch(() => null),
        ]);
        setFindings(nucleiData.findings || []);
        setStatus(statusData);
        setError('');
      } catch (err) {
        setError(err.message);
      }
    };

    void poll();
    pollRef.current = setInterval(() => void poll(), 3000);
    return () => clearInterval(pollRef.current);
  }, [scanId]);

  const rerun = async () => {
    setRunning(true);
    setNotice('');
    setError('');
    try {
      await apiPost(`/nuclei/run/${scanId}`, {});
      setNotice('Nuclei rerun started — matching templates run against every live host from this scan.');
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  if (!scanId) {
    return (
      <div className="page">
        <EmptyState eyebrow="NUCLEI CONFIRMATION" description="Nuclei re-checks every live host from an investigation against its template library and only reports verified matches. Start an investigation from Live first." onAction={onGoLive} />
      </div>
    );
  }

  const counts = findings.reduce((acc, f) => {
    const key = String(f.severity || 'unknown').toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page">
      {error && <div className="app-banner error">{error}</div>}
      {notice && <div className="app-banner" style={{ border: '1px solid rgba(184,255,87,.3)', background: 'rgba(184,255,87,.06)', color: 'var(--acc)' }}>{notice}</div>}

      <Card>
        <CH left="NUCLEI — CONFIRMED TEMPLATE MATCHES" right={status?.phase === 'nuclei' && status?.status === 'running' ? 'running…' : `${findings.length} confirmed`} />
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className="empty-copy" style={{ margin: 0 }}>
            These are template matches nuclei verified against your hosts — not AI guesses.
            The scan profile ({intensity || 'balanced'}) was applied by the pipeline; rerunning
            repeats the exact same checks. AI-suggested (unconfirmed) issues live in Findings.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(counts).map(([severity, count]) => (
              <Tag key={severity} label={`${severity} · ${count}`} color={sc(severity)} bg={sb(severity)} />
            ))}
            {findings.length === 0 && <Tag label="no confirmed matches" color="var(--t3)" bg="var(--s2)" />}
          </div>
          <div>
            <Btn accent onClick={() => void rerun()} disabled={running || status?.status === 'running'}>
              {running || status?.status === 'running' ? 'RUNNING…' : 'RERUN NUCLEI'}
            </Btn>
          </div>
        </div>
      </Card>

      <Card>
        <CH left="MATCHED TEMPLATES" />
        {findings.length === 0 ? (
          <div className="program-empty">
            No nuclei matches for this investigation yet. Rerun to re-check, or wait for the pipeline phase to finish.
          </div>
        ) : (
          findings.map(finding => (
            <div key={finding.id} className="module-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="module-name">{finding.name || finding.template_id || 'match'}</div>
                <div className="finding-meta">
                  {finding.hostname || finding.ip}{finding.matched_at ? ` · ${finding.matched_at}` : ''}
                  {finding.cve_id ? ` · ${finding.cve_id}` : ''}
                </div>
              </div>
              <Tag label={String(finding.severity || '—').toUpperCase()} color={sc(finding.severity)} bg={sb(finding.severity)} />
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
