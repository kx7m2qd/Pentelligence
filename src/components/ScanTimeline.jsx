import React, { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { formatTimestamp } from '../utils/dates';

export default function ScanTimeline({ scanId, load = apiGet }) {
  const [result, setResult] = useState({ loading: true, events: [], error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    load(`/recon/status/${scanId}`).then(data => {
      if (active) setResult({ loading: false, events: data.timeline || [], error: '' });
    }).catch(error => {
      if (active) setResult({ loading: false, events: [], error: error.message });
    });
    return () => { active = false; };
  }, [scanId, revision, load]);
  const refresh = () => {
    setResult({ loading: true, events: [], error: '' });
    setRevision(value => value + 1);
  };
  return (
    <section aria-label={`Phase timeline for scan ${scanId}`} style={{ gridColumn: '1 / -1', fontFamily: 'var(--mono)', fontSize: 11 }}>
      <button type="button" onClick={refresh} disabled={result.loading}>Refresh timeline</button>
      {result.loading ? <p role="status">Loading timeline…</p> : result.error ? <p role="alert">{result.error}</p> :
        result.events.length === 0 ? <p>No phase events recorded for this scan.</p> :
          <ol style={{ display: 'grid', gap: 10, paddingLeft: 22 }}>
            {result.events.map((event, index) => (
              <li key={index}>
                <strong>Attempt {event.attempt} · {event.phase} · {event.status}</strong>
                <div style={{ color: 'var(--t3)', marginTop: 3 }}>{formatTimestamp(event.created_at)}</div>
                <div style={{ overflowWrap: 'anywhere', marginTop: 3 }}>{event.message}</div>
                {event.error_message && <div style={{ color: 'var(--red)' }}>{event.error_message}</div>}
              </li>
            ))}
          </ol>}
    </section>
  );
}
