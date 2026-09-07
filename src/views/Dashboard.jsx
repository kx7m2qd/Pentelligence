import React, { useEffect, useRef, useState } from 'react';
import { Card } from '../components/common/Card';
import { CH } from '../components/common/CH';
import { Btn } from '../components/common/Btn';
import { apiGet, apiStream } from '../lib/api';

const PHASE_ORDER = ['queued', 'subfinder', 'nmap', 'web', 'agent', 'nuclei', 'done'];

function readinessTone(tool) {
  if (tool.installed) return { color: 'var(--acc)', bg: 'rgba(184,255,87,.08)', label: 'READY' };
  if (tool.required) return { color: 'var(--red)', bg: 'rgba(255,77,109,.08)', label: 'MISSING' };
  return { color: 'var(--yellow)', bg: 'rgba(255,209,102,.08)', label: 'OPTIONAL' };
}

function getModuleStatus(scan, phaseName) {
  if (!scan) return 'pending';
  if (scan.status === 'error' && scan.phase === phaseName) return 'error';
  if (scan.status === 'done' && phaseName === 'done') return 'done';

  const currentIndex = PHASE_ORDER.indexOf(scan.phase || 'queued');
  const moduleIndex = PHASE_ORDER.indexOf(phaseName);

  if (scan.status === 'done' && moduleIndex < PHASE_ORDER.length - 1) return 'done';
  if (currentIndex > moduleIndex) return 'done';
  if (currentIndex === moduleIndex && scan.status === 'running') return 'running';
  return 'pending';
}

