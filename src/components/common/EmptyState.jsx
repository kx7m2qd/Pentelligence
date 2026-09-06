import React from 'react';
import { Btn } from './Btn';
import { Card } from './Card';

export function EmptyState({ eyebrow, description, onAction, action = 'GO TO LIVE' }) {
  return (
    <Card className="empty-state-card">
      <div className="eyebrow">{eyebrow}</div>
      <p className="empty-copy">{description}</p>
      <Btn accent onClick={onAction}>{action}</Btn>
    </Card>
  );
}
