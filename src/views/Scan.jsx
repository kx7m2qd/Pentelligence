import React, { useState, useEffect } from 'react';
import { Card }        from '../components/common/Card';
import { CH }          from '../components/common/CH';
import { Tag }         from '../components/common/Tag';
import { Btn }         from '../components/common/Btn';
import { TEMPLATES }   from '../data/constants';

/* ─── severity colour map ─────────────────────────────────────────────────── */
const SEV_COLORS = {
  CRITICAL: { bg: 'rgba(255,45,85,.12)',  border: 'rgba(255,45,85,.35)',  text: '#ff2d55' },
  HIGH:     { bg: 'rgba(255,149,0,.12)',  border: 'rgba(255,149,0,.35)',  text: '#ff9500' },
  MEDIUM:   { bg: 'rgba(255,214,10,.12)', border: 'rgba(255,214,10,.35)', text: '#ffd60a' },
  LOW:      { bg: 'rgba(48,209,88,.12)',  border: 'rgba(48,209,88,.35)',  text: '#30d158' },
  UNKNOWN:  { bg: 'rgba(142,142,147,.08)',border: 'rgba(142,142,147,.25)',text: '#8e8e93' },
};

function sevColor(sev) {
  return SEV_COLORS[sev?.toUpperCase()] || SEV_COLORS.UNKNOWN;
}

/* ─── small reusable badge ───────────────────────────────────────────────── */
function SevBadge({ sev }) {
  const c = sevColor(sev);
  return (
    <span style={{
      fontFamily:'var(--mono)', fontSize:10, fontWeight:700,
      padding:'2px 7px', borderRadius:4,
      background:c.bg, border:`1px solid ${c.border}`, color:c.text,
      letterSpacing:'0.05em',
    }}>{sev}</span>
  );
}

/* ─── single finding card ────────────────────────────────────────────────── */
function FindingRow({ f }) {
  const [open, setOpen] = useState(false);
  const host = f.hostname || f.ip || '—';
  const c    = sevColor(f.severity);

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: open ? 'rgba(184,255,87,.025)' : 'transparent',
        transition: 'background .12s',
      }}
      onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--s2)'; }}
      onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* ── header row ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px' }}>
        {/* CONFIRMED badge */}
        <span style={{
          fontFamily:'var(--mono)', fontSize:9, fontWeight:800, letterSpacing:'0.08em',
          padding:'2px 6px', borderRadius:4,
          background:'rgba(48,209,88,.15)', border:'1px solid rgba(48,209,88,.35)', color:'#30d158',
        }}>CONFIRMED</span>

        <SevBadge sev={f.severity} />

        <span style={{ fontFamily:'var(--sans)', fontSize:13, color:'var(--t1)', flex:1, fontWeight:500 }}>
          {f.name}
        </span>

        {f.cve_id && (
          <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)', flexShrink:0 }}>
            {f.cve_id}
          </span>
        )}

        <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)', flexShrink:0 }}>
          {host}
        </span>

        {f.cvss_score > 0 && (
          <span style={{ fontFamily:'var(--mono)', fontSize:12, color:c.text, flexShrink:0, fontWeight:700 }}>
            {Number(f.cvss_score).toFixed(1)}
          </span>
        )}

        <span style={{ fontSize:11, color:'var(--t3)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* ── expanded detail ── */}
      {open && (
        <div style={{ padding:'0 16px 14px', display:'flex', flexDirection:'column', gap:10 }}>
          {f.description && (
            <p style={{ fontFamily:'var(--sans)', fontSize:12, color:'var(--t2)', margin:0, lineHeight:1.5 }}>
              {f.description}
            </p>
          )}
          {f.matched_at && (
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--t3)', letterSpacing:'0.08em' }}>
                MATCHED AT
              </span>
              <code style={{
                fontFamily:'var(--mono)', fontSize:11, color:'var(--acc)',
                background:'var(--s3)', padding:'5px 8px', borderRadius:4,
                wordBreak:'break-all',
              }}>
                {f.matched_at}
              </code>
            </div>
          )}
          {f.curl_cmd && (
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--t3)', letterSpacing:'0.08em' }}>
                CURL COMMAND
              </span>
              <code style={{
                fontFamily:'var(--mono)', fontSize:11, color:'var(--t2)',
                background:'var(--s3)', padding:'5px 8px', borderRadius:4,
                whiteSpace:'pre-wrap', wordBreak:'break-all',
              }}>
                {f.curl_cmd}
              </code>
            </div>
          )}
          <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--t3)' }}>
            SOURCE: {f.source || 'nuclei'}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── stat pill ──────────────────────────────────────────────────────────── */
function StatPill({ label, value, color }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap:2,
      padding:'8px 14px', borderRadius:8,
      background:color ? `${color}18` : 'var(--s2)',
      border:`1px solid ${color ? `${color}40` : 'var(--border)'}`,
    }}>
      <span style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:700, color: color || 'var(--t1)' }}>
        {value}
      </span>
      <span style={{ fontFamily:'var(--sans)', fontSize:10, color:'var(--t3)', letterSpacing:'0.08em' }}>
        {label}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Scan view
