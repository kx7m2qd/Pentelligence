import React from "react";

export default function Header({ target, setTarget, startScan, scanning }) {
  return (
    <header style={{
      padding:"14px 24px", borderBottom:"1px solid var(--border)",
      display:"flex", alignItems:"center", gap:12, background:"var(--s1)"
    }}>
      <div style={{ fontFamily:"var(--sans)", fontSize:11, letterSpacing:"0.12em", color:"var(--t3)", marginRight:"auto" }}>
        DASHBOARD / OVERVIEW
      </div>

      {/* target input */}
      <div style={{
        display:"flex", alignItems:"center", gap:0,
        border:"1px solid var(--border2)", borderRadius:6, overflow:"hidden",
        background:"var(--s2)", width:340
      }}>
        <span style={{ padding:"0 12px", fontFamily:"var(--mono)", fontSize:11, color:"var(--t3)" }}>target://</span>
        <input
          value={target}
          onChange={e => setTarget(e.target.value)}
          onKeyDown={e => e.key==="Enter" && startScan()}
          placeholder="domain.com or 10.0.0.1/24"
          style={{
            flex:1, background:"transparent", border:"none", outline:"none",
            color:"var(--t1)", fontFamily:"var(--mono)", fontSize:12, padding:"9px 0"
          }}
        />
      </div>

      <button onClick={startScan} disabled={scanning} style={{
        padding:"9px 18px", borderRadius:6, border:"none", cursor: scanning ? "not-allowed" : "pointer",
        background: scanning ? "rgba(184,255,87,.15)" : "var(--acc)", color: scanning ? "var(--acc)" : "#000",
        fontFamily:"var(--sans)", fontSize:13, fontWeight:600, letterSpacing:"0.08em",
        display:"flex", alignItems:"center", gap:8, transition:"all .2s",
        animation: scanning ? "pulse 1.5s infinite" : "none"
      }}>
        {scanning && <span style={{ width:10, height:10, border:"1.5px solid var(--acc)", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block" }}/>}
        {scanning ? "SCANNING" : "RUN SCAN"}
      </button>
    </header>
  );
}
