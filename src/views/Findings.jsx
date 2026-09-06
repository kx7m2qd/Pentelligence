import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/common/Card';
import { CH } from '../components/common/CH';
import { Tag } from '../components/common/Tag';
import { Btn } from '../components/common/Btn';
import { EmptyState } from '../components/common/EmptyState';
import { apiGet, apiPatch } from '../lib/api';
import { sc, sb } from '../utils/colors';

function sourceMeta(source) {
  if (source === 'nuclei') return { label: 'NUCLEI CONFIRMED', color: 'var(--acc)', bg: 'rgba(184,255,87,.1)' };
  return { label: 'AI SUGGESTED', color: 'var(--yellow)', bg: 'rgba(255,209,102,.1)' };
}

export default function Findings({ scanId, onGoLive, onOpenHost }) {
  const [findings, setFindings] = useState([]);
  const [reviews, setReviews] = useState({});
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('severity');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!scanId) return undefined;

    const poll = async () => {
      try {
        const [findingsData, nucleiData, reviewsData] = await Promise.all([
          apiGet(`/agent/findings/${scanId}`),
          apiGet(`/nuclei/findings/${scanId}`),
          apiGet(`/findings/reviews/${scanId}`),
        ]);
        const agentFindings = (findingsData.findings || []).map(finding => ({
          ...finding,
          source: 'agent',
          host: finding.hostname || finding.ip,
        }));
        const nucleiFindings = (nucleiData.findings || []).map(finding => ({
          ...finding,
          title: finding.name,
          score: finding.cvss_score,
          source: 'nuclei',
          host: finding.hostname || finding.ip,
        }));
        setFindings([...nucleiFindings, ...agentFindings]);
        setReviews(Object.fromEntries((reviewsData.reviews || []).map(review => [`${review.source}:${review.finding_id}`, review])));
        setError('');
      } catch (err) {
        setError(err.message);
      }
    };

    void poll();
    const intervalId = setInterval(() => void poll(), 3000);
    return () => clearInterval(intervalId);
  }, [scanId]);

  const severityCounts = useMemo(() => findings.reduce((counts, finding) => {
    const severity = String(finding.severity || 'unknown').toUpperCase();
    counts[severity] = (counts[severity] || 0) + 1;
    return counts;
  }, {}), [findings]);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return findings.filter(item => {
      const review = reviews[`${item.source}:${item.id}`] || {};
      const status = review.status || 'open';
      if (filter === 'open' && status !== 'open') return false;
      if (filter === 'in_progress' && status !== 'in_progress') return false;
      if (filter === 'resolved' && status !== 'resolved') return false;
      if (filter === 'nuclei' && item.source !== 'nuclei') return false;
      if (filter === 'agent' && item.source !== 'agent') return false;
      if (filter === 'critical' && String(item.severity).toUpperCase() !== 'CRITICAL') return false;
      if (!search) return true;
      return [item.title, item.cve_id, item.template_id, item.host, item.ip, review.assignee, review.analyst_note]
        .filter(Boolean).join(' ').toLowerCase().includes(search);
    }).sort((left, right) => {
      if (sortBy === 'title') return String(left.title || left.cve_id || '').localeCompare(String(right.title || right.cve_id || ''));
      if (sortBy === 'source') return String(left.source).localeCompare(String(right.source));
      return (rank[String(right.severity).toUpperCase()] || 0) - (rank[String(left.severity).toUpperCase()] || 0);
    });
  }, [findings, reviews, filter, query, sortBy]);

  const [reviewDraft, setReviewDraft] = useState({
    status: 'open',
    assignee: '',
    remediationDueAt: '',
    analystNote: '',
  });

  useEffect(() => {
    if (!selected) return undefined;
    const id = setTimeout(() => {
      const current = reviews[`${selected.source}:${selected.id}`] || {};
      setReviewDraft({
        status: current.status || 'open',
        assignee: current.assignee || '',
        remediationDueAt: current.remediation_due_at ? String(current.remediation_due_at).slice(0, 10) : '',
        analystNote: current.analyst_note || '',
      });
    }, 0);
    return () => clearTimeout(id);
  }, [selected, reviews]);

  const saveReview = async updates => {
    if (!selected) return;
    const merged = { ...reviewDraft, ...updates };
    setReviewDraft(merged);
    try {
      const response = await apiPatch(`/findings/reviews/${scanId}/${selected.source}/${selected.id}`, merged);
      setReviews(current => ({ ...current, [`${selected.source}:${selected.id}`]: response.review }));
    } catch (err) {
      setError(err.message);
    }
  };

  if (!scanId) {
    return (
      <div className="page">
        <EmptyState eyebrow="FINDINGS" description="Start an investigation from Live. Confirmed nuclei matches and AI suggestions will land here." onAction={onGoLive} />
      </div>
    );
  }

  return (
    <div className="page findings-page">
      {error && <div className="app-banner error">{error}</div>}
      <div className="finding-summary panel">
        <div className="finding-summary-head"><div><div className="eyebrow">RISK DISTRIBUTION</div><div className="finding-summary-title">{findings.length ? `${findings.length} finding${findings.length === 1 ? '' : 's'} detected` : 'No findings detected yet'}</div></div><span className="finding-summary-note">live inbox</span></div>
        <div className="severity-bar">{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(severity => <span key={severity} className={`severity-segment ${severity.toLowerCase()}`} style={{ flex: severityCounts[severity] || 0 }} />)}{!findings.length && <span className="severity-empty" />}</div>
        <div className="severity-legend">{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(severity => <span key={severity}><i className={`severity-dot ${severity.toLowerCase()}`} />{severity} <strong>{severityCounts[severity] || 0}</strong></span>)}</div>
      </div>
      <div className="findings-toolbar">
        {[
          ['all', 'All'],
          ['open', 'Open'],
          ['in_progress', 'In Progress'],
          ['resolved', 'Resolved'],
          ['nuclei', 'Nuclei confirmed'],
          ['agent', 'AI suggested'],
          ['critical', 'Critical'],
        ].map(([id, label]) => (
          <button key={id} type="button" className={`filter-chip ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>{label}</button>
        ))}
        <input className="finding-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search findings, assignee, notes…" aria-label="Search findings" />
        <select className="finding-sort" value={sortBy} onChange={event => setSortBy(event.target.value)} aria-label="Sort findings"><option value="severity">Sort: severity</option><option value="title">Sort: title</option><option value="source">Sort: source</option></select>
        <span className="findings-count">{visible.length} shown</span>
      </div>
      <div className="findings-layout">
        <Card>
          <CH left="INBOX" right={`${findings.length} total`} />
          {visible.length === 0 ? (
            <div className="program-empty">No findings in this filter yet.</div>
          ) : visible.map(finding => {
            const meta = sourceMeta(finding.source);
            const active = selected && selected.id === finding.id && selected.source === finding.source;
            const review = reviews[`${finding.source}:${finding.id}`] || {};
            const isResolved = review.status === 'resolved';
            const isOverdue = review.remediation_due_at && new Date(review.remediation_due_at) < new Date() && !isResolved;

            return (
              <button type="button" key={`${finding.source}-${finding.id}`} className={`finding-item ${active ? 'active' : ''}`} onClick={() => setSelected(finding)}>
                <div className="finding-item-top">
                  <Tag label={finding.severity} color={sc(finding.severity)} bg={sb(finding.severity)} />
                  <Tag label={meta.label} color={meta.color} bg={meta.bg} />
                  {review.status && (
                    <span style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 9,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: isResolved ? 'rgba(184,255,87,.15)' : review.status === 'in_progress' ? 'rgba(117,185,255,.15)' : 'var(--s3)',
                      color: isResolved ? 'var(--acc)' : review.status === 'in_progress' ? 'var(--blue)' : 'var(--t3)',
                      textTransform: 'uppercase',
                    }}>
                      {review.status.replace('_', ' ')}
                    </span>
                  )}
                  {isOverdue && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,77,109,.15)', color: 'var(--red)' }}>
                      OVERDUE
                    </span>
                  )}
                </div>
                <div className="finding-title">{finding.title || finding.cve_id || 'Untitled'}</div>
                <div className="finding-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{finding.host}{finding.port ? `:${finding.port}` : ''} · {finding.cve_id || finding.template_id || '—'}</span>
                  {review.assignee && (
                    <span style={{ color: 'var(--acc)', fontFamily: 'var(--mono)', fontSize: 10 }}>👤 {review.assignee}</span>
                  )}
                </div>
              </button>
            );
          })}
        </Card>
        <Card>
          <CH left="DETAIL & REMEDIATION" right={selected ? sourceMeta(selected.source).label : 'select a finding'} />
          {!selected ? (
            <div className="program-empty">Select a finding to inspect evidence and set remediation details.</div>
          ) : (
            <div className="finding-detail" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--sans)', fontSize: 18 }}>{selected.title || selected.name}</h2>
                <p style={{ margin: 0, color: 'var(--t2)', fontSize: 13, lineHeight: 1.6 }}>{selected.description || 'No description provided.'}</p>
              </div>

              {selected.matched_at && (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>MATCHED AT</div>
                  <code style={{ display: 'block', padding: '8px 12px', borderRadius: 6, background: 'var(--s2)', border: '1px solid var(--border)', overflowWrap: 'anywhere' }}>{selected.matched_at}</code>
                </div>
              )}
              {selected.curl_cmd && (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>CURL VERIFICATION</div>
                  <code style={{ display: 'block', padding: '8px 12px', borderRadius: 6, background: 'var(--s2)', border: '1px solid var(--border)', overflowWrap: 'anywhere' }}>{selected.curl_cmd}</code>
                </div>
              )}

              <div style={{ padding: '14px', borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="eyebrow">REMEDIATION & ASSIGNMENT</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>STATUS</label>
                    <select
                      value={reviewDraft.status}
                      onChange={e => void saveReview({ status: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--s3)', color: 'var(--t1)', fontFamily: 'var(--mono)', fontSize: 11 }}
                    >
                      <option value="open">OPEN</option>
                      <option value="in_progress">IN PROGRESS</option>
                      <option value="accepted_risk">ACCEPTED RISK</option>
                      <option value="false_positive">FALSE POSITIVE</option>
                      <option value="resolved">RESOLVED</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>ASSIGNEE</label>
                    <input
                      placeholder="e.g. alice, devops"
                      value={reviewDraft.assignee}
                      onChange={e => setReviewDraft({ ...reviewDraft, assignee: e.target.value })}
                      onBlur={() => void saveReview({ assignee: reviewDraft.assignee })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--s3)', color: 'var(--t1)', fontFamily: 'var(--mono)', fontSize: 11 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>REMEDIATION DUE DATE</label>
                  <input
                    type="date"
                    value={reviewDraft.remediationDueAt}
                    onChange={e => {
                      setReviewDraft({ ...reviewDraft, remediationDueAt: e.target.value });
                      void saveReview({ remediationDueAt: e.target.value });
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--s3)', color: 'var(--t1)', fontFamily: 'var(--mono)', fontSize: 11 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>ANALYST NOTES & REMEDIATION LOG</label>
                  <textarea
                    rows={3}
                    placeholder="Add triage notes, patch tickets, proof-of-concept steps…"
                    value={reviewDraft.analystNote}
                    onChange={e => setReviewDraft({ ...reviewDraft, analystNote: e.target.value })}
                    onBlur={() => void saveReview({ analystNote: reviewDraft.analystNote })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--s3)', color: 'var(--t1)', fontFamily: 'var(--mono)', fontSize: 11, resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>Changes save automatically on edit</span>
                  <Btn sm onClick={() => onOpenHost?.(selected.host)}>VIEW ON SURFACE</Btn>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
