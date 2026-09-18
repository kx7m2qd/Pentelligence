import React, { useEffect, useState } from 'react';
import { Card } from '../components/common/Card';
import { CH } from '../components/common/CH';
import { Tag } from '../components/common/Tag';
import { Btn } from '../components/common/Btn';
import { EmptyState } from '../components/common/EmptyState';
import { apiGet } from '../lib/api';
import { sc, sb } from '../utils/colors';

const GROUPS = [
  { key: 'new', label: 'NEW', tone: 'var(--orange)', desc: 'First seen in this scan' },
  { key: 'fixed', label: 'FIXED', tone: 'var(--acc)', desc: 'Present before, gone now' },
  { key: 'regressed', label: 'REGRESSED', tone: 'var(--red)', desc: 'Score increased since last scan' },
];

function FindingRow({ finding }) {
  const title = finding.title || finding.name || finding.cve_id || finding.template_id || 'Finding';
  return (
    <div className="module-row">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="module-name" style={{ fontSize: 13 }}>{title}</div>
        <div className="finding-meta">
          {finding.hostname || finding.ip || finding.host || 'unknown host'}
          {finding.cve_id ? ` · ${finding.cve_id}` : finding.template_id ? ` · ${finding.template_id}` : ''}
          {finding.source ? ` · ${finding.source === 'nuclei' ? 'confirmed' : 'ai suggested'}` : ''}
        </div>
      </div>
      <Tag label={String(finding.severity || '—').toUpperCase()} color={sc(finding.severity)} bg={sb(finding.severity)} />
    </div>
  );
}

export default function Changes({ scanId, onGoLive }) {
  const [comparison, setComparison] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scanId) return undefined;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiGet(`/recon/compare/${scanId}`);
        if (!active) return;
        setComparison(data.comparison || null);
        setPrevious(data.previous || null);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [scanId]);

  if (!scanId) {
    return (
      <div className="page">
        <EmptyState
          eyebrow="Changes"
          description="Run an investigation to compare findings against the previous scan of the same target. New, fixed and regressed findings land here."
          onAction={onGoLive}
        />
      </div>
    );
  }

  const counts = comparison
    ? { new: comparison.new.length, fixed: comparison.fixed.length, regressed: comparison.regressed.length, unchanged: comparison.unchanged.length }
    : { new: 0, fixed: 0, regressed: 0, unchanged: 0 };
  const deltas = counts.new + counts.fixed + counts.regressed;

  return (
    <div className="page">
      {error && <div className="app-banner error">{error}</div>}

      <Card>
        <CH left="DELTA VS PREVIOUS SCAN" right={loading ? 'loading…' : previous ? `previous scan #${previous.id}` : 'no previous scan'} />
        <div className="report-delta-grid">
          {GROUPS.map(group => (
            <div key={group.key} className={`report-delta-card ${group.key}`}>
              <strong style={{ color: group.tone }}>{counts[group.key]}</strong>
              <span>{group.label} · {group.desc}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '0 18px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)' }}>
          {previous
            ? `${counts.unchanged} finding${counts.unchanged === 1 ? '' : 's'} unchanged · ${deltas} change${deltas === 1 ? '' : 's'} since #${previous.id}`
            : 'No finished scan of this target yet — run another scan to see the delta.'}
        </div>
      </Card>

      {GROUPS.map(group => (
        <Card key={group.key}>
          <CH left={`${group.label} FINDINGS`} right={comparison ? `${counts[group.key]}` : null} />
          {!comparison || counts[group.key] === 0 ? (
            <div className="program-empty">
              {group.key === 'new' ? 'Nothing new in this scan.' : group.key === 'fixed' ? 'Nothing disappeared since the last scan.' : 'No score increases since the last scan.'}
            </div>
          ) : (
            comparison[group.key].map((finding, index) => (
              <FindingRow key={`${group.key}-${finding.id ?? index}`} finding={finding} />
            ))
          )}
        </Card>
      ))}

      <div style={{ display: 'flex', gap: 10 }}>
        <Btn onClick={onGoLive}>GO TO LIVE</Btn>
      </div>
    </div>
  );
}
