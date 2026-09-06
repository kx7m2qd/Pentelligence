import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/common/Card';
import { CH } from '../components/common/CH';
import { Btn } from '../components/common/Btn';
import { Tag } from '../components/common/Tag';
import { apiDelete, apiGet, apiPost } from '../lib/api';

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(`${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function statusTone(status) {
  if (status === 'done') return { color: 'var(--acc)', bg: 'rgba(184,255,87,.08)' };
  if (status === 'running') return { color: 'var(--orange)', bg: 'rgba(255,140,66,.08)' };
  if (status === 'error') return { color: 'var(--red)', bg: 'rgba(255,77,109,.08)' };
  return { color: 'var(--t3)', bg: 'var(--s2)' };
}

export default function History({ currentScanId, onOpenScan, onStartFresh }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadHistory = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiGet('/recon/scans');
      setScans(data.scans || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const deleteScan = async scanId => {
    try {
      await apiDelete(`/recon/scan/${scanId}`);
      setScans(current => current.filter(scan => scan.id !== scanId));
    } catch (err) {
      setError(err.message);
    }
  };

  const retryScan = async scan => {
    try {
      await apiPost(`/recon/retry/${scan.id}`, {});
      onOpenScan({ ...scan, status: 'running', phase: 'queued' });
    } catch (err) {
      setError(err.message);
    }
  };

  const exportDatabaseBackup = async () => {
    try {
      const data = await apiGet('/recon/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pentelligence-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const visibleScans = useMemo(() => scans.filter(scan => {
    if (statusFilter !== 'all' && scan.status !== statusFilter) return false;
    return !query.trim() || `${scan.target} ${scan.id} ${scan.phase} ${scan.message}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [scans, query, statusFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 22 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Card style={{ flex: 1, padding: '16px 18px' }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--t3)', marginBottom: 8 }}>
            HISTORY
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--t2)', lineHeight: 1.6 }}>
            Start each session fresh, then reopen any previous scan from here when you need the logs, findings, exploit results, or report again.
          </div>
        </Card>
        <Btn onClick={exportDatabaseBackup}>EXPORT BACKUP</Btn>
        <Btn onClick={loadHistory} disabled={loading}>{loading ? 'REFRESHING…' : 'REFRESH'}</Btn>
        <Btn accent onClick={onStartFresh}>NEW SCAN</Btn>
      </div>

      {error && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 6,
          background: 'rgba(255,77,109,.1)',
          border: '1px solid rgba(255,77,109,.3)',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--red)',
        }}>
          {error}
        </div>
      )}

      <Card>
        <CH left="SAVED SCANS" right={`${visibleScans.length} of ${scans.length}`} />
        <div className="history-toolbar">
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search targets or scan IDs" aria-label="Search scan history" />
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter scan history">
            <option value="all">All statuses</option><option value="running">Running</option><option value="done">Complete</option><option value="error">Failed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
        {visibleScans.length === 0 ? (
          <div style={{ padding: '36px 18px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t3)' }}>
            {scans.length === 0 ? 'No scans saved yet.' : 'No scans match this filter.'}
          </div>
        ) : (
          visibleScans.map(scan => {
            const tone = statusTone(scan.status);
            const isSelected = currentScanId === scan.id;

            return (
              <div
                key={scan.id}
                className="history-row"
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border)',
                  background: isSelected ? 'rgba(184,255,87,.04)' : 'transparent',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--t1)', overflowWrap: 'anywhere' }}>
                    {scan.target}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>
                    Scan #{scan.id}
                  </div>
                </div>

                <Tag label={scan.status?.toUpperCase() || 'UNKNOWN'} color={tone.color} bg={tone.bg} />

                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)' }}>
                  {scan.phase || 'queued'}
                </div>

                <div className="history-msg" style={{ fontFamily: 'var(--sans)', fontSize: 12, color: scan.error_message ? 'var(--red)' : 'var(--t3)', lineHeight: 1.5 }}>
                  {scan.error_message || scan.message || 'No details'}
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  {(scan.status === 'error' || scan.status === 'cancelled') && (
                    <Btn sm accent onClick={() => retryScan(scan)}>RETRY</Btn>
                  )}
                  <Btn sm onClick={() => onOpenScan(scan)}>OPEN</Btn>
                  <Btn sm onClick={() => deleteScan(scan.id)} disabled={scan.status === 'running'}>DELETE</Btn>
                </div>

                <div style={{ gridColumn: '1 / -1', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>
                  Created: {formatDate(scan.created_at)}
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
