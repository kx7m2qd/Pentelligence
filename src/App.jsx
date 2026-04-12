import React, { useState, useRef } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import Dashboard  from "./views/Dashboard";
import Recon from "./views/Recon";
import Scan from "./views/Scan";
import Exploit from "./views/Exploit";
import Report from "./views/Report";

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [target, setTarget] = useState("");
  const [scanning, setScanning] = useState(false);
  const [currentScanId, setCurrentScanId] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const termRef = useRef(null);

  const startScan = async () => {
    if (!target.trim()) return;
    setScanning(true);
    try {
      const res = await fetch("http://localhost:3001/api/recon/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target })
      });
      const data = await res.json();
      setCurrentScanId(data.scanId);
      setActive("dashboard"); // go to dashboard to watch live logs
    } catch (err) {
      console.error("scan failed:", err);
      setScanning(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 99,
        background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.025) 2px,rgba(0,0,0,.025) 4px)" }} />
      <Sidebar active={active} setActive={setActive} collapsed={collapsed} setCollapsed={setCollapsed} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <Header active={active} target={target} setTarget={setTarget} startScan={startScan} scanning={scanning} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          {active === "dashboard" && <Dashboard scanning={scanning} setScanning={setScanning} termRef={termRef} scanId={currentScanId} />}
          {active === "recon" && <Recon scanId={currentScanId} />}
          {active === "scan" && <Scan scanId={currentScanId} />}
          {active === "exploit" && <Exploit scanId={currentScanId} />}
          {active === "report" && <Report scanId={currentScanId} />}
        </div>
      </main>
    </div>
  );
}
