import React from 'react';
import { FINDINGS } from '../../data/mockData';
import { sevColor, sevBg } from '../../utils/colors';

export default function FindingsTable() {
  return (
    <div style={{ background:"var(--s1)", border:"1px solid var(--border)", borderRadius:8, overflow:"hidden" }}>
      <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontFamily:"var(--sans)", fontSize:12, letterSpacing:"0.1em", color:"var(--t2)" }}>FINDINGS</span>
        <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--t3)" }}>{FINDINGS.length} results · sorted by severity</span>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid var(--border)" }}>
              {["SEVERITY","CVE","TITLE","HOST","CVSS"].map(h => (
                <th key={h} style={{
                  padding:"10px 18px", textAlign:"left",
                  fontFamily:"var(--sans)", fontSize:11, letterSpacing:"0.1em",
                  color:"var(--t3)", fontWeight:500
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FINDINGS.map((f,i) => (
              <tr key={i} style={{
                borderBottom:"1px solid var(--border)",
                transition:"background .15s", cursor:"pointer"
              }}
                onMouseEnter={e=>e.currentTarget.style.background="var(--s2)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <td style={{ padding:"13px 18px" }}>
                  <span style={{
                    fontFamily:"var(--sans)", fontSize:11, fontWeight:600, letterSpacing:"0.08em",
                    padding:"3px 8px", borderRadius:3,
                    color:sevColor(f.sev), background:sevBg(f.sev),
                    border:`1px solid ${sevColor(f.sev)}33`
                  }}>{f.sev}</span>
                </td>
                <td style={{ padding:"13px 18px", fontFamily:"var(--mono)", fontSize:11, color:"var(--t3)" }}>{f.cve}</td>
                <td style={{ padding:"13px 18px", fontFamily:"var(--sans)", fontSize:13, color:"var(--t1)" }}>{f.title}</td>
                <td style={{ padding:"13px 18px", fontFamily:"var(--mono)", fontSize:11, color:"var(--t2)" }}>{f.host}</td>
                <td style={{ padding:"13px 18px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ flex:1, height:3, background:"var(--border)", borderRadius:2, maxWidth:60 }}>
                      <div style={{ height:"100%", borderRadius:2, width:`${(f.score/10)*100}%`,
                        background: f.score>=9 ? "var(--red)" : f.score>=7 ? "var(--orange)" : f.score>=5 ? "var(--yellow)" : "var(--t3)"
                      }}/>
                    </div>
                    <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--t2)", minWidth:24 }}>{f.score}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
