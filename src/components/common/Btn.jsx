import React from 'react';

export const Btn = ({children,onClick,accent=false,sm=false,disabled=false,style={},type='button',...rest}) => (
  <button type={type} onClick={onClick} disabled={disabled} {...rest} style={{
    padding:sm?"7px 12px":"10px 16px",borderRadius:9,
    border:accent?"1px solid rgba(182,247,101,.5)":"1px solid var(--border2)",cursor:disabled?"not-allowed":"pointer",
    background:accent?(disabled?"rgba(182,247,101,.15)":"var(--acc)"):"rgba(255,255,255,.035)",
    color:accent?(disabled?"var(--acc)":"#000"):"var(--t2)",
    fontFamily:"var(--sans)",fontSize:sm?12:13,fontWeight:600,letterSpacing:"0.08em",
    boxShadow:accent&&!disabled?"0 8px 25px rgba(182,247,101,.14)":"none",transition:"all .15s",...style}}>{children}</button>
);
