import React from 'react';

export const Btn = ({children,onClick,accent=false,sm=false,disabled=false,style={}}) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding:sm?"6px 14px":"9px 18px",borderRadius:6,
    border:accent?"none":"1px solid var(--border2)",cursor:disabled?"not-allowed":"pointer",
    background:accent?(disabled?"rgba(184,255,87,.15)":"var(--acc)"):"var(--s2)",
    color:accent?(disabled?"var(--acc)":"#000"):"var(--t2)",
    fontFamily:"var(--sans)",fontSize:sm?12:13,fontWeight:600,letterSpacing:"0.08em",
    transition:"all .15s",...style}}>{children}</button>
);
