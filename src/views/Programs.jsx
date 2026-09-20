import React, { useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api';
import { Btn } from '../components/common/Btn';
import { Card } from '../components/common/Card';
import { CH } from '../components/common/CH';

function normalizeRule(rule) {
  return String(rule || '').trim().toLowerCase().replace(/^\*\./, '*.');
}

function matchesRule(hostname, rule) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '').replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  const normalized = normalizeRule(rule);
  if (!host || !normalized) return false;
  if (normalized.startsWith('*.')) return host.endsWith(normalized.slice(1)) && host !== normalized.slice(2);
  return host === normalized;
}

function validateScope(target, program) {
  if (!program) return { status: 'none', message: 'Select or create a program above to test scope' };
  const host = String(target || '').trim().toLowerCase().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  if (!host) return { status: 'idle', message: 'Enter a domain, hostname, or URL to validate against active scope' };

  const matchedExclude = (program.excludes || []).find(rule => matchesRule(host, rule));
  if (matchedExclude) {
    return {
      status: 'excluded',
      matchedRule: matchedExclude,
      message: `BLOCKED — Matches exclusion rule: "${matchedExclude}"`,
    };
  }

  const matchedScope = (program.scope || []).find(rule => matchesRule(host, rule));
  if (matchedScope) {
    return {
      status: 'in_scope',
      matchedRule: matchedScope,
      message: `PERMITTED — Matches authorized scope rule: "${matchedScope}"`,
    };
  }

  return {
    status: 'out_of_scope',
    message: `OUT-OF-SCOPE — Not covered by any approved program rules`,
  };
}

