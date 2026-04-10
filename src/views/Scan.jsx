import React, { useState } from 'react';
import { Card } from '../components/common/Card';
import { CH } from '../components/common/CH';
import { Tag } from '../components/common/Tag';
import { Btn } from '../components/common/Btn';
import { TEMPLATES } from '../data/constants';

export default function Scan(){
  const [tpls,setTpls]=useState(TEMPLATES);
  const [profile,setProfile]=useState("aggressive");
  const [running,setRunning]=useState(false);
  const [prog,setProg]=useState(0);
  const [rate,setRate]=useState(150);
  const toggle=i=>setTpls(t=>t.map((x,j)=>j===i?{...x,enabled:!x.enabled}:x));
  const enabled=tpls.filter(t=>t.enabled);
  const total=enabled.reduce((a,t)=>a+t.count,0);
  const runScan=()=>{
    setRunning(true);setProg(0);
    const iv=setInterval(()=>setProg(p=>{
      if(p>=100){clearInterval(iv);setRunning(false);return 100;}
      return p+(2+Math.random()*3);
    }),180);
  };
  const PROFILES=[
    {id:"stealth",   label:"Stealth",   desc:"Slow · low-noise · evasion"},
    {id:"balanced",  label:"Balanced",  desc:"Default speed + coverage"},
    {id:"aggressive",label:"Aggressive",desc:"Fast · full coverage"},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:18,padding:22}}>
      <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:16}}>
        <Card>
          <CH left="NUCLEI TEMPLATES" right={`${total.toLocaleString()} active`}/>
          {tpls.map((t,i)=>(
            <div key={i} onClick={()=>toggle(i)} style={{
              padding:"11px 18px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12,cursor:"pointer",
              transition:"background .12s",background:t.enabled?"rgba(184,255,87,.03)":"transparent"}}
              onMouseEnter={e=>e.currentTarget.style.background=t.enabled?"rgba(184,255,87,.05)":"var(--s2)"}
              onMouseLeave={e=>e.currentTarget.style.background=t.enabled?"rgba(184,255,87,.03)":"transparent"}>
              <div style={{width:28,height:16,borderRadius:8,background:t.enabled?"rgba(184,255,87,.25)":"var(--s3)",
                border:`1px solid ${t.enabled?"rgba(184,255,87,.4)":"var(--border2)"}`,position:"relative",flexShrink:0,transition:"all .2s"}}>
                <div style={{position:"absolute",top:2,left:t.enabled?12:2,width:10,height:10,borderRadius:"50%",
                  background:t.enabled?"var(--acc)":"var(--t3)",transition:"left .2s"}}/>
              </div>
              <div style={{flex:1,fontFamily:"var(--sans)",fontSize:13,color:t.enabled?"var(--t1)":"var(--t3)"}}>{t.name}</div>
              <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--t3)"}}>{t.count.toLocaleString()}</span>
              <Tag label={t.cat} color="var(--t3)" bg="var(--s3)"/>
            </div>
          ))}
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card>
            <CH left="SCAN PROFILE"/>
            <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:8}}>
              {PROFILES.map(p=>(
                <div key={p.id} onClick={()=>setProfile(p.id)} style={{
                  padding:"10px 14px",borderRadius:6,cursor:"pointer",transition:"all .15s",
                  border:`1px solid ${profile===p.id?"rgba(184,255,87,.3)":"var(--border)"}`,
                  background:profile===p.id?"rgba(184,255,87,.06)":"var(--s2)"}}>
                  <div style={{fontFamily:"var(--sans)",fontSize:13,fontWeight:600,color:profile===p.id?"var(--acc)":"var(--t2)"}}>{p.label}</div>
                  <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{p.desc}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CH left="RATE LIMIT"/>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontFamily:"var(--sans)",fontSize:12,color:"var(--t3)"}}>Requests / second</span>
                <span style={{fontFamily:"var(--mono)",fontSize:14,color:"var(--acc)"}}>{rate}</span>
              </div>
              <input type="range" min={10} max={500} value={rate} onChange={e=>setRate(+e.target.value)}
                style={{width:"100%",accentColor:"var(--acc)",cursor:"pointer"}}/>
              {running?(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{height:3,background:"var(--border)",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",background:"var(--acc)",borderRadius:2,width:`${prog}%`,transition:"width .2s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--orange)"}}>scanning…</span>
                    <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--t3)"}}>{Math.round(prog)}%</span>
                  </div>
                </div>
              ):<Btn accent onClick={runScan} style={{width:"100%"}}>{prog===100?"RE-RUN SCAN":"RUN NUCLEI SCAN"}</Btn>}
            </div>
          </Card>
          <Card style={{padding:"14px 18px"}}>
            <div style={{fontFamily:"var(--sans)",fontSize:11,letterSpacing:"0.1em",color:"var(--t3)",marginBottom:10}}>SUMMARY</div>
            {[{k:"Templates",v:total.toLocaleString()},{k:"Categories",v:enabled.length},{k:"Profile",v:profile},{k:"Rate",v:`${rate} r/s`}].map(({k,v})=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                <span style={{fontSize:12,color:"var(--t3)"}}>{k}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--t2)"}}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
