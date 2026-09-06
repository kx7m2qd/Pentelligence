import React, { useEffect, useMemo, useRef, useState } from "react";
import { rc } from "../utils/colors";

// Shared map geometry: the simulation seeds, gravity, boundary circle and the
// "TARGET · ENVIRONMENT" label all derive from these so they can't drift.
const W = 480;
const H = 360;
const CENTER_X = W / 2; // 240
const CENTER_Y = H / 2; // 180

// Force-directed attack-surface topology, in the style of micro-segmentation
// maps: the target domain anchors the center, subdomains and live hosts orbit
// inside a boundary, and each host carries its open ports as small leaves.
// Deliberately dependency-free — a small n-body simulation driven by rAF.

function baseDomainOf(hostname) {
  const parts = String(hostname || "").split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  return parts.slice(-2).join(".");
}

function buildGraph(hosts, subdomains, target) {
  const nodes = [];
  const links = [];
  const rootLabel = target || baseDomainOf(subdomains[0] || hosts[0]?.hostname) || "target";

  const rootNode = { id: "root", kind: "root", label: rootLabel, r: 26 };
  nodes.push(rootNode);

  const subToNode = new Map();
  for (const sub of subdomains.slice(0, 40)) {
    const node = { id: `sub:${sub}`, kind: "sub", label: sub, r: 9 + Math.min(sub.length / 12, 3) };
    nodes.push(node);
    subToNode.set(sub, node);
    links.push({ source: "root", target: node.id, kind: "sub" });
  }

  hosts.forEach((host, index) => {
    const id = `host:${host.ip}:${index}`;
    const ports = host.ports || [];
    const node = {
      id,
      kind: "host",
      label: host.hostname && host.hostname !== host.ip ? host.hostname : host.ip,
      ip: host.ip,
      risk: host.risk,
      os: host.os,
      ports,
      r: 11 + Math.min(ports.length, 6) * 1.6,
      hostIndex: index,
    };
    nodes.push(node);

    const hostname = (host.hostname || "").toLowerCase();
    let parent = rootNode;
    if (hostname) {
      for (const [sub, subNode] of subToNode) {
        if (hostname === sub || hostname.endsWith(`.${sub}`)) { parent = subNode; break; }
      }
    }
    links.push({ source: parent.id, target: id, kind: "host" });

    ports.slice(0, 8).forEach(port => {
      const portId = `${id}:p${port.port}`;
      nodes.push({ id: portId, kind: "port", label: String(port.port), port, hostRef: node, r: 7 });
      links.push({ source: id, target: portId, kind: "port" });
    });
  });

  return { nodes, links };
}

