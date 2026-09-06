import React, { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import AccessGate from './components/layout/AccessGate';
import Dashboard  from "./views/Dashboard";
import History from "./views/History";
import Programs from './views/Programs';
import Recon from "./views/Recon";
import Findings from "./views/Findings";
import Scan from "./views/Scan";
import Exploit from "./views/Exploit";
import Report from "./views/Report";
import CommandPalette from "./components/common/CommandPalette";
import { apiGet, apiPost, ensureWorkspace, getAccessStatus } from "./lib/api";
import { SCAN_INTENSITY } from "./data/constants";

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [target, setTarget] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [currentScanId, setCurrentScanId] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [error, setError] = useState("");
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [intensity, setIntensity] = useState("balanced");
  const [scanRecord, setScanRecord] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [focusHost, setFocusHost] = useState(null);
  const [accessReady, setAccessReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const termRef = useRef(null);

  useEffect(() => {
    const initialiseAccess = async () => {
      try {
        const status = await getAccessStatus();
        setAuthenticated(status.authenticated);
        if (status.authenticated) await ensureWorkspace();
      } catch (err) {
        setError(err.message);
      } finally {
        setAccessReady(true);
      }
    };
    void initialiseAccess();
  }, []);

  const selectScan = useCallback(scan => {
    const sameScan = scan?.id != null && scan.id === currentScanId;
    setCurrentScanId(scan?.id ?? null);
    setTarget(scan?.target || "");
    setScanning(scan?.status === "running");
    setScanRecord(scan || null);
    // Don't reset the timer when re-selecting the scan that is already open —
    // that would flicker the elapsed counter back to 0 mid-run.
    if (!sameScan) setElapsed(0);
    setFocusHost(null);
  }, [currentScanId]);

  const startFresh = () => {
    setCurrentScanId(null);
    setTarget("");
    setScanning(false);
    setCancelling(false);
    setError("");
    setAuthorizationConfirmed(false);
    setScanRecord(null);
    setElapsed(0);
    setFocusHost(null);
    setMobileNavOpen(false);
    setActive("dashboard");
  };

  const navigate = nextActive => {
    setActive(nextActive);
    setMobileNavOpen(false);
  };

  useEffect(() => {
    if (!authenticated) return;
    const loadRunningScan = async () => {
      try {
        const data = await apiGet("/recon/scans");
        const latest = (data.scans || []).find(scan => scan.status === "running");
        if (!latest) return;
        selectScan(latest);
      } catch (err) {
        console.error("failed to load scans:", err);
      }
    };

    void loadRunningScan();
  }, [authenticated, selectScan]);

  useEffect(() => {
    if (!currentScanId || !scanning) return undefined;
    const tick = setInterval(() => setElapsed(value => value + 1), 1000);
    return () => clearInterval(tick);
  }, [currentScanId, scanning]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileNavOpen]);

  useEffect(() => {
    const handleGlobalKeys = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  const exportDatabaseBackup = async () => {
    try {
      const data = await apiGet('/recon/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pentelligence-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const programName = selectedProgram?.name || null;

  if (!accessReady) return <div className="app-loading">Loading workspace...</div>;
  if (!authenticated) return <AccessGate initialError={error} onAuthenticated={() => { setError(''); setAuthenticated(true); void ensureWorkspace(); }} />;

  const startScan = async () => {
    if (!target.trim()) return;
    if (!authorizationConfirmed) {
      setError("Confirm that you are authorized to test this target before starting.");
      setActive("dashboard");
      return;
    }

    setError("");
    setScanning(true);

    try {
      const data = await apiPost("/recon/start", {
        target,
        programId: selectedProgram?.id,
        authorizationConfirmed: true,
        authorizationNote: "Confirmed in Pentelligence workspace",
        intensity,
      });
      selectScan({ id: data.scanId, target: data.target || target.trim(), status: "running", phase: "queued" });
      setActive("dashboard");
    } catch (err) {
      console.error("scan failed:", err);
      setScanning(false);
      setError(err.message);
    }
  };

  const openSurfaceForHost = hostname => {
    setFocusHost(hostname || null);
    setActive("recon");
  };

  const cancelScan = async () => {
    if (!currentScanId || !scanning || cancelling) return;
    setCancelling(true);
    try {
      await apiPost(`/recon/cancel/${currentScanId}`, {});
    } catch (err) {
      setCancelling(false);
      setError(err.message);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar active={active} setActive={navigate} collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileNavOpen} setMobileOpen={setMobileNavOpen} />
      <main className="app-main">
        <Header
          active={active}
          target={target}
          scanning={scanning}
          cancelling={cancelling}
          startFresh={startFresh}
          cancelScan={cancelScan}
          hasSelection={Boolean(currentScanId || target)}
          programName={programName}
          phase={scanRecord?.phase}
          scanStatus={scanRecord?.status}
          elapsed={currentScanId ? elapsed : null}
          onToggleNav={() => setMobileNavOpen(value => !value)}
          mobileNavOpen={mobileNavOpen}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        {error && (
          <div className="app-banner error">
            {error}
          </div>
        )}
        <div className="app-content">
          {active === "dashboard" && (
            <Dashboard
              key={`dashboard-${currentScanId || "none"}`}
              scanning={scanning}
              setScanning={setScanning}
              termRef={termRef}
              scanId={currentScanId}
              target={target}
              setTarget={setTarget}
              startScan={startScan}
              authorizationConfirmed={authorizationConfirmed}
              setAuthorizationConfirmed={setAuthorizationConfirmed}
              selectedProgram={selectedProgram}
              onOpenPrograms={() => setActive("programs")}
              intensity={intensity}
              setIntensity={setIntensity}
              intensities={SCAN_INTENSITY}
              onScanUpdate={scan => {
                setScanRecord(scan);
                if (scan?.status !== 'running') setCancelling(false);
              }}
              onOpenFindings={() => setActive("findings")}
              onOpenSurface={() => setActive("recon")}
            />
          )}
          {active === "history" && (
            <History
              currentScanId={currentScanId}
              onOpenScan={scan => { selectScan(scan); setActive("dashboard"); }}
              onStartFresh={startFresh}
            />
          )}
          {active === "programs" && <Programs selectedProgram={selectedProgram} onSelect={setSelectedProgram} />}
          {active === "recon" && (
            <Recon
              key={`recon-${currentScanId || "none"}`}
              scanId={currentScanId}
              focusHost={focusHost}
              onGoLive={() => setActive("dashboard")}
            />
          )}
          {active === "findings" && (
            <Findings
              key={`findings-${currentScanId || "none"}`}
              scanId={currentScanId}
              onGoLive={() => setActive("dashboard")}
              onOpenHost={openSurfaceForHost}
            />
          )}
          {active === "scan" && (
            <Scan
              key={`scan-${currentScanId || "none"}`}
              scanId={currentScanId}
              intensity={intensity}
              onGoLive={() => setActive("dashboard")}
            />
          )}
          {active === "exploit" && (
            <Exploit
              key={`exploit-${currentScanId || "none"}`}
              scanId={currentScanId}
              onGoLive={() => setActive("dashboard")}
            />
          )}
          {active === "report" && (
            <Report
              key={`report-${currentScanId || "none"}`}
              scanId={currentScanId}
              onGoLive={() => setActive("dashboard")}
            />
          )}
        </div>
      </main>
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={navigate}
        onStartFresh={startFresh}
        onExportBackup={exportDatabaseBackup}
        currentScanId={currentScanId}
      />
    </div>
  );
}