═══════════════════════════════════════════════════════════════════════════ */
export default function Scan() {
  // ── template toggles (left panel) ──────────────────────────────────────
  const [tpls,    setTpls]    = useState(TEMPLATES);
  const [profile, setProfile] = useState('aggressive');
  const [rate,    setRate]    = useState(150);
  const toggle = i => setTpls(t => t.map((x, j) => j === i ? { ...x, enabled: !x.enabled } : x));
  const enabled = tpls.filter(t => t.enabled);
  const total   = enabled.reduce((a, t) => a + t.count, 0);

  // ── live findings from API ──────────────────────────────────────────────
  const [scanId,   setScanId]   = useState(null);
  const [findings, setFindings] = useState([]);
  const [stats,    setStats]    = useState({ total:0, critical:0, high:0, medium:0, low:0 });
  const [running,  setRunning]  = useState(false);
  const [phase,    setPhase]    = useState('idle'); // idle | recon | agent | nuclei | done | error

  // ── poll findings whenever we have a scanId ─────────────────────────────
  useEffect(() => {
    if (!scanId) return;

    const poll = async () => {
      try {
        const [findRes, reconRes] = await Promise.all([
          fetch(`http://localhost:3001/api/nuclei/findings/${scanId}`),
          fetch(`http://localhost:3001/api/recon/status/${scanId}`),
        ]);
        const findData  = await findRes.json();
        const reconData = await reconRes.json();

        setFindings(findData.findings || []);
        setStats(findData.stats || { total:0, critical:0, high:0, medium:0, low:0 });

        const status = reconData.scan?.status;
        if (status === 'done' || status === 'error') {
          setRunning(false);
          setPhase(status);
        }
      } catch { /* server not up yet — ignore */ }
    };

    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [scanId]);

  // ── poll phase label from agent logs ───────────────────────────────────
  useEffect(() => {
    if (!scanId || !running) return;

    const pollLogs = async () => {
      try {
        const res  = await fetch(`http://localhost:3001/api/agent/logs/${scanId}`);
        const data = await res.json();
        const logs = data.logs || [];

        // derive phase from latest log types
        const hasNuclei = logs.some(l => l.type === 'nuclei-log');
        const hasAgent  = logs.some(l => l.type === 'log' && l.content?.includes('Groq'));
        const hasRecon  = logs.some(l => l.type === 'log' && l.content?.includes('[subfinder]' || '[nmap]'));

        if (hasNuclei) setPhase('nuclei');
        else if (hasAgent) setPhase('agent');
        else if (hasRecon || logs.length) setPhase('recon');
      } catch {}
    };

    pollLogs();
    const iv = setInterval(pollLogs, 2000);
    return () => clearInterval(iv);
  }, [scanId, running]);

  // ── kick off scan on demand ─────────────────────────────────────────────
  const runScan = async () => {
    setRunning(true);
    setPhase('recon');
    setFindings([]);
    setStats({ total:0, critical:0, high:0, medium:0, low:0 });

    try {
      const res  = await fetch('http://localhost:3001/api/recon/scans');
      const data = await res.json();
      // pick the most recent running scan, or start a new one
      const latest = (data.scans || []).find(s => s.status === 'running');
      if (latest) {
        setScanId(latest.id);
      } else {
        // start a fresh scan with a placeholder target
        // (in a real flow the user picks the target on the Recon page)
        const start = await fetch('http://localhost:3001/api/recon/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: 'scanme.nmap.org' }),
        });
        const startData = await start.json();
        setScanId(startData.scanId);
      }
    } catch (err) {
      console.error('[Scan] failed to start scan:', err);
      setRunning(false);
      setPhase('error');
    }
  };

  const PROFILES = [
    { id:'stealth',    label:'Stealth',    desc:'Slow · low-noise · evasion' },
    { id:'balanced',   label:'Balanced',   desc:'Default speed + coverage' },
    { id:'aggressive', label:'Aggressive', desc:'Fast · full coverage' },
  ];

  const phaseLabel = {
    idle:   null,
    recon:  '① Subfinder + Nmap…',
    agent:  '② Groq AI analysing…',
    nuclei: '③ Nuclei confirming…',
    done:   'Pipeline complete',
    error:  'Pipeline error',
  }[phase];

  const phaseColor = phase === 'error' ? '#ff2d55' : phase === 'done' ? '#30d158' : 'var(--orange)';

  /* ── render ────────────────────────────────────────────────────────────── */
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18, padding:22 }}>

      {/* ── top grid: templates + controls ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:16 }}>

        {/* template toggles */}
        <Card>
          <CH left="NUCLEI TEMPLATES" right={`${total.toLocaleString()} active`} />
          {tpls.map((t, i) => (
            <div
              key={i}
              onClick={() => toggle(i)}
              style={{
                padding:'11px 18px', borderBottom:'1px solid var(--border)',
                display:'flex', alignItems:'center', gap:12, cursor:'pointer',
                transition:'background .12s',
                background: t.enabled ? 'rgba(184,255,87,.03)' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = t.enabled ? 'rgba(184,255,87,.05)' : 'var(--s2)'}
              onMouseLeave={e => e.currentTarget.style.background = t.enabled ? 'rgba(184,255,87,.03)' : 'transparent'}
            >
              <div style={{
                width:28, height:16, borderRadius:8,
                background: t.enabled ? 'rgba(184,255,87,.25)' : 'var(--s3)',
                border:`1px solid ${t.enabled ? 'rgba(184,255,87,.4)' : 'var(--border2)'}`,
                position:'relative', flexShrink:0, transition:'all .2s',
              }}>
                <div style={{
                  position:'absolute', top:2, left: t.enabled ? 12 : 2,
                  width:10, height:10, borderRadius:'50%',
                  background: t.enabled ? 'var(--acc)' : 'var(--t3)',
                  transition:'left .2s',
                }} />
              </div>
              <div style={{ flex:1, fontFamily:'var(--sans)', fontSize:13, color: t.enabled ? 'var(--t1)' : 'var(--t3)' }}>
                {t.name}
              </div>
              <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)' }}>
                {t.count.toLocaleString()}
              </span>
              <Tag label={t.cat} color="var(--t3)" bg="var(--s3)" />
            </div>
          ))}
        </Card>

        {/* controls column */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* scan profile */}
          <Card>
            <CH left="SCAN PROFILE" />
            <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:8 }}>
              {PROFILES.map(p => (
                <div
                  key={p.id}
                  onClick={() => setProfile(p.id)}
                  style={{
                    padding:'10px 14px', borderRadius:6, cursor:'pointer', transition:'all .15s',
                    border:`1px solid ${profile === p.id ? 'rgba(184,255,87,.3)' : 'var(--border)'}`,
                    background: profile === p.id ? 'rgba(184,255,87,.06)' : 'var(--s2)',
                  }}
                >
                  <div style={{ fontFamily:'var(--sans)', fontSize:13, fontWeight:600, color: profile === p.id ? 'var(--acc)' : 'var(--t2)' }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* rate + run button */}
          <Card>
            <CH left="RATE LIMIT" />
            <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:'var(--sans)', fontSize:12, color:'var(--t3)' }}>Requests / second</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:14, color:'var(--acc)' }}>{rate}</span>
              </div>
              <input
                type="range" min={10} max={500} value={rate}
                onChange={e => setRate(+e.target.value)}
                style={{ width:'100%', accentColor:'var(--acc)', cursor:'pointer' }}
              />

              {/* phase indicator */}
              {running && phaseLabel && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{
                    display:'inline-block', width:7, height:7, borderRadius:'50%',
                    background: phaseColor,
                    boxShadow:`0 0 6px ${phaseColor}`,
                    animation:'pulse 1s infinite',
                  }} />
                  <span style={{ fontFamily:'var(--mono)', fontSize:11, color: phaseColor }}>
                    {phaseLabel}
                  </span>
                </div>
              )}

              {phase === 'done' && (
                <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'#30d158' }}>
                  ✓ Pipeline complete — {stats.total} confirmed finding{stats.total !== 1 ? 's' : ''}
                </div>
              )}
              {phase === 'error' && (
                <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'#ff2d55' }}>
                  ✗ Pipeline error — check server logs
                </div>
              )}

              {!running
                ? <Btn accent onClick={runScan} style={{ width:'100%' }}>
                    {phase === 'done' ? 'RE-RUN SCAN' : 'RUN NUCLEI SCAN'}
                  </Btn>
                : <Btn style={{ width:'100%', opacity:.5, cursor:'not-allowed' }} disabled>
                    SCANNING…
                  </Btn>
              }
            </div>
          </Card>

          {/* summary */}
          <Card style={{ padding:'14px 18px' }}>
            <div style={{ fontFamily:'var(--sans)', fontSize:11, letterSpacing:'0.1em', color:'var(--t3)', marginBottom:10 }}>
              SUMMARY
            </div>
            {[
              { k:'Templates', v: total.toLocaleString() },
              { k:'Categories', v: enabled.length },
              { k:'Profile', v: profile },
              { k:'Rate', v: `${rate} r/s` },
            ].map(({ k, v }) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                <span style={{ fontSize:12, color:'var(--t3)' }}>{k}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--t2)' }}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* ── confirmed findings panel ── */}
      <Card>
        <CH
          left="CONFIRMED VULNERABILITIES"
          right={
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {stats.critical > 0 && <StatPill label="CRITICAL" value={stats.critical} color="#ff2d55" />}
              {stats.high     > 0 && <StatPill label="HIGH"     value={stats.high}     color="#ff9500" />}
              {stats.medium   > 0 && <StatPill label="MEDIUM"   value={stats.medium}   color="#ffd60a" />}
              {stats.low      > 0 && <StatPill label="LOW"      value={stats.low}       color="#30d158" />}
              {stats.total   === 0 && (
                <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)' }}>
                  {running ? 'waiting for nuclei…' : 'no findings yet'}
                </span>
              )}
            </div>
          }
        />

        {findings.length === 0 ? (
          <div style={{ padding:'32px 18px', textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:10 }}>🔍</div>
            <div style={{ fontFamily:'var(--sans)', fontSize:13, color:'var(--t3)' }}>
              {running
                ? 'Nuclei is firing templates — confirmed findings will appear here…'
                : 'Run a scan to see confirmed vulnerabilities'}
            </div>
          </div>
        ) : (
          findings.map(f => <FindingRow key={f.id} f={f} />)
        )}
      </Card>

      {/* pulse animation keyframe injected via style tag */}
      <style>{`
        @keyframes pulse {
          0%   { opacity:1; }
          50%  { opacity:0.4; }
          100% { opacity:1; }
        }
      `}</style>
    </div>
  );
}
