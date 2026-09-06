import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onStartFresh,
  onExportBackup,
  currentScanId,
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const previouslyOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !previouslyOpen.current) {
      setTimeout(() => {
        setQuery('');
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 50);
    }
    previouslyOpen.current = isOpen;
  }, [isOpen]);

  const actions = useMemo(() => [
    {
      id: 'nav-dashboard',
      section: 'Navigation',
      title: 'Dashboard · Live Recon & Console',
      shortcut: 'G D',
      perform: () => onNavigate('dashboard'),
    },
    {
      id: 'nav-recon',
      section: 'Navigation',
      title: 'Recon · Attack Surface Map & Evidence',
      shortcut: 'G R',
      perform: () => onNavigate('recon'),
    },
    {
      id: 'nav-findings',
      section: 'Navigation',
      title: 'Findings · Triage & Remediation Inbox',
      shortcut: 'G F',
      perform: () => onNavigate('findings'),
    },
    {
      id: 'nav-exploit',
      section: 'Navigation',
      title: 'Active Exploits · Gated Verification Engine',
      shortcut: 'G E',
      perform: () => onNavigate('exploit'),
    },
    {
      id: 'nav-report',
      section: 'Navigation',
      title: 'Report · Executive Summary & HTML/PDF Export',
      shortcut: 'G P',
      perform: () => onNavigate('report'),
    },
    {
      id: 'nav-programs',
      section: 'Navigation',
      title: 'Programs · Bug Bounty Scope & Live Validator',
      shortcut: 'G S',
      perform: () => onNavigate('programs'),
    },
    {
      id: 'nav-history',
      section: 'Navigation',
      title: 'History · Investigation Archive & Comparison',
      shortcut: 'G H',
      perform: () => onNavigate('history'),
    },
    {
      id: 'act-new-scan',
      section: 'Actions',
      title: 'Start New Investigation',
      shortcut: 'N',
      perform: () => {
        onStartFresh();
        onNavigate('dashboard');
      },
    },
    {
      id: 'act-export-backup',
      section: 'Actions',
      title: currentScanId
        ? `Export Full Database Backup (JSON) — investigation #${currentScanId}`
        : 'Export Full Database Backup (JSON)',
      shortcut: 'B',
      perform: () => onExportBackup?.(),
    },
  ], [onNavigate, onStartFresh, onExportBackup, currentScanId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.section.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => {
    const id = setTimeout(() => setSelectedIndex(0), 0);
    return () => clearTimeout(id);
  }, [filtered.length]);

  const handleKeyDown = event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex(idx => (idx + 1) % Math.max(1, filtered.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex(idx => (idx - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].perform();
        onClose();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(8, 11, 13, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(620px, 94vw)',
          background: '#111719',
          border: '1px solid rgba(217, 241, 230, 0.17)',
          borderRadius: 14,
          boxShadow: '0 25px 70px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeUp 0.15s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(217, 241, 230, 0.09)', background: '#171f21' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--acc)', marginRight: 12 }}>❯</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or jump to view… (Esc to close)"
            style={{
              flex: 1,
              background: 'none',
              border: 0,
              outline: 'none',
              color: 'var(--t1)',
              fontFamily: 'var(--mono)',
              fontSize: 13,
            }}
          />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: 4 }}>
            ESC
          </span>
        </div>

        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '8px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px 18px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t3)' }}>
              No commands matching "{query}"
            </div>
          ) : (
            filtered.map((action, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={action.id}
                  onClick={() => {
                    action.perform();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    padding: '10px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isSelected ? 'rgba(182, 247, 101, 0.08)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--acc)' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--acc)' : 'var(--t1)' }}>
                      {action.title}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>
                      {action.section}
                    </div>
                  </div>

                  {action.shortcut && (
                    <span style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'var(--s3)',
                      color: 'var(--t3)',
                      border: '1px solid var(--border)',
                    }}>
                      {action.shortcut}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid rgba(217, 241, 230, 0.09)',
          background: '#0b1012',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--t3)',
        }}>
          <div>
            Use <strong style={{ color: 'var(--t2)' }}>↑</strong> <strong style={{ color: 'var(--t2)' }}>↓</strong> to navigate, <strong style={{ color: 'var(--t2)' }}>↵</strong> to select
          </div>
          <div>Pentelligence Command Palette</div>
        </div>
      </div>
    </div>
  );
}
