import React from 'react';
import { Card } from '../components/common/Card';
import { CH } from '../components/common/CH';
import { Tag } from '../components/common/Tag';
import { FINDINGS } from '../data/constants';
import { sc, sb } from '../utils/colors';

export default function Dashboard({scanning,visLogs,termRef}){
  const MODS=[
    {label:"Subdomain enum",status:"done",   time:"0:34",n:23},
    {label:"Port scan",     status:"done",   time:"1:12",n:8},
    {label:"Nuclei scan",   status:"running",time:"2:41",n:4},
    {label:"API surface",   status:"pending",time:"—",   n:0},
    {label:"Exploit engine",status:"pending",time:"—",   n:0},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:18,padding:22}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[
          {label:"Hosts alive",    val:"23",  sub:"of 31 scanned",  color:"var(--acc)"},
          {label:"Open ports",     val:"8",   sub:"services mapped", color:"var(--t1)"},
          {label:"Vulnerabilities",val:"36",  sub:"4 critical",      color:"var(--red)"},
          {label:"Scan coverage",  val:"61%", sub:"modules complete",color:"var(--yellow)"},
        ].map((s,i)=>(
          <Card key={i} style={{padding:"16px 18px",animation:`fadeUp .3s ease ${i*.07}s both`}}>
            <div style={{fontFamily:"var(--sans)",fontSize:11,letterSpacing:"0.1em",color:"var(--t3)",marginBottom:8}}>{s.label.toUpperCase()}</div>
            <div style={{fontFamily:"var(--mono)",fontSize:28,color:s.color,lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:12,color:"var(--t3)",marginTop:6}}>{s.sub}</div>
          </Card>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.3fr",gap:16}}>
        <Card>
          <CH left="MODULES" right="2/5 done"/>
          {MODS.map((m,i)=>(
            <div key={i} style={{padding:"11px 18px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12,
              background:m.status==="running"?"rgba(184,255,87,.03)":"transparent"}}>
              <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,
                background:m.status==="done"?"var(--acc)":m.status==="running"?"var(--orange)":"var(--t3)",
                animation:m.status==="running"?"pulse 1s infinite":"none"}}/>
              <div style={{flex:1,fontFamily:"var(--sans)",fontSize:13,color:m.status==="pending"?"var(--t3)":"var(--t1)"}}>{m.label}</div>
              <span style={{fontFamily:"var(--mono)",fontSize:11,color:m.status==="running"?"var(--orange)":"var(--t3)"}}>
                {m.status==="running"?"running…":m.time}
              </span>
              {m.n>0&&<div style={{minWidth:22,height:22,borderRadius:4,background:"rgba(184,255,87,.1)",
                border:"1px solid rgba(184,255,87,.2)",display:"flex",alignItems:"center",justifyContent:"center",
                fontFamily:"var(--mono)",fontSize:11,color:"var(--acc)"}}>{m.n}</div>}
            </div>
          ))}
        </Card>
        <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"11px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"var(--red)"}}/>
            <div style={{width:8,height:8,borderRadius:"50%",background:"var(--yellow)"}}/>
            <div style={{width:8,height:8,borderRadius:"50%",background:"var(--acc)"}}/>
            <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--t3)",marginLeft:6}}>engine.log</span>
            {scanning&&<span style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:10,color:"var(--orange)"}}>● live</span>}
          </div>
          <div ref={termRef} style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:3,minHeight:200}}>
            {visLogs.map((l,i)=>{
              const ai=l.includes("Claude:");
              return(<div key={i} style={{fontFamily:"var(--mono)",fontSize:11,lineHeight:1.7,
                color:ai?"var(--acc)":l.includes("critical")?"var(--orange)":"var(--t2)",
                animation:"termIn .15s ease both",paddingLeft:ai?8:0,borderLeft:ai?"2px solid var(--acc)":"none"}}>{l}</div>);
            })}
            {scanning&&<span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--acc)",animation:"blink 1s infinite"}}>█</span>}
            {!scanning&&visLogs.length===0&&<span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--t3)"}}>// awaiting scan target…</span>}
          </div>
        </div>
      </div>
      <Card>
        <CH left="FINDINGS" right={`${FINDINGS.length} results · sorted by severity`}/>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{borderBottom:"1px solid var(--border)"}}>
                {["SEVERITY","CVE","TITLE","HOST","CVSS"].map(h=>(
                  <th key={h} style={{padding:"9px 18px",textAlign:"left",fontFamily:"var(--sans)",fontSize:11,letterSpacing:"0.1em",color:"var(--t3)",fontWeight:500}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FINDINGS.map((f,i)=>(
                <tr key={i} style={{borderBottom:"1px solid var(--border)",transition:"background .15s",cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--s2)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"12px 18px"}}><Tag label={f.sev} color={sc(f.sev)} bg={sb(f.sev)}/></td>
                  <td style={{padding:"12px 18px",fontFamily:"var(--mono)",fontSize:11,color:"var(--t3)"}}>{f.cve}</td>
                  <td style={{padding:"12px 18px",fontFamily:"var(--sans)",fontSize:13,color:"var(--t1)"}}>{f.title}</td>
                  <td style={{padding:"12px 18px",fontFamily:"var(--mono)",fontSize:11,color:"var(--t2)"}}>{f.host}</td>
                  <td style={{padding:"12px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,height:3,background:"var(--border)",borderRadius:2,maxWidth:60}}>
                        <div style={{height:"100%",borderRadius:2,width:`${f.score/10*100}%`,
                          background:f.score>=9?"var(--red)":f.score>=7?"var(--orange)":f.score>=5?"var(--yellow)":"var(--t3)"}}/>
                      </div>
                      <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--t2)",minWidth:24}}>{f.score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
