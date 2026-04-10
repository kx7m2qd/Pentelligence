import React from 'react';

export const CH = ({left,right}) => (
  <div style={{padding:"13px 18px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
    <span style={{fontFamily:"var(--sans)",fontSize:12,letterSpacing:"0.1em",color:"var(--t2)"}}>{left}</span>
    {right&&<span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--t3)"}}>{right}</span>}
  </div>
);
