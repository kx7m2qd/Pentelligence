import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatRow from "./components/Dashboard/StatRow";
import ModulesList from "./components/Dashboard/ModulesList";
import TerminalView from "./components/Dashboard/TerminalView";
import FindingsTable from "./components/Dashboard/FindingsTable";
import { LOGS } from "./data/mockData";

export default function App() {
  const [active, setActive]       = useState("dashboard");
  const [target, setTarget]       = useState("");
  const [scanning, setScanning]   = useState(false);
  const [logIdx, setLogIdx]       = useState(LOGS.length);
  const [visLogs, setVisLogs]     = useState(LOGS);
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
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", position:"relative" }}>
      {/* scanline effect */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:99,
        background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.03) 2px,rgba(0,0,0,.03) 4px)" }}/>

      <Sidebar 
        active={active} 
        setActive={setActive} 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
      />

      {/* MAIN */}
      <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <Header 
          target={target} 
          setTarget={setTarget} 
          startScan={startScan} 
          scanning={scanning} 
        />

        {/* content */}
        <div style={{ flex:1, overflow:"auto", padding:24, display:"flex", flexDirection:"column", gap:20 }}>
          <StatRow />
          
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1.3fr", gap:16, minHeight:0 }}>
            <ModulesList />
            <TerminalView termRef={termRef} visLogs={visLogs} scanning={scanning} />
          </div>

          <FindingsTable />
        </div>
      </main>
    </div>
  );
}
