export const SCAN_INTENSITY = {
  safe: { name: 'safe', rateLimit: 25, retries: 1, label: 'Safe', desc: '25 req/s · quieter nuclei' },
  balanced: { name: 'balanced', rateLimit: 50, retries: 1, label: 'Balanced', desc: '50 req/s · default coverage' },
  fast: { name: 'fast', rateLimit: 100, retries: 0, label: 'Fast', desc: '100 req/s · noisier, quicker' },
};

export const NAV = [
  { id: 'dashboard', icon: '⬡', label: 'Live', group: 'investigation' },
  { id: 'recon', icon: '◎', label: 'Surface', group: 'investigation' },
  { id: 'findings', icon: '▣', label: 'Findings', group: 'investigation' },
  { id: 'report', icon: '▤', label: 'Report', group: 'investigation' },
  { id: 'programs', icon: '☰', label: 'Programs', group: 'workspace' },
  { id: 'history', icon: '◷', label: 'History', group: 'workspace' },
  { id: 'scan', icon: '⊞', label: 'Nuclei', group: 'advanced' },
  { id: 'exploit', icon: '⚡', label: 'Active checks', group: 'advanced' },
];

export const NAV_GROUPS = [
  { id: 'investigation', label: 'Investigation' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'advanced', label: 'Advanced' },
];

export const PAGE_LABELS = {
  dashboard: 'Live / Investigation',
  recon: 'Surface / Attack map',
  findings: 'Findings / Inbox',
  report: 'Report / Export',
  programs: 'Programs / Scope',
  history: 'History / Saved scans',
  scan: 'Advanced / Nuclei rerun',
  exploit: 'Advanced / Active checks',
};