export default function Dashboard({
  scanning,
  setScanning,
  termRef,
  scanId,
  target,
  setTarget,
  startScan,
  authorizationConfirmed,
  setAuthorizationConfirmed,
  selectedProgram,
  onOpenPrograms,
  intensity,
  setIntensity,
  intensities,
  portProfile,
  setPortProfile,
  portProfiles,
  onScanUpdate,
  onOpenFindings,
  onOpenSurface,
}) {
  const [scan, setScan] = useState(null);
  const [logs, setLogs] = useState([]);
  const [findingCount, setFindingCount] = useState(0);
  const [stats, setStats] = useState({ hostsFound: 0, openPorts: 0, subdomainsFound: 0 });
  const [decision, setDecision] = useState(null);
  const [toolHealth, setToolHealth] = useState(null);
  const [groqHealth, setGroqHealth] = useState(null);
  const [noProgramAccepted, setNoProgramAccepted] = useState(false);
  const previousFindingCount = useRef(0);

  useEffect(() => {
    const loadToolHealth = async () => {
      try {
        const [tools, groq] = await Promise.all([apiGet('/health/tools'), apiGet('/health/groq')]);
        setToolHealth(tools);
        setGroqHealth(groq);
      } catch (err) {
        console.error('tool readiness failed:', err);
      }
    };

    void loadToolHealth();
  }, []);

  useEffect(() => {
    if (!scanId) return undefined;
    const controller = new AbortController();
    const applySnapshot = snapshot => {
      const nextScan = snapshot.scan || null;
      setScan(nextScan);
      onScanUpdate?.(nextScan);
      setStats(snapshot.stats || { hostsFound: 0, openPorts: 0, subdomainsFound: 0 });
      setDecision(snapshot.decision || null);
      setLogs((snapshot.logs || []).filter(entry => ['log', 'nuclei-log', 'web-log'].includes(entry.type)).map(entry => entry.content));
      const nextFindingCount = snapshot.findingCount || 0;
      if (nextFindingCount > previousFindingCount.current && previousFindingCount.current > 0 && typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification('Pentelligence finding detected', { body: `${nextFindingCount - previousFindingCount.current} new finding(s) on ${nextScan?.target || 'target'}` });
      previousFindingCount.current = nextFindingCount;
      setFindingCount(nextFindingCount);
      if (['done', 'error', 'cancelled'].includes(nextScan?.status)) setScanning(false);
    };
    void apiStream(`/recon/events/${scanId}`, event => { if (event.event === 'scan') applySnapshot(event.data); }, controller.signal).catch(err => { if (!controller.signal.aborted) console.error('dashboard event stream failed:', err); });
    return () => controller.abort();
  }, [scanId, setScanning, onScanUpdate]);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [logs, termRef]);

  const tools = (toolHealth?.tools || []).map(tool => tool.id === 'groq' && groqHealth ? {
    ...tool,
    installed: groqHealth.reachable,
    status: groqHealth.reachable ? 'ready' : 'missing',
    version: groqHealth.reachable ? groqHealth.model : null,
    recommendation: groqHealth.message,
  } : tool);
  const readinessSummary = toolHealth?.summary ? {
    ...toolHealth.summary,
    readyRequired: tools.filter(tool => tool.required && tool.installed).length,
  } : null;
  const modules = [
    { label: 'Subdomain enum', phase: 'subfinder' },
    { label: 'Port scan', phase: 'nmap' },
    { label: 'HTTP probe', phase: 'web' },
    { label: 'AI ranking (Groq)', phase: 'agent' },
    { label: 'Nuclei confirmation', phase: 'nuclei' },
  ].map(module => ({ ...module, status: getModuleStatus(scan, module.phase) }));

  const doneCount = modules.filter(module => module.status === 'done').length;
  const coveragePct = scanId ? Math.round((doneCount / modules.length) * 100) : 0;

  if (!scanId) {
    const readyCount = tools.filter(tool => tool.installed).length;
    const intensityList = Object.values(intensities || {});
    const portProfileList = Object.values(portProfiles || {});
    const selectedPortProfile = portProfiles?.[portProfile];
    return (
      <div className="page">
        <div className="empty-hero">
          <section className="panel hero-copy" style={{ animation: 'fadeUp .45s ease both' }}>
            <div className="eyebrow">Authorized investigation</div>
            <h1 className="hero-title">Scope, then scan. <em>One job.</em></h1>
            <p className="hero-description">
              Map an authorized attack surface, confirm exposure with nuclei, and rank what to fix.
              AI ranks and explains. Scanners do the work.
            </p>
            <div className="setup-field">
              <label htmlFor="setup-target">Target</label>
              <div className="setup-input">
                <span>host://</span>
                <input
                  id="setup-target"
                  value={target}
                  onChange={event => setTarget(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && startScan()}
                  placeholder="authorized-domain.com"
                />
              </div>
            </div>
            <div className="setup-row">
              <div className="setup-field" style={{ flex: 1 }}>
                <span>Program / scope</span>
                <button type="button" className="program-picker" onClick={onOpenPrograms}>
                  {selectedProgram ? `${selectedProgram.name} · ${selectedProgram.scope?.length || 0} rules` : 'No program — unrestricted host check only'}
                </button>
              </div>
            </div>
            <div className="setup-field">
              <span>Intensity</span>
              <div className="intensity-row">
                {intensityList.map(item => (
                  <button
                    key={item.name}
                    type="button"
                    className={`intensity-chip ${intensity === item.name ? 'active' : ''}`}
                    onClick={() => setIntensity(item.name)}
                  >
                    <strong>{item.label}</strong>
                    <small>{item.desc}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="setup-field">
              <span>Port coverage</span>
              <div className="intensity-row">
                {portProfileList.map(item => (
                  <button key={item.name} type="button" className={`intensity-chip ${portProfile === item.name ? 'active' : ''}`} onClick={() => setPortProfile(item.name)}>
                    <strong>{item.label}</strong>
                    <small>{item.desc}</small>
                  </button>
                ))}
              </div>
              {selectedPortProfile?.warning && <p className="empty-copy" style={{ margin: '8px 0 0', color: 'var(--orange)' }}>{selectedPortProfile.warning}</p>}
            </div>
            <label className="authorized-note" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={authorizationConfirmed} onChange={event => setAuthorizationConfirmed(event.target.checked)} style={{ accentColor: 'var(--acc)' }} />
              {selectedProgram
                ? 'I confirm I own this target or have explicit written permission to test it.'
                : 'I confirm I own this target or have explicit written permission to test it — with no bounty program linked, only this single host is checked.'}
            </label>
            {!selectedProgram && (
              <label className="authorized-note" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={noProgramAccepted} onChange={event => setNoProgramAccepted(event.target.checked)} style={{ accentColor: 'var(--acc)' }} />
                I accept running with no program — scans stay restricted to the single target above.
              </label>
            )}
            <div className="hero-actions">
              <Btn accent onClick={startScan} disabled={!target.trim() || !authorizationConfirmed || scanning || (!selectedProgram && !noProgramAccepted)}>
                START INVESTIGATION
              </Btn>
              <Btn onClick={onOpenPrograms}>MANAGE PROGRAMS</Btn>
            </div>
          </section>
          <aside className="panel readiness-board" style={{ animation: 'fadeUp .45s ease .12s both' }}>
            <div className="readiness-head">
              <div>
                <div className="eyebrow">Environment</div>
                <div className="section-title" style={{ marginTop: 6 }}>Scanner readiness</div>
              </div>
              <span className="readiness-score">{tools.length ? `${readyCount}/${tools.length} ONLINE` : 'CHECKING'}</span>
            </div>
            <div className="tool-list">
              {tools.length ? tools.map(tool => (
                <div className="tool-row" key={tool.id}>
                  <span className="tool-dot" style={{ background: tool.installed ? 'var(--acc)' : tool.required ? 'var(--red)' : 'var(--yellow)', boxShadow: `0 0 12px ${tool.installed ? 'var(--acc)' : tool.required ? 'var(--red)' : 'var(--yellow)'}` }} />
                  <span className="tool-name">{tool.label}</span>
                  <span className="tool-meta">{tool.installed ? (tool.version || 'READY') : 'UNAVAILABLE'}</span>
                </div>
              )) : (
                <div className="tool-row"><span className="tool-dot" style={{ background: 'var(--t3)' }} /><span className="tool-name">Checking services...</span></div>
              )}
            </div>
            <div className="steps">
              <div className="eyebrow">What runs</div>
              <div className="step"><span className="step-index">01</span><span>Discover in-scope hosts and services.</span></div>
              <div className="step"><span className="step-index">02</span><span>Confirm with nuclei templates.</span></div>
              <div className="step"><span className="step-index">03</span><span>Rank findings and export a report.</span></div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  const terminalLines = logs.length > 0 ? logs : scan?.message ? [scan.message] : [];
  const signalLabel = scan?.status === 'error' ? 'Pipeline blocked' : scan?.status === 'done' ? 'Investigation complete' : scan?.phase ? `${scan.phase} pass active` : 'Warming up scanner';

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="panel scan-hero">
        <div className="scan-hero-top">
          <div className="target-mark">◉</div>
          <div>
            <div className="eyebrow">Active investigation</div>
            <div className="scan-target">{scan?.target || target}</div>
            <div className="scan-status">{scan?.message || 'Preparing scanner modules...'}</div>
          </div>
          <span className="signal" style={{ marginLeft: 'auto' }}><i /> {scanning ? 'LIVE' : scan?.status?.toUpperCase()}</span>
        </div>
        <div className="progress-track"><div className="progress-value" style={{ width: `${coveragePct}%` }} /></div>
        <div className="phase-row">{['DISCOVER', 'MAP', 'ANALYZE', 'VALIDATE', 'REPORT'].map((phase, index) => <span className={`phase ${index < Math.ceil((coveragePct / 100) * 5) ? 'active' : ''}`} key={phase}>{phase}</span>)}</div>
        <div className="live-jump">
          <Btn sm onClick={onOpenSurface}>ATTACK SURFACE</Btn>
          <Btn sm onClick={onOpenFindings}>FINDINGS{findingCount ? ` (${findingCount})` : ''}</Btn>
        </div>
      </section>
      <section className="telemetry-strip" aria-label="Live investigation telemetry">
        <div className="telemetry-cell telemetry-primary"><span className="telemetry-kicker">Pipeline coverage</span><div className="telemetry-mainline"><strong>{coveragePct}%</strong><span>{doneCount} / {modules.length} modules</span></div><div className="telemetry-track"><span style={{ width: `${coveragePct}%` }} /></div></div>
        <div className="telemetry-cell"><span className="telemetry-kicker">Events captured</span><strong className="telemetry-value">{logs.length}</strong><span className="telemetry-note">engine log entries</span></div>
        <div className="telemetry-cell"><span className="telemetry-kicker">Current signal</span><div className={`telemetry-signal ${scan?.status === 'error' ? 'is-error' : scan?.status === 'done' ? 'is-done' : ''}`}><i /><strong>{signalLabel}</strong></div><span className="telemetry-note">{findingCount} finding{findingCount === 1 ? '' : 's'} in inbox</span></div>
      </section>
      <div className="stats-grid">
        {[
          { label: 'Hosts alive', val: stats.hostsFound, sub: 'discovered', color: 'var(--acc)' },
          { label: 'Open ports', val: stats.openPorts, sub: 'services mapped', color: 'var(--t1)' },
          { label: 'Findings', val: findingCount, sub: 'open inbox', color: 'var(--red)' },
          { label: 'Coverage', val: `${coveragePct}%`, sub: `${doneCount}/${modules.length} modules`, color: 'var(--yellow)' },
        ].map((stat, index) => (
          <Card key={stat.label} style={{ animation: `fadeUp .3s ease ${index * 0.07}s both` }}>
            <div className="stat-card"><div className="label">{stat.label}</div><div className="value" style={{ color: stat.color }}>{stat.val}</div><div className="sub">{stat.sub}</div></div>
          </Card>
        ))}
      </div>

      <Card>
        <CH
          left="SYSTEM READINESS"
          right={readinessSummary ? `${readinessSummary.readyRequired}/${readinessSummary.totalRequired} required ready` : 'checking'}
        />
        <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
          {tools.length > 0 ? tools.map(tool => {
            const tone = readinessTone(tool);
            return (
              <div key={tool.id} style={{ padding: '11px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--s2)', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: tone.color, boxShadow: `0 0 12px ${tone.color}55` }} />
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--t1)', fontWeight: 600 }}>{tool.label}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9, color: tone.color, background: tone.bg, borderRadius: 4, padding: '2px 6px' }}>{tone.label}</span>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: tool.installed ? 'var(--t3)' : tone.color, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                  {tool.version || tool.path || tool.recommendation}
                </div>
              </div>
            );
          }) : (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)' }}>Checking local scanner tools...</div>
          )}
        </div>
      </Card>

      <div className="dashboard-grid">
        <Card>
          <CH left="PIPELINE" right={scan ? `${scan.phase || 'queued'} · ${scan.status}` : 'idle'} />
          {modules.map(module => (
            <div key={module.phase} style={{ padding: '11px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: module.status === 'running' ? 'rgba(184,255,87,.03)' : 'transparent' }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: module.status === 'done' ? 'var(--acc)' : module.status === 'running' ? 'var(--orange)' : module.status === 'error' ? 'var(--red)' : 'var(--t3)',
                animation: module.status === 'running' ? 'pulse 1s infinite' : 'none',
              }} />
              <div style={{ flex: 1, fontFamily: 'var(--sans)', fontSize: 13, color: module.status === 'pending' ? 'var(--t3)' : 'var(--t1)' }}>{module.label}</div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: module.status === 'running' ? 'var(--orange)' : module.status === 'error' ? 'var(--red)' : 'var(--t3)' }}>
                {module.status === 'done' ? '✓' : module.status === 'running' ? 'running…' : module.status === 'error' ? 'failed' : '—'}
              </span>
            </div>
          ))}
          {scan && (
            <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--t3)', marginBottom: 8 }}>STATUS</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: scan.status === 'error' ? 'var(--red)' : 'var(--acc)', marginBottom: 4 }}>
                {scan.status?.toUpperCase()} / {scan.phase?.toUpperCase()}
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--t2)', lineHeight: 1.5 }}>
                {scan.error_message || scan.message || 'Waiting for scan updates'}
              </div>
            </div>
          )}
          {decision && (
            <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--t3)', marginBottom: 8 }}>AI SUGGESTION (NOT EXECUTED)</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--acc)', marginBottom: 4 }}>
                → {decision.next_action?.toUpperCase()}
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--t2)', lineHeight: 1.5 }}>{decision.reason}</div>
            </div>
          )}
        </Card>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--yellow)' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--acc)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)', marginLeft: 6 }}>engine.log</span>
            <button type="button" onClick={() => typeof Notification !== 'undefined' && Notification.requestPermission()} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 9, cursor: 'pointer' }}>ENABLE ALERTS</button>
            {scanning && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--orange)' }}>● live</span>}
          </div>
          <div ref={termRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 3, minHeight: 200 }}>
            {terminalLines.map((line, index) => {
              const ai = line.includes('Groq:') || line.includes('Agent');
              const isError = line.toLowerCase().includes('failed') || line.toLowerCase().includes('error');
              return (
                <div
                  key={`${index}-${line.slice(0, 24)}`}
                  style={{
                    fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                    color: isError ? 'var(--red)' : ai ? 'var(--acc)' : line.toLowerCase().includes('critical') ? 'var(--orange)' : 'var(--t2)',
                    paddingLeft: ai ? 8 : 0, borderLeft: ai ? '2px solid var(--acc)' : 'none',
                  }}
                >
                  {ai ? <span className="log-ai">AI </span> : null}{line}
                </div>
              );
            })}
            {scanning && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--acc)', animation: 'blink 1s infinite' }}>█</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