export default function Programs({ selectedProgram, onSelect }) {
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState({ name: '', platform: 'HackerOne', scope: '', excludes: '', notes: '', profile: 'safe' });
  const [error, setError] = useState('');
  const [testTarget, setTestTarget] = useState('');
  const [activeTesterProgramId, setActiveTesterProgramId] = useState(null);
  const [scheduleDraft, setScheduleDraft] = useState({ target: '', intervalHours: '24', authorizationConfirmed: false });
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    let active = true;
    apiGet('/programs').then(data => {
      if (active) setPrograms(data.programs || []);
    }).catch(err => {
      if (active) setError(err.message);
    });
    return () => { active = false; };
  }, []);

  const effectiveProgram = (activeTesterProgramId
    ? programs.find(p => p.id === activeTesterProgramId)
    : selectedProgram) || programs[0] || null;

  const scopeResult = validateScope(testTarget, effectiveProgram);

  useEffect(() => {
    if (!effectiveProgram) return;
    const defaultTarget = (effectiveProgram.scope || []).find(rule => !rule.startsWith('*.')) || '';
    setScheduleDraft({
      target: effectiveProgram.schedule?.target || defaultTarget,
      intervalHours: String(effectiveProgram.schedule?.interval_hours || 24),
      authorizationConfirmed: false,
    });
  }, [effectiveProgram]);

  const create = async event => {
    event.preventDefault();
    setError('');
    try {
      const profiles = { safe: { name: 'safe', rateLimit: 25, retries: 1 }, balanced: { name: 'balanced', rateLimit: 50, retries: 1 }, fast: { name: 'fast', rateLimit: 100, retries: 0 } };
      const response = await apiPost('/programs', { ...form, profile: profiles[form.profile] });
      setPrograms(current => [response.program, ...current]);
      setForm({ name: '', platform: 'HackerOne', scope: '', excludes: '', notes: '', profile: 'safe' });
    } catch (err) { setError(err.message); }
  };

  const remove = async id => {
    try { await apiDelete(`/programs/${id}`); setPrograms(current => current.filter(program => program.id !== id)); if (selectedProgram?.id === id) onSelect(null); }
    catch (err) { setError(err.message); }
  };

  const saveSchedule = async enabled => {
    if (!effectiveProgram) return;
    setSavingSchedule(true);
    setError('');
    try {
      const response = await apiPatch(`/programs/${effectiveProgram.id}/schedule`, {
        target: scheduleDraft.target,
        intervalHours: Number(scheduleDraft.intervalHours),
        enabled,
        authorizationConfirmed: enabled && scheduleDraft.authorizationConfirmed,
      });
      setPrograms(current => current.map(program => program.id === response.program.id ? response.program : program));
      if (selectedProgram?.id === response.program.id) onSelect(response.program);
      setScheduleDraft(current => ({ ...current, authorizationConfirmed: false }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <div className="page program-page">
      <div className="page-intro"><div className="eyebrow">Bounty workspace</div><h1>Programs</h1><p>Save scope once. Every linked scan is checked against it before reconnaissance starts.</p></div>
      {error && <div className="access-error">{error}</div>}
      
      {programs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <Card>
            <CH left="LIVE SCOPE VALIDATOR & PREVIEW" right={effectiveProgram ? `Testing against: ${effectiveProgram.name}` : 'select a program'} />
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 260px) 1fr', gap: 12 }}>
                <select
                  value={effectiveProgram?.id || ''}
                  onChange={e => setActiveTesterProgramId(Number(e.target.value))}
                  style={{ padding: '10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--s2)', color: 'var(--t1)', fontFamily: 'var(--mono)', fontSize: 11 }}
                >
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.scope.length} rules)</option>
                  ))}
                </select>
                <input
                  placeholder="Test hostname or URL e.g. api.staging.target.com or https://sub.target.com"
                  value={testTarget}
                  onChange={e => setTestTarget(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--s2)', color: 'var(--t1)', fontFamily: 'var(--mono)', fontSize: 12 }}
                />
              </div>

              <div style={{
                padding: '12px 16px',
                borderRadius: 8,
                background: scopeResult.status === 'in_scope'
                  ? 'rgba(184,255,87,.08)'
                  : scopeResult.status === 'excluded'
                    ? 'rgba(255,77,109,.08)'
                    : scopeResult.status === 'out_of_scope'
                      ? 'rgba(255,173,91,.08)'
                      : 'var(--s2)',
                border: scopeResult.status === 'in_scope'
                  ? '1px solid rgba(184,255,87,.3)'
                  : scopeResult.status === 'excluded'
                    ? '1px solid rgba(255,77,109,.3)'
                    : scopeResult.status === 'out_of_scope'
                      ? '1px solid rgba(255,173,91,.3)'
                      : '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: scopeResult.status === 'in_scope' ? 'var(--acc)' : scopeResult.status === 'excluded' ? 'var(--red)' : scopeResult.status === 'out_of_scope' ? 'var(--orange)' : 'var(--t3)' }}>
                  {scopeResult.message}
                </div>
                {scopeResult.status !== 'idle' && scopeResult.status !== 'none' && (
                  <span style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: scopeResult.status === 'in_scope' ? 'var(--acc)' : scopeResult.status === 'excluded' ? 'var(--red)' : 'var(--orange)',
                    color: '#101607',
                  }}>
                    {scopeResult.status.toUpperCase().replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {effectiveProgram && (
        <div style={{ marginTop: 18 }}>
          <Card>
            <CH
              left="CONTINUOUS PROGRAM WATCH"
              right={effectiveProgram.schedule?.enabled ? `ACTIVE · ${effectiveProgram.schedule.interval_hours === 24 ? 'DAILY' : 'WEEKLY'}` : 'PAUSED'}
            />
            <div style={{ padding: '16px 20px', display: 'grid', gap: 12 }}>
              <p style={{ margin: 0, color: 'var(--t2)', fontSize: 12, lineHeight: 1.6 }}>
                Re-scan one explicitly authorized in-scope target and send Discord alerts only for new or regressed findings. Enabling starts the first run after the selected cadence—not immediately.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 180px', gap: 10 }}>
                <input
                  value={scheduleDraft.target}
                  onChange={event => setScheduleDraft(current => ({ ...current, target: event.target.value }))}
                  placeholder="Exact in-scope hostname to monitor"
                  style={{ padding: '10px 12px', borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--s2)', color: 'var(--t1)', fontFamily: 'var(--mono)', fontSize: 11 }}
                />
                <select
                  value={scheduleDraft.intervalHours}
                  onChange={event => setScheduleDraft(current => ({ ...current, intervalHours: event.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--s2)', color: 'var(--t1)', fontFamily: 'var(--mono)', fontSize: 11 }}
                >
                  <option value="24">Daily · every 24 hours</option>
                  <option value="168">Weekly · every 7 days</option>
                </select>
              </div>
              <label className="authorized-note" style={{ marginTop: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={scheduleDraft.authorizationConfirmed}
                  onChange={event => setScheduleDraft(current => ({ ...current, authorizationConfirmed: event.target.checked }))}
                  style={{ accentColor: 'var(--acc)' }}
                />
                I confirm recurring scans are authorized for this exact target and program scope.
              </label>
              {effectiveProgram.schedule && (
                <div style={{ color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 10 }}>
                  Last: {effectiveProgram.schedule.last_run_at || 'never'} · Next: {effectiveProgram.schedule.next_run_at || 'not scheduled'} · Result: {effectiveProgram.schedule.last_status || 'never'}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn accent onClick={() => void saveSchedule(true)} disabled={savingSchedule || !scheduleDraft.target.trim() || !scheduleDraft.authorizationConfirmed}>
                  {savingSchedule ? 'SAVING…' : effectiveProgram.schedule?.enabled ? 'UPDATE SCHEDULE' : 'ENABLE WATCH'}
                </Btn>
                {effectiveProgram.schedule?.enabled ? <Btn onClick={() => void saveSchedule(false)} disabled={savingSchedule}>PAUSE WATCH</Btn> : null}
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="program-grid">
        <Card>
          <CH left="NEW PROGRAM" right="scope is required" />
          <form className="program-form" onSubmit={create}>
            <input placeholder="Program name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Platform" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} />
            <select value={form.profile} onChange={e => setForm({ ...form, profile: e.target.value })}><option value="safe">Safe profile · 25 req/s</option><option value="balanced">Balanced profile · 50 req/s</option><option value="fast">Fast profile · 100 req/s</option></select>
            <textarea placeholder="In-scope domains, one per line&#10;example.com&#10;*.example.com" value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} required />
            <textarea placeholder="Excluded domains, one per line" value={form.excludes} onChange={e => setForm({ ...form, excludes: e.target.value })} />
            <textarea placeholder="Rules and notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Btn accent type="submit">SAVE PROGRAM</Btn>
          </form>
        </Card>
        <Card>
          <CH left="SAVED PROGRAMS" right={`${programs.length} total`} />
          {programs.length === 0 ? <div className="program-empty">Create a program to enforce bounty scope.</div> : programs.map(program => (
            <div className={`program-row ${selectedProgram?.id === program.id ? 'selected' : ''}`} key={program.id}>
              <button className="program-select" onClick={() => onSelect(selectedProgram?.id === program.id ? null : program)}>
                <span className="eyebrow">{program.platform || 'Custom'}</span>
                <strong>{program.name}</strong>
                <small>{program.scope.length} scope rule{program.scope.length === 1 ? '' : 's'} · {program.excludes.length} exclusion{program.excludes.length === 1 ? '' : 's'}</small>
              </button>
              <Btn sm onClick={() => remove(program.id)}>DELETE</Btn>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