export default function TopologyMap({ hosts = [], subdomains = [], target, selectedHostIndex, onSelectHost, scanning }) {
  const graph = useMemo(() => buildGraph(hosts, subdomains, target), [hosts, subdomains, target]);
  const svgRef = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const dragRef = useRef(null);
  const wakeRef = useRef(null);
  const [sim, setSim] = useState(null);

  useEffect(() => {
    const nodes = graph.nodes.map(n => ({ ...n }));
    const index = new Map(nodes.map(n => [n.id, n]));
    const links = graph.links.map(l => ({ ...l }));

    // seed positions: root center, subs in a ring, hosts outside, ports near hosts
    for (const n of nodes) {
      if (n.kind === "root") { n.x = CENTER_X; n.y = CENTER_Y; }
      else {
        const angle = Math.random() * Math.PI * 2;
        const radius = n.kind === "sub" ? 110 : n.kind === "host" ? 160 : 40;
        n.x = (n.parentSeed?.x ?? CENTER_X) + Math.cos(angle) * radius * (0.6 + Math.random() * 0.6);
        n.y = (n.parentSeed?.y ?? CENTER_Y) + Math.sin(angle) * radius * (0.6 + Math.random() * 0.6);
      }
      n.vx = 0; n.vy = 0;
    }

    let alpha = 1;
    let raf;
    const step = () => {
      alpha = Math.max(alpha * 0.995, 0.03);

      // pairwise repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let dist2 = dx * dx + dy * dy;
          if (dist2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dist2 = 1; }
          const minDist = a.r + b.r + (a.kind === "port" || b.kind === "port" ? 6 : 34);
          const dist = Math.sqrt(dist2);
          const strength = (a.kind === "port" || b.kind === "port" ? 900 : 2600) / dist2;
          const overlap = dist < minDist ? (minDist - dist) * 0.9 : 0;
          const force = strength + overlap / dist;
          const fx = dx * force, fy = dy * force;
          a.vx -= fx * alpha; a.vy -= fy * alpha;
          b.vx += fx * alpha; b.vy += fy * alpha;
        }
      }

      // springs along links
      for (const l of links) {
        const a = index.get(l.source), b = index.get(l.target);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const want = l.kind === "port" ? 26 : l.kind === "sub" ? 95 : 80;
        const k = (dist - want) * (l.kind === "port" ? 0.08 : 0.03);
        const fx = (dx / dist) * k, fy = (dy / dist) * k;
        a.vx += fx * alpha; a.vy += fy * alpha;
        b.vx -= fx * alpha; b.vy -= fy * alpha;
      }

      // gravity toward center, stronger for root
      let maxMotion = 0;
      for (const n of nodes) {
        const g = n.kind === "root" ? 0.12 : n.kind === "sub" ? 0.015 : n.kind === "host" ? 0.006 : 0.002;
        n.vx += (CENTER_X - n.x) * g * alpha * 10;
        n.vy += (CENTER_Y - n.y) * g * alpha * 10;
        if (n.kind !== "root") { n.vx *= 0.85; n.vy *= 0.85; }
        if (dragRef.current?.id !== n.id) { n.x += n.vx; n.y += n.vy; }
        maxMotion = Math.max(maxMotion, Math.abs(n.vx) + Math.abs(n.vy));
        n.vx *= 0.6; n.vy *= 0.6;
      }

      setSim({ nodes, index, links });

      // sleep when the layout has settled and nothing is being dragged —
      // avoids burning a re-render per frame on a static map
      if (maxMotion < 0.05 && !dragRef.current) {
        raf = null;
        return;
      }
      raf = requestAnimationFrame(step);
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(step); };
    wakeRef.current = wake;
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [graph]);

  const nodeById = sim?.index || new Map();

  const toSvg = (clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - view.x) / view.k,
      y: (clientY - rect.top - view.y) / view.k,
    };
  };

  const startNodeDrag = (event, node) => {
    event.stopPropagation();
    const p = toSvg(event.clientX, event.clientY);
    dragRef.current = { id: node.id, dx: node.x - p.x, dy: node.y - p.y, moved: false, node };
    if (node.kind === "host" && onSelectHost) onSelectHost(node.hostIndex);
    wakeRef.current?.();
  };

  const onPointerMove = event => {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    if (drag.pan) {
      setView(v => ({ ...v, x: drag.vx + (event.clientX - drag.startX), y: drag.vy + (event.clientY - drag.startY) }));
      return;
    }
    const p = toSvg(event.clientX, event.clientY);
    const node = nodeById.get(drag.id);
    if (node) { node.x = p.x + drag.dx; node.y = p.y + drag.dy; }
    drag.moved = true;
  };

  const endDrag = () => { dragRef.current = null; };

  const startPan = event => {
    dragRef.current = { pan: true, startX: event.clientX, startY: event.clientY, vx: view.x, vy: view.y };
  };

  // React attaches wheel as passive on some targets, which makes
  // preventDefault() a no-op; attach a native non-passive listener instead.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;

    const onWheel = event => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      setView(v => {
        const factor = event.deltaY < 0 ? 1.12 : 0.9;
        const k = Math.min(Math.max(v.k * factor, 0.4), 3);
        const ratio = k / v.k;
        // keep the point under the cursor fixed while zooming
        return { x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio, k };
      });
    };

    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [graph]);

  if (hosts.length === 0 && subdomains.length === 0) return null;

  const boundaryRadius = (() => {
    if (!sim) return 210;
    let max = 140;
    for (const n of sim.nodes) {
      if (n.kind === "root") continue;
      const d = Math.hypot(n.x - CENTER_X, n.y - CENTER_Y) + n.r + 24;
      if (d > max) max = d;
    }
    return Math.min(max, 250);
  })();

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        width="100%"
        height="430"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", background: "var(--s1)", borderRadius: 8, touchAction: "none", cursor: "grab" }}
        onPointerDown={startPan}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {/* environment boundary, like a micro-seg segment */}
          <circle
            cx={CENTER_X} cy={CENTER_Y} r={boundaryRadius}
            fill="rgba(184,255,87,.025)"
            stroke="rgba(228,220,70,.55)"
            strokeWidth="1.5"
            strokeDasharray="none"
          />
          <text x={CENTER_X} y={CENTER_Y + boundaryRadius + 14} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--t3)" letterSpacing="2">
            {(target || "TARGET").toUpperCase()} · ENVIRONMENT
          </text>

          {sim?.links.map((l, i) => {
            const a = nodeById.get(l.source), b = nodeById.get(l.target);
            if (!a || !b) return null;
            const selected = typeof selectedHostIndex === "number" &&
              (b.hostIndex === selectedHostIndex || a.hostIndex === selectedHostIndex);
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={selected ? "var(--acc)" : l.kind === "port" ? "rgba(120,140,120,.4)" : "rgba(140,160,130,.35)"}
                strokeWidth={l.kind === "port" ? 1 : selected ? 1.6 : 1}
                strokeDasharray={l.kind === "sub" ? "3 3" : "none"}
              />
            );
          })}

          {sim?.nodes.map(n => {
            const isHost = n.kind === "host";
            const selected = isHost && n.hostIndex === selectedHostIndex;
            const fill = n.kind === "root" ? "rgba(184,255,87,.14)"
              : n.kind === "sub" ? "var(--s2)"
              : n.kind === "port" ? "var(--s3)"
              : `rgba(184,255,87,.08)`;
            const stroke = n.kind === "root" ? "var(--acc)"
              : n.kind === "sub" ? "rgba(184,255,87,.35)"
              : n.kind === "port" ? "var(--border)"
              : rc(n.risk);
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                style={{ cursor: isHost ? "pointer" : "grab" }}
                onPointerDown={e => startNodeDrag(e, n)}
              >
                <circle
                  r={n.r}
                  fill={fill}
                  stroke={selected ? "var(--acc)" : stroke}
                  strokeWidth={selected ? 2.4 : n.kind === "root" ? 1.6 : 1.2}
                />
                {n.kind === "root" && (
                  <>
                    <circle r={n.r + 5} fill="none" stroke="rgba(184,255,87,.25)" strokeWidth="1" />
                    <text textAnchor="middle" y="4" fontFamily="var(--mono)" fontSize="9" fontWeight="700" fill="var(--acc)">{n.label.split(".")[0].slice(0, 10)}</text>
                    <text textAnchor="middle" y={n.r + 12} fontFamily="var(--mono)" fontSize="7.5" fill="var(--t3)">{n.label}</text>
                  </>
                )}
                {n.kind === "sub" && (
                  <text textAnchor="middle" y={n.r + 9} fontFamily="var(--mono)" fontSize="7.5" fill="var(--t2)">
                    {n.label.length > 22 ? n.label.slice(0, 20) + "…" : n.label}
                  </text>
                )}
                {isHost && (
                  <>
                    <text textAnchor="middle" y={-n.r - 5} fontFamily="var(--mono)" fontSize="7.5" fill="var(--t1)">
                      {n.label.length > 24 ? n.label.slice(0, 22) + "…" : n.label}
                    </text>
                    <text textAnchor="middle" y={n.r + 10} fontFamily="var(--mono)" fontSize="7" fill="var(--t3)">{n.ip}</text>
                  </>
                )}
                {n.kind === "port" && (
                  <text textAnchor="middle" y="2.8" fontFamily="var(--mono)" fontSize="6.5" fill={n.port.service?.startsWith("https") || n.port.port === 443 ? "var(--acc)" : "var(--t3)"}>{n.label}</text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div style={{
        position: "absolute", bottom: 8, left: 12, right: 12,
        display: "flex", gap: 14, fontFamily: "var(--mono)", fontSize: 9, color: "var(--t3)",
        pointerEvents: "none",
      }}>
        <span><span style={{ color: "var(--acc)" }}>◉</span> domain</span>
        <span><span style={{ color: "rgba(184,255,87,.6)" }}>◌</span> subdomain</span>
        <span><span style={{ color: "var(--t2)" }}>●</span> host (ring = risk)</span>
        <span><span style={{ color: "var(--t3)" }}>·</span> open port</span>
        <span style={{ marginLeft: "auto" }}>{scanning ? "live — updating…" : "drag nodes · scroll to zoom"}</span>
      </div>
    </div>
  );
}
