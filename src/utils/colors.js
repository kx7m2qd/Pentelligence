export const sc = s=>({CRITICAL:"var(--red)",HIGH:"var(--orange)",MEDIUM:"var(--yellow)",LOW:"var(--t2)"}[s]||"var(--t3)");
export const sb = s=>({CRITICAL:"rgba(255,77,109,.12)",HIGH:"rgba(255,140,66,.1)",MEDIUM:"rgba(255,209,102,.08)",LOW:"rgba(122,122,138,.08)"}[s]||"transparent");
export const rc = r=>({critical:"var(--red)",high:"var(--orange)",medium:"var(--yellow)",low:"var(--t3)"}[r]||"var(--t3)");
