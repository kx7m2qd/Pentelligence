import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../components/common/Card";
import { CH } from "../components/common/CH";
import { EmptyState } from "../components/common/EmptyState";
import TopologyMap from "../components/TopologyMap";
import { apiGet } from "../lib/api";
import { rc } from "../utils/colors";

const SCAN_PHASES = [
  { key: "queued", label: "Queued", icon: "·" },
  { key: "subfinder", label: "Subdomain discovery", icon: "①" },
  { key: "nmap", label: "Port and service scan", icon: "②" },
  { key: "web", label: "HTTP probe", icon: "③" },
  { key: "agent", label: "AI ranking", icon: "④" },
  { key: "nuclei", label: "Nuclei confirmation", icon: "⑤" },
  { key: "done", label: "Complete", icon: "✓" },
];

const _KEEP_SCAN_PHASES_TAIL = [
  { key: "nuclei", label: "Nuclei confirmation", icon: "④" },
  { key: "done", label: "Complete", icon: "✓" },
];

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remaining}s` : `${remaining}s`;
}

function ScanProgress({ scan, hosts, subdomains, elapsed }) {
  const currentPhase = scan?.phase || "queued";
  const currentIndex = Math.max(0, SCAN_PHASES.findIndex(phase => phase.key === currentPhase));

  return (
    <Card style={{
      border: scan?.status === "error" ? "1px solid rgba(255,77,109,.25)" : "1px solid rgba(184,255,87,.18)",
      background: scan?.status === "error" ? "rgba(255,77,109,.04)" : "rgba(184,255,87,.04)",
    }}>
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: scan?.status === "error" ? "var(--red)" : scan?.status === "done" ? "var(--acc)" : "var(--orange)",
              animation: scan?.status === "running" ? "pulse 1.5s ease-in-out infinite" : "none",
            }} />
            <span style={{ fontFamily: "var(--sans)", fontSize: 11, letterSpacing: "0.1em", color: "var(--t2)" }}>
              {scan?.status === "error" ? "SCAN FAILED" : scan?.status === "done" ? "SCAN COMPLETE" : "SCAN IN PROGRESS"}
            </span>
          </div>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)" }}>{formatTime(elapsed)}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {SCAN_PHASES.map((phase, index) => {
            const isComplete = scan?.status === "done" ? index <= currentIndex : index < currentIndex;
            const isActive = scan?.status === "running" && index === currentIndex;
            const isFailed = scan?.status === "error" && phase.key === currentPhase;

            return (
              <div
                key={phase.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: isActive ? "rgba(184,255,87,.06)" : "transparent",
                }}
              >
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  background: isFailed ? "rgba(255,77,109,.12)" : isComplete ? "rgba(184,255,87,.15)" : "var(--s2)",
                  border: isFailed ? "1px solid rgba(255,77,109,.3)" : isComplete ? "1px solid rgba(184,255,87,.3)" : "1px solid var(--border)",
                }}>
                  {isFailed ? "!" : isComplete ? "✓" : phase.icon}
                </div>
                <span style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  flex: 1,
                  color: isFailed ? "var(--red)" : isComplete ? "var(--acc)" : isActive ? "var(--t1)" : "var(--t3)",
                }}>
                  {phase.label}
                </span>
                {phase.key === "subfinder" && subdomains.length > 0 && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--acc)" }}>{subdomains.length} found</span>
                )}
                {phase.key === "nmap" && hosts.length > 0 && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--blue)" }}>{hosts.length} hosts</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, fontFamily: "var(--mono)", fontSize: 11, color: scan?.status === "error" ? "var(--red)" : "var(--t2)" }}>
          {scan?.error_message || scan?.message || "Waiting for scan updates"}
        </div>
      </div>
    </Card>
  );
}

export default function Recon({ scanId, focusHost, onGoLive }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!scanId) return undefined;

    const poll = async () => {
      try {
        const json = await apiGet(`/recon/status/${scanId}`);
        setData(json);

        if (json.scan?.status === "done" || json.scan?.status === "error") {
          clearInterval(timerRef.current);
        }
      } catch (err) {
        setError(err.message);
        clearInterval(timerRef.current);
      }
    };

    timerRef.current = setInterval(() => {
      setElapsed(value => value + 1);
    }, 1000);

    void poll();
    const intervalId = setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      clearInterval(intervalId);
      clearInterval(timerRef.current);
    };
  }, [scanId]);

  const scan = data?.scan || null;
  const hosts = useMemo(() => data?.hosts || [], [data]);
  const subdomains = useMemo(() => data?.subdomains || [], [data]);
  const stats = data?.stats || { hostsFound: 0, subdomainsFound: 0, openPorts: 0 };
  const [selectedHostIndex, setSelectedHostIndex] = useState(null);
  const selectedHost = selectedHostIndex != null ? hosts[selectedHostIndex] : null;
  const webAssets = data?.webAssets || [];
  const [activeTab, setActiveTab] = useState("all");
  const [lightbox, setLightbox] = useState(null);

  const screenshots = useMemo(() => {
    return (data?.evidence || [])
      .filter(item => item.type === 'screenshot' && item.path)
      .map(item => {
        let meta = {};
        try { meta = JSON.parse(item.metadata_json || '{}'); } catch { meta = {}; }
        const filename = item.path.split('/').pop();
        return {
          ...item,
          filename,
          hostname: meta.hostname || item.target,
          url: `/api/recon/evidence/${scanId}/${encodeURIComponent(filename)}`,
        };
      });
  }, [data?.evidence, scanId]);

  useEffect(() => {
    if (!focusHost || hosts.length === 0) return;
    const index = hosts.findIndex(host => {
      const label = (host.hostname || host.ip || '').toLowerCase();
      return label === String(focusHost).toLowerCase() || host.ip === focusHost;
    });
    if (index >= 0) {
      // defer to after the paint so the effect body stays render-safe
      const raf = requestAnimationFrame(() => setSelectedHostIndex(index));
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [focusHost, hosts]);
  const isScanning = Boolean(scanId && scan?.status === "running");

  return (
    <div className={`recon-page ${scanId ? '' : 'recon-empty'}`} style={{ display: "flex", flexDirection: "column", gap: 18, padding: 22 }}>
      {error && (
        <div style={{
          padding: "10px 16px",
          borderRadius: 6,
          background: "rgba(255,77,109,.1)",
          border: "1px solid rgba(255,77,109,.3)",
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: "var(--red)",
        }}>
          {error}
        </div>
      )}

      {scanId ? (
        <ScanProgress scan={scan} hosts={hosts} subdomains={subdomains} elapsed={elapsed} />
      ) : (
        <EmptyState eyebrow="NO INVESTIGATION" description="Start from Live to map hosts, HTTP services, and subdomains." onAction={onGoLive} />
      )}

      <div className={scanId ? '' : 'recon-data-hidden'} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        {[
          { label: "Subdomains", val: subdomains.length, color: "var(--acc)" },
          { label: "Live hosts", val: stats.hostsFound, color: "var(--t1)" },
          { label: "Open ports", val: stats.openPorts, color: "var(--blue)" },
          { label: "OS types", val: [...new Set(hosts.map(host => host.os?.split(" ")[0]))].filter(Boolean).length, color: "var(--t1)" },
        ].map((stat, index) => (
          <Card key={index} style={{ padding: "14px 18px" }}>
            <div style={{ fontFamily: "var(--sans)", fontSize: 10, letterSpacing: "0.12em", color: "var(--t3)", marginBottom: 6 }}>{stat.label.toUpperCase()}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 26, color: stat.color, lineHeight: 1 }}>{isScanning && !data ? "…" : stat.val}</div>
          </Card>
        ))}
      </div>

      {scanId && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
          {[
            { id: "all", label: "Overview & Map" },
            { id: "hosts", label: `Hosts & Services (${hosts.length})` },
            { id: "screenshots", label: `Evidence Gallery (${screenshots.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                background: activeTab === tab.id ? "var(--acc)" : "var(--s2)",
                color: activeTab === tab.id ? "#101607" : "var(--t2)",
                border: "1px solid var(--border)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "screenshots" && (
        <Card>
          <CH left="EVIDENCE GALLERY — WEB SCREENSHOTS" right={`${screenshots.length} captured snapshot${screenshots.length === 1 ? '' : 's'}`} />
          {screenshots.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--t3)", fontFamily: "var(--mono)", fontSize: 12 }}>
              {isScanning ? "Capturing web screenshots during HTTP probe phase…" : "No screenshots captured for this investigation."}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, padding: 18 }}>
              {screenshots.map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => setLightbox(item)}
                  style={{
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    background: "var(--s2)",
                    cursor: "pointer",
                    transition: "border-color 0.15s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--acc)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <div style={{ width: "100%", height: 160, overflow: "hidden", background: "#000", position: "relative" }}>
                    <img
                      src={item.url}
                      alt={item.hostname}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                    <span style={{
                      position: "absolute",
                      bottom: 6,
                      right: 6,
                      background: "rgba(0,0,0,0.75)",
                      color: "var(--acc)",
                      fontSize: 10,
                      fontFamily: "var(--mono)",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}>
                      CLICK TO EXPAND
                    </span>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.hostname}
                    </div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--t3)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.target}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              background: "var(--s1)",
              borderRadius: 12,
              border: "1px solid var(--border2)",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--s2)" }}>
              <div>
                <strong style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--t1)" }}>{lightbox.hostname}</strong>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)", marginLeft: 12 }}>{lightbox.target}</span>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                style={{ background: "none", border: 0, color: "var(--t2)", cursor: "pointer", fontSize: 18, fontFamily: "var(--mono)" }}
              >
                ✕
              </button>
            </div>
            <div style={{ overflow: "auto", padding: 12, display: "flex", justifyContent: "center", background: "#000" }}>
              <img src={lightbox.url} alt={lightbox.hostname} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 4 }} />
            </div>
          </div>
        </div>
      )}

      {(activeTab === "all") && (hosts.length > 0 || subdomains.length > 0) && (
        <Card>
          <CH left="ATTACK SURFACE MAP" right={isScanning ? "live discovery" : `${hosts.length} hosts · ${subdomains.length} subdomains`} />
          <TopologyMap
            hosts={hosts}
            subdomains={subdomains}
            target={scan?.target}
            selectedHostIndex={selectedHostIndex}
            onSelectHost={setSelectedHostIndex}
            scanning={isScanning}
          />
        </Card>
      )}

      {(activeTab === "all" || activeTab === "hosts") && (
      <div className="recon-cols">
        <Card>
          <CH left="HOST MAP" right={isScanning ? "scanning…" : hosts.length > 0 ? "nmap TCP scan" : null} />
          {hosts.length === 0 && (
            <div style={{ padding: "20px 18px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)" }}>
              {isScanning ? "waiting for nmap results…" : scanId ? "no hosts found" : "—"}
            </div>
          )}
          {hosts.map((host, index) => (
            <div
              key={`${host.ip}-${host.hostname}-${index}`}
              onClick={() => setSelectedHostIndex(selectedHostIndex === index ? null : index)}
              style={{
                padding: "11px 18px",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: selectedHostIndex === index ? "var(--s3)" : "transparent",
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: rc(host.risk) }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--t1)" }}>{host.hostname || host.ip}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--t3)", marginTop: 1 }}>{host.ip}</div>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {(host.ports || []).slice(0, 4).map(port => (
                  <span key={`${host.ip}-${port.port}-${port.protocol}`} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "var(--s3)", color: "var(--t3)", border: "1px solid var(--border)" }}>
                    {port.port}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <CH left="HTTP SERVICES" right={webAssets.length ? `${webAssets.length} responsive` : null} />
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {webAssets.length === 0 && <div style={{ padding: "18px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)" }}>{isScanning ? "probing web services…" : "no HTTP responses recorded"}</div>}
              {webAssets.map(asset => <div key={asset.id} style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}><div><div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t1)", overflowWrap: "anywhere" }}>{asset.url}</div><div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--t3)", marginTop: 3 }}>{asset.title || "untitled"} · {asset.server || "server hidden"}</div></div><span style={{ fontFamily: "var(--mono)", color: asset.status_code < 400 ? "var(--acc)" : "var(--orange)" }}>{asset.status_code}</span></div>)}
            </div>
          </Card>
          <Card>
            <CH left="SUBDOMAINS" right={subdomains.length > 0 ? `${subdomains.length} discovered` : null} />
            <div style={{ padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 220, overflowY: "auto" }}>
              {subdomains.length === 0 && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)" }}>
                  {isScanning ? "running subfinder…" : "—"}
                </span>
              )}
              {subdomains.map((subdomain, index) => (
                <span key={`${subdomain}-${index}`} style={{ fontFamily: "var(--mono)", fontSize: 11, padding: "4px 10px", borderRadius: 4, background: "var(--s2)", color: "var(--t2)", border: "1px solid var(--border)" }}>
                  {subdomain}
                </span>
              ))}
            </div>
          </Card>

          <Card>
            <CH left={selectedHost ? `HOST — ${selectedHost.hostname || selectedHost.ip}` : "SELECT A HOST"} />
            <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 9 }}>
              {!selectedHost ? (
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)" }}>click a host to inspect</span>
              ) : (
                <>
                  {[
                    { k: "IP", v: selectedHost.ip },
                    { k: "Hostname", v: selectedHost.hostname },
                    { k: "OS", v: selectedHost.os || "unknown" },
                    { k: "Risk", v: (selectedHost.risk || "unknown").toUpperCase() },
                    { k: "Status", v: selectedHost.status || "up" },
                  ].map(({ k, v }) => (
                    <div key={k} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 11, letterSpacing: "0.08em", color: "var(--t3)", minWidth: 60 }}>{k}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: k === "Risk" ? rc(selectedHost.risk) : "var(--t2)" }}>{v}</span>
                    </div>
                  ))}
                  {selectedHost.ports?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 10, letterSpacing: "0.1em", color: "var(--t3)", marginBottom: 6 }}>OPEN PORTS</div>
                      {selectedHost.ports.map(port => (
                        <div key={`${port.port}-${port.protocol}`} style={{ display: "flex", gap: 12, marginBottom: 4 }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--acc)", minWidth: 40 }}>{port.port}</span>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)", minWidth: 40 }}>{port.protocol}</span>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t2)" }}>{port.service} {port.version}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
