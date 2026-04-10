import React from 'react';
import { Btn } from '../common/Btn';
import { PAGE_LABELS } from '../../data/constants';

export const Header = ({ active, target, setTarget, startScan, scanning }) => {
  return (
    <header style={{padding:"12px 22px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12,background:"var(--s1)",flexShrink:0}}>
      <div style={{fontFamily:"var(--sans)",fontSize:11,letterSpacing:"0.12em",color:"var(--t3)",marginRight:"auto"}}>
        {PAGE_LABELS[active]}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:0,border:"1px solid var(--border2)",borderRadius:6,overflow:"hidden",background:"var(--s2)",width:300}}>
        <span style={{padding:"0 10px",fontFamily:"var(--mono)",fontSize:11,color:"var(--t3)",flexShrink:0}}>target://</span>
        <input value={target} onChange={e=>setTarget(e.target.value)} onKeyDown={e=>e.key==="Enter"&&startScan()}
          placeholder="domain.com or 10.0.0.0/24"
          style={{flex:1,background:"transparent",border:"none",outline:"none",color:"var(--t1)",fontFamily:"var(--mono)",fontSize:12,padding:"9px 0"}}/>
      </div>
      <Btn accent onClick={startScan} disabled={scanning} style={{display:"flex",alignItems:"center",gap:7,animation:scanning?"pulse 1.5s infinite":"none"}}>
        {scanning&&<span style={{width:10,height:10,border:"1.5px solid var(--acc)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/>}
        {scanning?"SCANNING":"RUN SCAN"}
      </Btn>
    </header>
  );
};
