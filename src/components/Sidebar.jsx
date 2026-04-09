import React from "react";
import { NAV } from "../data/mockData";

export default function Sidebar({ active, setActive, collapsed, setCollapsed }) {
  return (
    <aside style={{
      width: collapsed ? 56 : 200, transition:"width .25s ease",
      background:"var(--s1)", borderRight:"1px solid var(--border)",
      display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden"
    }}>
      {/* logo */}
      <div style={{ padding:"20px 16px 18px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:26, height:26, background:"var(--acc)", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ fontFamily:"var(--mono)", fontSize:13, color:"#000", fontWeight:700 }}>P</span>
        </div>
        {!collapsed && (
          <span style={{ fontFamily:"var(--sans)", fontSize:15, fontWeight:600, letterSpacing:"0.08em", color:"var(--t1)", whiteSpace:"nowrap" }}>
            PENTELLIGENCE
          </span>
        )}
      </div>

      {/* nav */}
      <nav style={{ flex:1, padding:"12px 8px", display:"flex", flexDirection:"column", gap:2 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setActive(n.id)} style={{
            display:"flex", alignItems:"center", gap:10, padding:"9px 10px",
            borderRadius:6, border:"none", cursor:"pointer", transition:"all .15s",
            background: active===n.id ? "rgba(184,255,87,.1)" : "transparent",
            color: active===n.id ? "var(--acc)" : "var(--t2)",
            outline: active===n.id ? "1px solid rgba(184,255,87,.2)" : "none",
          }}>
            <span style={{ fontSize:14, flexShrink:0, width:18, textAlign:"center" }}>{n.icon}</span>
            {!collapsed && <span style={{ fontFamily:"var(--sans)", fontSize:13, fontWeight:500, letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{n.label}</span>}
          </button>
        ))}
      </nav>

      {/* collapse toggle */}
      <button onClick={() => setCollapsed(c=>!c)} style={{
        margin:"12px 8px", padding:"8px 10px", borderRadius:6, border:"1px solid var(--border)",
        background:"transparent", color:"var(--t3)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8
      }}>
        <span style={{ fontSize:12, transition:"transform .25s", transform: collapsed ? "rotate(180deg)" : "none" }}>◀</span>
        {!collapsed && <span style={{ fontFamily:"var(--sans)", fontSize:12, color:"var(--t3)", letterSpacing:"0.05em" }}>COLLAPSE</span>}
      </button>
    </aside>
  );
}
