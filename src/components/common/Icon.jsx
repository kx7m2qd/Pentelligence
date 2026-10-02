import React from 'react';

/**
 * Dependency-free icon set in the lucide style (24x24 viewBox, 2px round
 * strokes, currentColor). Keys match the `icon` names used in data/constants
 * NAV. Swap PATHS[name] for `lucide-react` imports later if desired.
 */
const PATHS = {
  // nav — investigation
  activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  radar: <><path d="M19.07 4.93A10 10 0 1 0 22 12" /><path d="M12 12 19 5" /><circle cx="12" cy="12" r="4" /></>,
  inbox: <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>,
  'git-compare': <><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><path d="M11 18H8a2 2 0 0 1-2-2V9" /></>,
  'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h8" /><path d="M8 9h2" /></>,
  // nav — workspace
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.3" /></>,
  history: <><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></>,
  // nav — advanced
  scan: <><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M7 12h10" /></>,
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />,
  // controls
  menu: <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>,
  'chevron-left': <path d="m15 18-6-6 6-6" />,
};

export const Icon = ({ name, size = 16, strokeWidth = 2, className = '', style = {}, ...rest }) => {
  const glyph = PATHS[name];
  if (!glyph) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ display: 'block', ...style }} aria-hidden="true" {...rest}
    >
      {glyph}
    </svg>
  );
};

export default Icon;
