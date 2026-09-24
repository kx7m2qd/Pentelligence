import React, { useEffect, useRef } from 'react';

export default function EvidenceDialog({ item, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  return (
    <dialog ref={ref} className="evidence-dialog" aria-label={`Screenshot: ${item.hostname}`}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="evidence-dialog-content">
        <header>
          <div><strong>{item.hostname}</strong><p>{item.target}</p></div>
          <button type="button" autoFocus onClick={onClose} aria-label="Close screenshot">✕</button>
        </header>
        <img src={item.url} alt={`Captured page for ${item.hostname}`} />
      </div>
    </dialog>
  );
}
