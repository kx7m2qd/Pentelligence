import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import Dashboard  from "./views/Dashboard";
import Recon from "./views/Recon";
import Scan from "./views/Scan";
import Exploit from "./views/Exploit";
import Report from "./views/Report";
import { LOGS } from "./data/constants";

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [target, setTarget] = useState("");
  const [scanning, setScanning] = useState(false);
  const [logIdx, setLogIdx] = useState(LOGS.length);
  const [visLogs, setVisLogs] = useState(LOGS);
  const [collapsed, setCollapsed] = useState(false);
  const termRef = useRef(null);

  const startScan = () => {
    if (!target.trim()) return;
    setScanning(true);
    setVisLogs([]);
    setLogIdx(0);
  };

  useEffect(() => {
    if (!scanning || logIdx >= LOGS.length) {
      if (logIdx >= LOGS.length) setScanning(false);
      return;
    }
    const t = setTimeout(() => {
      setVisLogs(p => [...p, LOGS[logIdx]]);
      setLogIdx(i => i + 1);
    }, 340 + Math.random() * 260);
    return () => clearTimeout(t);
  }, [scanning, logIdx]);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [visLogs]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 99,
        background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.025) 2px,rgba(0,0,0,.025) 4px)" }} />
      <Sidebar active={active} setActive={setActive} collapsed={collapsed} setCollapsed={setCollapsed} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <Header active={active} target={target} setTarget={setTarget} startScan={startScan} scanning={scanning} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          {active === "dashboard" && <Dashboard scanning={scanning} visLogs={visLogs} termRef={termRef} />}
          {active === "recon" && <Recon />}
          {active === "scan" && <Scan />}
          {active === "exploit" && <Exploit />}
          {active === "report" && <Report />}
        </div>
      </main>
    </div>
  );
}
