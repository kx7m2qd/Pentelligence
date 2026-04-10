import React from 'react';

export const Tag = ({label,color="var(--t2)",bg="rgba(122,122,138,.08)"}) => (
  <span style={{fontFamily:"var(--sans)",fontSize:10,fontWeight:600,letterSpacing:"0.08em",
    padding:"2px 7px",borderRadius:3,color,background:bg,border:`1px solid ${color}33`}}>{label}</span>
);
