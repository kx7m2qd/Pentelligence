import React from 'react';

export default function TerminalView({ termRef, visLogs, scanning }) {
  return (
    <div style={{ background:"var(--bg)", border:"1px solid var(--border)", borderRadius:8, overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--red)" }}/>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--yellow)" }}/>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--acc)" }}/>
        <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--t3)", marginLeft:6 }}>engine.log</span>
        {scanning && <span style={{ marginLeft:"auto", fontFamily:"var(--mono)", fontSize:10, color:"var(--orange)" }}>● live</span>}
      </div>
      <div ref={termRef} style={{ flex:1, overflowY:"auto", padding:"14px 16px", display:"flex", flexDirection:"column", gap:4, minHeight:180 }}>
        {visLogs.map((l,i) => {
          const isAI = l.includes("Claude:");
          return (
            <div key={i} style={{
              fontFamily:"var(--mono)", fontSize:11, lineHeight:1.7,
              color: isAI ? "var(--acc)" : l.includes("critical") || l.includes("Critical") ? "var(--orange)" : "var(--t2)",
              animation:"termIn .15s ease both",
              paddingLeft: isAI ? 8 : 0,
              borderLeft: isAI ? "2px solid var(--acc)" : "none",
            }}>{l}</div>
          );
        })}
        {scanning && (
          <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--acc)", animation:"blink 1s infinite" }}>█</span>
        )}
        {!scanning && visLogs.length === 0 && (
          <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--t3)" }}>// awaiting scan target…</span>
        )}
      </div>
    </div>
  );
}
