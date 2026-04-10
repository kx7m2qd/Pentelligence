import React from 'react';

export const Card = ({children,style={}}) => (
  <div style={{background:"var(--s1)",border:"1px solid var(--border)",borderRadius:8,overflow:"hidden",...style}}>{children}</div>
);
