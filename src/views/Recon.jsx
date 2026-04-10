import React, { useState } from 'react';
import { Card } from '../components/common/Card';
import { CH } from '../components/common/CH';
import { HOSTS, SUBS } from '../data/constants';
import { rc } from '../utils/colors';

export default function Recon(){
  const [sel,setSel]=useState(null);
  const h=sel!=null?HOSTS[sel]:null;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:18,padding:22}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[
          {label:"Subdomains found",val:SUBS.length,color:"var(--acc)"},
          {label:"Live hosts",      val:"8",         color:"var(--t1)"},
          {label:"Open ports",      val:"24",         color:"var(--blue)"},
          {label:"OS fingerprints", val:"2",          color:"var(--t1)"},
        ].map((s,i)=>(
          <Card key={i} style={{padding:"14px 18px"}}>
            <div style={{fontFamily:"var(--sans)",fontSize:10,letterSpacing:"0.12em",color:"var(--t3)",marginBottom:6}}>{s.label.toUpperCase()}</div>
            <div style={{fontFamily:"var(--mono)",fontSize:26,color:s.color,lineHeight:1}}>{s.val}</div>
          </Card>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:16}}>
        <Card>
          <CH left="HOST MAP" right="nmap SYN scan"/>
          {HOSTS.map((h,i)=>(
            <div key={i} onClick={()=>setSel(sel===i?null:i)} style={{
              padding:"11px 18px",borderBottom:"1px solid var(--border)",cursor:"pointer",
              display:"flex",alignItems:"center",gap:12,transition:"background .12s",
              background:sel===i?"var(--s3)":"transparent"}}
              onMouseEnter={e=>{if(sel!==i)e.currentTarget.style.background="var(--s2)"}}
              onMouseLeave={e=>{if(sel!==i)e.currentTarget.style.background="transparent"}}>
              <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:rc(h.risk)}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--t1)"}}>{h.host}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--t3)",marginTop:1}}>{h.ip}</div>
              </div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                {h.ports.map(p=>(
                  <span key={p} style={{fontFamily:"var(--mono)",fontSize:10,padding:"1px 5px",borderRadius:3,
                    background:"var(--s3)",color:"var(--t3)",border:"1px solid var(--border)"}}>{p}</span>
                ))}
              </div>
              <span style={{fontFamily:"var(--sans)",fontSize:10,color:"var(--t3)",minWidth:44,textAlign:"right"}}>{h.os}</span>
            </div>
          ))}
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card>
            <CH left="SUBDOMAINS" right={`${SUBS.length} discovered`}/>
            <div style={{padding:"14px 18px",display:"flex",flexWrap:"wrap",gap:6}}>
              {SUBS.map((s,i)=>(
                <span key={i} style={{fontFamily:"var(--mono)",fontSize:11,padding:"4px 10px",borderRadius:4,
                  background:"var(--s2)",color:"var(--t2)",border:"1px solid var(--border)",cursor:"pointer",transition:"all .12s"}}
                  onMouseEnter={e=>{e.target.style.color="var(--acc)";e.target.style.borderColor="rgba(184,255,87,.3)"}}
                  onMouseLeave={e=>{e.target.style.color="var(--t2)";e.target.style.borderColor="var(--border)"}}>
                  {s}.target.io
                </span>
              ))}
            </div>
          </Card>
          <Card>
            <CH left={h?`HOST — ${h.host}`:"DNS RECORDS"}/>
            <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:9}}>
              {h ? (
                [{k:"IP",v:h.ip},{k:"OS",v:h.os},{k:"Ports",v:h.ports.join(", ")},{k:"Risk",v:h.risk.toUpperCase()}].map(({k,v})=>(
                  <div key={k} style={{display:"flex",gap:12,alignItems:"baseline"}}>
                    <span style={{fontFamily:"var(--sans)",fontSize:11,letterSpacing:"0.08em",color:"var(--t3)",minWidth:48}}>{k}</span>
                    <span style={{fontFamily:"var(--mono)",fontSize:12,color:k==="Risk"?rc(h.risk):"var(--t2)"}}>{v}</span>
                  </div>
                ))
              ) : (
                [{k:"A",v:"10.0.1.4"},{k:"MX",v:"mail.target.io"},{k:"NS",v:"ns1, ns2.target.io"},{k:"TXT",v:"v=spf1 include:google.com ~all"},{k:"CNAME",v:"cdn → cloudfront.net"}].map(({k,v})=>(
                  <div key={k} style={{display:"flex",gap:12,alignItems:"baseline"}}>
                    <span style={{fontFamily:"var(--sans)",fontSize:11,letterSpacing:"0.08em",color:"var(--t3)",minWidth:48}}>{k}</span>
                    <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--t2)"}}>{v}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
