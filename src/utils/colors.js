export const sevColor = (s) => ({
  CRITICAL: "var(--red)",
  HIGH: "var(--orange)",
  MEDIUM: "var(--yellow)",
  LOW: "var(--t2)",
})[s];

export const sevBg = (s) => ({
  CRITICAL: "rgba(255,77,109,.12)",
  HIGH: "rgba(255,140,66,.1)",
  MEDIUM: "rgba(255,209,102,.08)",
  LOW: "rgba(122,122,138,.08)",
})[s];
