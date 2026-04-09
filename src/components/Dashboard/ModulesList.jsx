import React from 'react';
import { MODULES } from '../../data/mockData';

export default function ModulesList() {
  return (
    <div style={{ background:"var(--s1)", border:"1px solid var(--border)", borderRadius:8, overflow:"hidden" }}>
      <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontFamily:"var(--sans)", fontSize:12, letterSpacing:"0.1em", color:"var(--t2)" }}>MODULES</span>
        <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--acc)" }}>2/5 done</span>
      </div>
      {MODULES.map((m,i) => (
        <div key={i} style={{
          padding:"12px 18px", borderBottom:"1px solid var(--border)",
          display:"flex", alignItems:"center", gap:12,
          background: m.status==="running" ? "rgba(184,255,87,.03)" : "transparent"
        }}>
          {/* status dot */}
          <div style={{
            width:8, height:8, borderRadius:"50%", flexShrink:0,
            background: m.status==="done" ? "var(--acc)" : m.status==="running" ? "var(--orange)" : "var(--t3)",
            animation: m.status==="running" ? "pulse 1s infinite" : "none"
          }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"var(--sans)", fontSize:13, color: m.status==="pending" ? "var(--t3)" : "var(--t1)" }}>{m.label}</div>
          </div>
          <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--t3)", textAlign:"right" }}>
            {m.status==="done" && <span style={{ color:"var(--t2)" }}>{m.time}</span>}
            {m.status==="running" && <span style={{ color:"var(--orange)" }}>running…</span>}
            {m.status==="pending" && <span>queued</span>}
          </div>
          {m.count > 0 && (
            <div style={{
              minWidth:22, height:22, borderRadius:4, background:"rgba(184,255,87,.1)",
              border:"1px solid rgba(184,255,87,.2)", display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"var(--mono)", fontSize:11, color:"var(--acc)"
            }}>{m.count}</div>
          )}
        </div>
      ))}
    </div>
  );
}
