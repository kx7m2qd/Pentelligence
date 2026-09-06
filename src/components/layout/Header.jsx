import React from 'react';
import { Btn } from '../common/Btn';
import { PAGE_LABELS } from '../../data/constants';

function formatElapsed(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

export const Header = ({
  active,
  target,
  scanning,
  cancelling,
  startFresh,
  cancelScan,
  hasSelection,
  programName,
  phase,
  scanStatus,
  elapsed,
  onToggleNav,
  mobileNavOpen,
  onOpenPalette,
}) => {
  const statusLabel = scanning ? 'LIVE' : (scanStatus || 'idle').toUpperCase();
  // LIVE always shows elapsed; a finished (done) scan only shows a time when
  // one was actually recorded — avoid the misleading 'DONE · 0s' suffix.
  const showElapsed = elapsed != null && (scanStatus !== 'done' || elapsed > 0);

  return (
    <header className="app-header">
      <div className="header-leading">
        <button type="button" className="mobile-nav-toggle" aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNavOpen} onClick={onToggleNav}>☰</button>
        <div className="header-page">{PAGE_LABELS[active]}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {hasSelection ? (
          <div className="header-investigation">
            <span className="inv-chip" title="Target">{target || 'unknown target'}</span>
            <span className="inv-chip muted-chip" title="Program">{programName || 'No program'}</span>
            <span className="inv-chip muted-chip" title="Phase">
              {(phase || 'queued').toUpperCase()}
              {showElapsed ? ` · ${formatElapsed(elapsed)}` : ''}
            </span>
            <span className={`inv-status ${scanning ? 'live' : ''}`}>{statusLabel}</span>
            <Btn onClick={scanning ? cancelScan : startFresh} disabled={cancelling}>{scanning ? (cancelling ? 'CANCELLING...' : 'CANCEL') : 'NEW'}</Btn>
          </div>
        ) : (
          <div className="header-idle">Start an investigation from Live</div>
        )}
        <button
          type="button"
          onClick={onOpenPalette}
          className="cmd-palette-btn"
          style={{
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '5px 10px',
            color: 'var(--t2)',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          title="Open Command Palette (Cmd+K)"
        >
          <span>⌘K</span>
          <span style={{ fontSize: 10, color: 'var(--t3)' }}>Commands</span>
        </button>
      </div>
    </header>
  );
};
