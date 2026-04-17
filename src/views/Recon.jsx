import { useState, useEffect, useRef } from "react";

const sc = r => ({ critical:"var(--red)", high:"var(--orange)", medium:"var(--yellow)", low:"var(--t3)" }[r] || "var(--t3)");

const Card = ({ children, style = {} }) => (
  <div style={{ background:"var(--s1)", border:"1px solid var(--border)", borderRadius:8, overflow:"hidden", ...style }}>
    {children}
  </div>
);
const CH = ({ left, right }) => (
  <div style={{ padding:"13px 18px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
    <span style={{ fontFamily:"var(--sans)", fontSize:12, letterSpacing:"0.1em", color:"var(--t2)" }}>{left}</span>
    {right && <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--t3)" }}>{right}</span>}
  </div>
);

/* ── animated scanner banner ── */
const SCAN_PHASES = [
  { key: "init",      label: "Initializing scan…",              icon: "⚡" },
  { key: "subfinder", label: "Running subfinder — enumerating subdomains…", icon: "🔍" },
  { key: "nmap",      label: "Running nmap — scanning ports & services…",   icon: "📡" },
  { key: "done",      label: "Scan complete",                   icon: "✅" },
];

function ScanProgress({ scanStatus, subs, hosts, elapsed }) {
  // Determine which phase we're in based on data
  let phase = 0;
  if (subs.length > 0 && hosts.length === 0) phase = 2;       // subfinder done, nmap running
  else if (subs.length > 0 && hosts.length > 0) phase = 3;     // both done
  else if (scanStatus === "done") phase = 3;
  else if (subs.length === 0 && hosts.length === 0) phase = 1;  // subfinder running
  
  const isDone = phase === 3 || scanStatus === "done";

  return (
    <Card style={{ 
      border: isDone ? "1px solid rgba(184,255,87,.25)" : "1px solid rgba(99,102,241,.4)",
      background: isDone ? "rgba(184,255,87,.04)" : "rgba(99,102,241,.04)",
    }}>
      <div style={{ padding:"16px 20px" }}>
        {/* header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {!isDone && (
              <div style={{
                width: 10, height: 10, borderRadius:"50%",
                background: "rgba(99,102,241,.8)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}/>
            )}
            <span style={{ fontFamily:"var(--sans)", fontSize:11, letterSpacing:"0.1em", color: isDone ? "var(--acc)" : "var(--t2)" }}>
              {isDone ? "SCAN COMPLETE" : "SCAN IN PROGRESS"}
            </span>
          </div>
          <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--t3)" }}>
            {formatTime(elapsed)}
          </span>
        </div>

        {/* phase steps */}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {SCAN_PHASES.map((p, i) => {
            const isActive = i === phase && !isDone;
            const isCompleted = i < phase || isDone;
            const isPending = i > phase && !isDone;

            return (
              <div key={p.key} style={{
                display:"flex", alignItems:"center", gap:10, padding:"6px 10px",
                borderRadius: 6,
                background: isActive ? "rgba(99,102,241,.08)" : "transparent",
                transition: "all .3s ease",
              }}>
                {/* step indicator */}
                <div style={{
                  width: 22, height: 22, borderRadius:"50%", flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize: 11,
                  background: isCompleted ? "rgba(184,255,87,.15)" : isActive ? "rgba(99,102,241,.15)" : "var(--s2)",
                  border: isCompleted ? "1px solid rgba(184,255,87,.3)" : isActive ? "1px solid rgba(99,102,241,.4)" : "1px solid var(--border)",
                  transition: "all .3s ease",
                }}>
                  {isCompleted ? "✓" : isActive ? <span style={{ animation: "spin 1s linear infinite", display:"inline-block" }}>⟳</span> : "·"}
                </div>

                {/* label */}
                <span style={{
                  fontFamily:"var(--mono)", fontSize:11, flex:1,
                  color: isCompleted ? "var(--acc)" : isActive ? "var(--t1)" : "var(--t3)",
                  opacity: isPending ? 0.4 : 1,
                  transition: "all .3s ease",
                }}>
                  {p.label}
                </span>

                {/* live counter */}
                {p.key === "subfinder" && subs.length > 0 && (
                  <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--acc)", padding:"2px 8px", borderRadius:4, background:"rgba(184,255,87,.1)" }}>
                    {subs.length} found
                  </span>
                )}
                {p.key === "nmap" && hosts.length > 0 && (
                  <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--blue,#60a5fa)", padding:"2px 8px", borderRadius:4, background:"rgba(96,165,250,.1)" }}>
                    {hosts.length} hosts
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* progress bar */}
        {!isDone && (
          <div style={{ marginTop: 12, height:3, borderRadius:2, background:"var(--s2)", overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:2,
              background:"linear-gradient(90deg, rgba(99,102,241,.6), rgba(184,255,87,.6))",
              width: `${Math.min((phase / 3) * 100, 95)}%`,
              transition: "width 1s ease",
              animation: "shimmer 2s ease-in-out infinite",
            }}/>
          </div>
        )}
      </div>
    </Card>
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/* ── inject keyframe animations ── */
const styleId = "recon-animations";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes shimmer {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `;
  document.head.appendChild(style);
}

export default function Recon({ scanId }) {
  const [data, setData]     = useState(null);
  const [sel, setSel]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // poll for results every 3s while scan is running
  useEffect(() => {
    if (!scanId) return;
    setLoading(true);
    setElapsed(0);
    setData(null);
    setSel(null);

    // elapsed timer
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    const poll = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/recon/status/${scanId}`);
        const json = await res.json();
        setData(json);
        setPollCount(c => c + 1);

        // stop polling & timer when scan is done
        if (json.scan?.status === "done") {
          setLoading(false);
          clearInterval(timerRef.current);
        }
      } catch (e) {
        setError("Cannot reach server — is it running on :3001?");
        setLoading(false);
        clearInterval(timerRef.current);
      }
    };

    poll();
    const iv = setInterval(poll, 2000); // poll every 2s for snappier updates
    return () => {
      clearInterval(iv);
      clearInterval(timerRef.current);
    };
  }, [scanId]);

  const scanStatus = data?.scan?.status;
  const isScanning = scanId && scanStatus !== "done";
  const hosts = data?.hosts || [];
  const subs  = data?.subdomains || [];
  const stats = data?.stats || { hostsFound: 0, subdomainsFound: 0, openPorts: 0 };
  const h     = sel != null ? hosts[sel] : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18, padding:22 }}>
      {error && (
        <div style={{ padding:"10px 16px", borderRadius:6, background:"rgba(255,77,109,.1)", border:"1px solid rgba(255,77,109,.3)",
          fontFamily:"var(--mono)", fontSize:11, color:"var(--red)" }}>{error}</div>
      )}

      {/* scanning progress banner */}
      {scanId && (
        <ScanProgress scanStatus={scanStatus} subs={subs} hosts={hosts} elapsed={elapsed} />
      )}

      {/* no scan state */}
      {!scanId && (
        <Card style={{ padding:"30px 20px", textAlign:"center" }}>
          <div style={{ fontFamily:"var(--sans)", fontSize:13, color:"var(--t2)", marginBottom:6 }}>
            NO ACTIVE SCAN
          </div>
          <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--t3)" }}>
            Enter a target domain above and hit RUN SCAN to begin reconnaissance
          </div>
        </Card>
      )}

      {/* stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { label:"Subdomains",  val: subs.length,            color:"var(--acc)" },
          { label:"Live hosts",  val: stats.hostsFound,       color:"var(--t1)" },
          { label:"Open ports",  val: stats.openPorts,        color:"var(--blue)" },
          { label:"OS types",    val: [...new Set(hosts.map(h => h.os?.split(" ")[0]))].filter(Boolean).length, color:"var(--t1)" },
        ].map((s, i) => (
          <Card key={i} style={{ padding:"14px 18px" }}>
            <div style={{ fontFamily:"var(--sans)", fontSize:10, letterSpacing:"0.12em", color:"var(--t3)", marginBottom:6 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontFamily:"var(--mono)", fontSize:26, color:s.color, lineHeight:1 }}>
              {isScanning && !data ? "…" : s.val}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.1fr 1fr", gap:16 }}>
        {/* host list */}
        <Card>
          <CH left="HOST MAP" right={isScanning ? "scanning…" : hosts.length > 0 ? "nmap TCP scan" : null}/>
          {hosts.length === 0 && (
            <div style={{ padding:"20px 18px", fontFamily:"var(--mono)", fontSize:11, color:"var(--t3)" }}>
              {isScanning ? "waiting for nmap results…" : scanId ? "no hosts found" : "—"}
            </div>
          )}
          {hosts.map((h, i) => (
            <div key={i} onClick={() => setSel(sel === i ? null : i)} style={{
              padding:"11px 18px", borderBottom:"1px solid var(--border)", cursor:"pointer",
              display:"flex", alignItems:"center", gap:12, transition:"background .12s",
              background: sel === i ? "var(--s3)" : "transparent" }}
              onMouseEnter={e => { if (sel !== i) e.currentTarget.style.background = "var(--s2)"; }}
              onMouseLeave={e => { if (sel !== i) e.currentTarget.style.background = "transparent"; }}>
              <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0, background: sc(h.risk) }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"var(--mono)", fontSize:12, color:"var(--t1)" }}>{h.hostname || h.ip}</div>
                <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--t3)", marginTop:1 }}>{h.ip}</div>
              </div>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap", justifyContent:"flex-end" }}>
                {(h.ports || []).slice(0, 4).map(p => (
                  <span key={p.port || p} style={{ fontFamily:"var(--mono)", fontSize:10, padding:"1px 5px", borderRadius:3,
                    background:"var(--s3)", color:"var(--t3)", border:"1px solid var(--border)" }}>
                    {p.port || p}
                  </span>
                ))}
                {h.ports?.length > 4 && <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--t3)" }}>+{h.ports.length - 4}</span>}
              </div>
              <span style={{ fontFamily:"var(--sans)", fontSize:10, color:"var(--t3)", minWidth:44, textAlign:"right" }}>
                {h.os?.split(" ")[0] || "?"}
              </span>
            </div>
          ))}
        </Card>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* subdomains */}
          <Card>
            <CH left="SUBDOMAINS" right={subs.length > 0 ? `${subs.length} discovered` : null}/>
            <div style={{ padding:"14px 18px", display:"flex", flexWrap:"wrap", gap:6, maxHeight: 220, overflowY:"auto" }}>
              {subs.length === 0 && (
                <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--t3)" }}>
                  {isScanning ? "running subfinder…" : "—"}
                </span>
              )}
              {subs.map((s, i) => (
                <span key={i} style={{ fontFamily:"var(--mono)", fontSize:11, padding:"4px 10px", borderRadius:4,
                  background:"var(--s2)", color:"var(--t2)", border:"1px solid var(--border)", cursor:"pointer", transition:"all .12s" }}
                  onMouseEnter={e => { e.target.style.color = "var(--acc)"; e.target.style.borderColor = "rgba(184,255,87,.3)"; }}
                  onMouseLeave={e => { e.target.style.color = "var(--t2)"; e.target.style.borderColor = "var(--border)"; }}>
                  {s}
                </span>
              ))}
            </div>
          </Card>

          {/* host detail or port table */}
          <Card>
            <CH left={h ? `HOST — ${h.hostname || h.ip}` : "SELECT A HOST"}/>
            <div style={{ padding:"14px 18px", display:"flex", flexDirection:"column", gap:9 }}>
              {!h ? (
                <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--t3)" }}>click a host to inspect</span>
              ) : (
                <>
                  {[
                    { k:"IP",       v: h.ip },
                    { k:"Hostname", v: h.hostname },
                    { k:"OS",       v: h.os || "unknown" },
                    { k:"Risk",     v: (h.risk || "unknown").toUpperCase() },
                    { k:"Status",   v: h.status || "up" },
                  ].map(({ k, v }) => (
                    <div key={k} style={{ display:"flex", gap:12, alignItems:"baseline" }}>
                      <span style={{ fontFamily:"var(--sans)", fontSize:11, letterSpacing:"0.08em", color:"var(--t3)", minWidth:60 }}>{k}</span>
                      <span style={{ fontFamily:"var(--mono)", fontSize:12, color: k === "Risk" ? sc(h.risk) : "var(--t2)" }}>{v}</span>
                    </div>
                  ))}
                  {h.ports?.length > 0 && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ fontFamily:"var(--sans)", fontSize:10, letterSpacing:"0.1em", color:"var(--t3)", marginBottom:6 }}>OPEN PORTS</div>
                      {h.ports.map((p, i) => (
                        <div key={i} style={{ display:"flex", gap:12, marginBottom:4 }}>
                          <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--acc)", minWidth:40 }}>{p.port}</span>
                          <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--t3)", minWidth:40 }}>{p.protocol}</span>
                          <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--t2)" }}>{p.service} {p.version}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
