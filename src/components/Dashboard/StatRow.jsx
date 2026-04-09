import React from 'react';

export default function StatRow() {
  const stats = [
    { label:"Hosts alive",   val:"23",  sub:"of 31 scanned",    color:"var(--acc)" },
    { label:"Open ports",    val:"8",   sub:"services mapped",  color:"var(--t1)" },
    { label:"Vulnerabilities",val:"36", sub:"4 critical",       color:"var(--red)" },
    { label:"Scan coverage", val:"61%", sub:"modules complete", color:"var(--yellow)" },
  ];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
      {stats.map((s,i) => (
        <div key={i} style={{
          background:"var(--s1)", border:"1px solid var(--border)", borderRadius:8,
          padding:"16px 18px", animation:`fadeUp .3s ease ${i*0.07}s both`
        }}>
          <div style={{ fontFamily:"var(--sans)", fontSize:11, letterSpacing:"0.1em", color:"var(--t3)", marginBottom:8 }}>{s.label.toUpperCase()}</div>
          <div style={{ fontFamily:"var(--mono)", fontSize:28, color:s.color, lineHeight:1 }}>{s.val}</div>
          <div style={{ fontFamily:"var(--body)", fontSize:12, color:"var(--t3)", marginTop:6 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
