import React from 'react';

export const Card = ({children,style={},className=''}) => (
  <div className={`panel ${className}`.trim()} style={style}>{children}</div>
);
