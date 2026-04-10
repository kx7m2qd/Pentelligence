import React, { useState } from 'react';
import { Card } from '../components/common/Card';
import { CH } from '../components/common/CH';
import { Tag } from '../components/common/Tag';
import { Btn } from '../components/common/Btn';
import { sc, sb } from '../utils/colors';

export default function Report(){
  const [gs,setGs]=useState("idle");
  const [incl,setIncl]=useState({exec:true,scope:true,findings:true,exploits:true,remediation:true,appendix:false});
  const [fmt,setFmt]=useState("pdf");
  const gen=()=>{setGs("generating");setTimeout(()=>setGs("done"),2200);};
  const SEV=[{sev:"CRITICAL",n:1,w:1},{sev:"HIGH",n:2,w:2},{sev:"MEDIUM",n:1,w:3},{sev:"LOW",n:1,w:4}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:18,padding:22}}>
      <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:16}}>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card>
            <CH left="REPORT SECTIONS"/>
            <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:6}}>
              {Object.entries(incl).map(([k,v])=>(
                <div key={k} onClick={()=>setIncl(p=>({...p,[k]:!p[k]}))} style={{
                  display:"flex",alignItems:"center",gap:12,padding:"9px 12px",borderRadius:6,cursor:"pointer",transition:"all .15s",
                  border:`1px solid ${v?"rgba(184,255,87,.25)":"var(--border)"}`,
                  background:v?"rgba(184,255,87,.05)":"var(--s2)"}}>
                  <div style={{width:14,height:14,borderRadius:3,border:`1.5px solid ${v?"var(--acc)":"var(--t3)"}`,
                    background:v?"var(--acc)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {v&&<span style={{fontSize:9,color:"#000",fontWeight:700}}>✓</span>}
                  </div>
                  <span style={{fontFamily:"var(--sans)",fontSize:13,color:v?"var(--t1)":"var(--t3)"}}>
                    {k==="exec"?"Executive summary":k==="appendix"?"Appendix — raw data":k.charAt(0).toUpperCase()+k.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CH left="EXPORT FORMAT"/>
            <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",gap:8}}>
                {["pdf","html","json"].map(f=>(
                  <div key={f} onClick={()=>setFmt(f)} style={{
                    flex:1,padding:"9px",borderRadius:6,textAlign:"center",cursor:"pointer",transition:"all .15s",
                    border:`1px solid ${fmt===f?"rgba(184,255,87,.3)":"var(--border)"}`,
                    background:fmt===f?"rgba(184,255,87,.08)":"var(--s2)"}}>
                    <div style={{fontFamily:"var(--mono)",fontSize:14,color:fmt===f?"var(--acc)":"var(--t3)",marginBottom:2}}>{f.toUpperCase()}</div>
                    <div style={{fontSize:10,color:"var(--t3)"}}>{f==="pdf"?"Formatted":f==="html"?"Web view":"Raw data"}</div>
                  </div>
                ))}
              </div>
              {gs==="idle"&&<Btn accent onClick={gen} style={{width:"100%"}}>GENERATE REPORT</Btn>}
              {gs==="generating"&&(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{width:12,height:12,border:"2px solid var(--acc)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/>
                    <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--acc)"}}>Claude writing report…</span>
                  </div>
                  {["Analysing findings…","Drafting executive summary…","Scoring CVSS vectors…","Compiling remediation steps…"].map((l,i)=>(
                    <div key={i} style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--t3)",paddingLeft:20,animation:`fadeUp .2s ease ${i*.3}s both`}}>› {l}</div>
                  ))}
                </div>
              )}
              {gs==="done"&&(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{padding:"10px 14px",borderRadius:6,background:"rgba(184,255,87,.08)",border:"1px solid rgba(184,255,87,.2)",
                    fontFamily:"var(--mono)",fontSize:12,color:"var(--acc)"}}>✓ report_20240410.{fmt} ready</div>
                  <div style={{display:"flex",gap:8}}>
                    <Btn accent style={{flex:1}}>DOWNLOAD</Btn>
                    <Btn onClick={()=>setGs("idle")} style={{flex:1}}>REGENERATE</Btn>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card>
            <CH left="SEVERITY BREAKDOWN"/>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:10}}>
              {SEV.map(({sev,n,w})=>(
                <div key={sev} style={{display:"flex",alignItems:"center",gap:12}}>
                  <Tag label={sev} color={sc(sev)} bg={sb(sev)}/>
                  <div style={{flex:1,height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:3,background:sc(sev),width:`${(5-w)/4*100}%`,transition:"width 1s ease"}}/>
                  </div>
                  <span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--t2)",minWidth:16}}>{n}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card style={{flex:1}}>
            <CH left="PREVIEW"/>
            <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <div style={{fontFamily:"var(--sans)",fontSize:18,fontWeight:600,color:"var(--t1)",letterSpacing:"0.04em"}}>Penetration Test Report</div>
                <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--t3)",marginTop:3}}>target.io · {new Date().toISOString().split("T")[0]}</div>
              </div>
              <div style={{height:1,background:"var(--border)"}}/>
              {["Executive summary","Scope & methodology","Findings — 5 vulnerabilities","Exploitation results","Remediation roadmap"].map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:20,height:20,borderRadius:3,background:"var(--s3)",border:"1px solid var(--border)",
                    display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--mono)",fontSize:9,color:"var(--t3)",flexShrink:0}}>{i+1}</div>
                  <span style={{fontFamily:"var(--sans)",fontSize:13,color:"var(--t2)"}}>{s}</span>
                </div>
              ))}
              <div style={{height:1,background:"var(--border)"}}/>
              <div style={{fontSize:11,color:"var(--t3)",fontFamily:"var(--body)",lineHeight:1.6}}>
                Assessment identified <span style={{color:"var(--red)"}}>1 critical</span>, <span style={{color:"var(--orange)"}}>2 high</span>, <span style={{color:"var(--yellow)"}}>1 medium</span>, <span style={{color:"var(--t2)"}}>1 low</span>. Immediate remediation recommended for CVE-2021-41773.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
