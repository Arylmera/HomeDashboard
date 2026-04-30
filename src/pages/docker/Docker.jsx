/* ============================================================== *
 *  Containers — live Docker view backed by Arcane API.
 *  Mirrors the Quicklinks layout: topbar / hero / search /
 *  sections / footer. Sections are: stacks, loose containers,
 *  daemon (counts).
 * ============================================================== */
import { useState, useMemo, useRef, useEffect } from 'react';
import { UI } from '../../lib/icons.jsx';
import { useClock, useGreeting, useWeather, useArcane, arcaneAction } from '../../lib/hooks.js';

/* ── small helpers ──────────────────────────────────────────── */

function stateClass(s) {
  if (s === "running") return "up";
  if (s === "restarting" || s === "paused") return "warn";
  return "down";
}

function shortName(c) {
  const raw = c.names?.[0] || c.id?.slice(0, 12) || "?";
  return raw.replace(/^\//, "");
}

function projectOf(c) {
  return c.labels?.["com.docker.compose.project"] || null;
}

function serviceOf(c) {
  return c.labels?.["com.docker.compose.service"] || null;
}

function uptimeOf(c) {
  // e.g. "Up 37 minutes (healthy)" → "37m · healthy"; "Exited (0) 2 hours ago" → "down 2h"
  const s = c.status || "";
  const up = s.match(/^Up\s+(.+?)(?:\s+\((healthy|unhealthy|starting)\))?$/i);
  if (up) {
    const dur = up[1].replace(/about\s+/i, "").replace(/\sago/, "");
    const h = up[2];
    return h ? `${dur} · ${h}` : dur;
  }
  return s || "—";
}

function uniqPorts(ports) {
  const seen = new Set();
  const out = [];
  for (const p of ports || []) {
    if (!p.publicPort) continue;
    const k = `${p.publicPort}->${p.privatePort}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

/* ── status dot ─────────────────────────────────────────────── */

function Dot({ s }) {
  return <span className={`status-dot ${stateClass(s)}`} title={s} />;
}

/* ── container card ─────────────────────────────────────────── */

function ContainerCard({ c, envId, onAction }) {
  const [busy, setBusy] = useState(false);
  const ports = uniqPorts(c.ports);
  const running = c.state === "running";
  const name = shortName(c);
  const svc = serviceOf(c);

  const fire = async (action) => {
    setBusy(true);
    try { await onAction("containers", c.id, action); }
    finally { setBusy(false); }
  };

  return (
    <div className={"docker-card" + (running ? "" : " is-down") + (busy ? " is-busy" : "")}>
      <div className="docker-card-head">
        <Dot s={c.state} />
        <div className="docker-card-name" title={name}>{svc || name}</div>
        <div className="docker-card-up">{uptimeOf(c)}</div>
      </div>
      <div className="docker-card-img" title={c.image}>{c.image}</div>
      {ports.length > 0 && (
        <div className="docker-card-ports">
          {ports.slice(0, 4).map((p, i) => (
            <span key={i} className="port-chip">{p.publicPort}<span className="arrow">↦</span>{p.privatePort}</span>
          ))}
          {ports.length > 4 && <span className="port-chip more">+{ports.length - 4}</span>}
        </div>
      )}
      <div className="docker-card-actions">
        {running ? (
          <>
            <button onClick={() => fire("restart")} disabled={busy} title="restart">↻</button>
            <button onClick={() => fire("stop")} disabled={busy} title="stop">■</button>
          </>
        ) : (
          <button onClick={() => fire("start")} disabled={busy} title="start">▶</button>
        )}
      </div>
    </div>
  );
}

/* ── stack section (compose project) ────────────────────────── */

function Stack({ project, services, idx, envId, onAction, onProjectAction }) {
  const [busy, setBusy] = useState(false);
  const total = services.length;
  const running = services.filter(s => s.state === "running").length;
  const allUp = running === total;

  const fire = async (action) => {
    if (!project?.id) return;
    setBusy(true);
    try { await onProjectAction(project.id, action); } finally { setBusy(false); }
  };

  return (
    <section className="section docker-stack">
      <div className="section-head">
        <div className="section-title">
          <span className="numeral">// {String(idx + 1).padStart(2, "0")}</span>
          <h2>{project?.name || "(loose)"}</h2>
          <span className={`status-dot ${allUp ? "up" : running === 0 ? "down" : "warn"}`} title={`${running}/${total} up`} />
        </div>
        <div className="section-meta">
          <span>{running}/{total} up</span>
          {project?.id && (
            <span className="stack-actions">
              <button disabled={busy} onClick={() => fire("redeploy")} title="redeploy">redeploy</button>
              {allUp
                ? <button disabled={busy} onClick={() => fire("down")}>stop</button>
                : <button disabled={busy} onClick={() => fire("up")}>start</button>}
            </span>
          )}
        </div>
      </div>
      <div className="docker-grid">
        {services.map(c => (
          <ContainerCard key={c.id} c={c} envId={envId} onAction={onAction} />
        ))}
      </div>
    </section>
  );
}

/* ── filter bar ─────────────────────────────────────────────── */

function FilterBar({ q, setQ, scope, setScope, counts }) {
  const inputRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault(); inputRef.current?.focus();
      }
      if (e.key === "Escape") inputRef.current?.blur();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="search-wrap">
      <div className="searchbar">
        <span className="q">{UI.search}</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter containers — name, image, stack…"
        />
        <div className="search-scope">
          {[
            ["all",      `all ${counts.total}`],
            ["running",  `up ${counts.up}`],
            ["stopped",  `down ${counts.down}`],
          ].map(([id, label]) => (
            <button key={id} className={scope === id ? "on" : ""} onClick={() => setScope(id)}>{label}</button>
          ))}
        </div>
        <span className="kbd">⌘K</span>
      </div>
    </div>
  );
}

/* ── page ───────────────────────────────────────────────────── */

export default function Docker() {
  const now = useClock();
  const greeting = useGreeting();
  const weather = useWeather();
  const arcane = useArcane({ poll: 15_000 });

  const [q, setQ] = useState("");
  const [scope, setScope] = useState("all");
  const [ixOpen, setIxOpen] = useState(false);

  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const onContainerAction = async (kind, id, action) => {
    try {
      await arcaneAction(arcane.envId, kind, id, action);
      setTimeout(arcane.refresh, 600);
    } catch (e) { console.warn("[arcane action]", e); }
  };
  const onProjectAction = async (projectId, action) => {
    try {
      await arcaneAction(arcane.envId, "projects", projectId, action);
      setTimeout(arcane.refresh, 1200);
    } catch (e) { console.warn("[arcane project]", e); }
  };

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return arcane.containers.filter(c => {
      if (scope === "running" && c.state !== "running") return false;
      if (scope === "stopped" && c.state === "running") return false;
      if (!n) return true;
      const hay = `${shortName(c)} ${c.image} ${projectOf(c) || ""} ${serviceOf(c) || ""}`.toLowerCase();
      return hay.includes(n);
    });
  }, [arcane.containers, q, scope]);

  const grouped = useMemo(() => {
    const map = new Map();
    const loose = [];
    for (const c of filtered) {
      const p = projectOf(c);
      if (!p) { loose.push(c); continue; }
      if (!map.has(p)) map.set(p, []);
      map.get(p).push(c);
    }
    const projectByName = new Map((arcane.projects || []).map(p => [p.name?.toLowerCase(), p]));
    const allStacks = [...map.entries()]
      .map(([name, services]) => ({
        project: projectByName.get(name.toLowerCase()) || { name, id: null },
        services: services.sort((a, b) => shortName(a).localeCompare(shortName(b))),
      }))
      .sort((a, b) => a.project.name.localeCompare(b.project.name));
    const stacks = allStacks.filter(s => !s.project.name.startsWith("ix-"));
    const ixStacks = allStacks.filter(s =>  s.project.name.startsWith("ix-"));
    return { stacks, ixStacks, loose };
  }, [filtered, arcane.projects]);

  const counts = useMemo(() => {
    const all = arcane.containers;
    const up = all.filter(c => c.state === "running").length;
    return { total: all.length, up, down: all.length - up };
  }, [arcane.containers]);

  const stateLine =
    arcane.state === "loading" ? "Connecting to Arcane…" :
    arcane.state === "error"   ? "Arcane unreachable. Check VITE_ARCANE_URL / ARCANE_API_KEY." :
    `${counts.up} of ${counts.total} containers running across ${arcane.envs.length} environment${arcane.envs.length === 1 ? "" : "s"}.`;

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 20 L12 4 L19 20" />
              <path d="M8.5 13 H15.5" />
            </svg>
          </div>
          <div className="brand-name">arylmera <span className="sub">containers · arcane</span></div>
        </div>
        <div className="topbar-right">
          <button type="button" className="nav-pill" onClick={arcane.refresh} title="refresh now">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/></svg>
            <span>refresh</span>
          </button>
          <a className="nav-pill" href="/">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 12 9-9 9 9"/><path d="M5 10v10h14V10"/></svg>
            <span>home</span>
          </a>
        </div>
      </div>

      <div className="hero">
        <div>
          <div className="greeting-eyebrow">{dateStr} · Europe/Brussels</div>
          <h1 className="greeting">{greeting}, <em>Guillaume.</em></h1>
          <p className="greeting-sub">
            {stateLine}
            {arcane.envName && (
              <> Host <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "2px 6px", background: "var(--bg-card)", border: "1px solid var(--line-soft)", borderRadius: 4, color: "var(--ink)" }}>{arcane.envName}</code>{" "}
                <span className={`status-dot ${arcane.envStatus === "online" ? "up" : "down"}`} />.
              </>
            )}
          </p>
        </div>
        <div className="hero-meta">
          <div className="hero-card">
            <div className="ico">{UI.clock}</div>
            <div>
              <div className="val">{timeStr}</div>
              <div className="lab">local time</div>
            </div>
          </div>
          <div className="hero-card">
            <div className="ico">{UI.cloud}</div>
            <div>
              <div className="val">{weather.temp}°</div>
              <div className="lab">{weather.desc}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="docker-banner">
        <div className="sum"><div className="l">Running</div><div className="v on">{counts.up}<span className="unit">/ {counts.total}</span></div></div>
        <div className="sum"><div className="l">Stopped</div><div className="v">{counts.down}<span className="unit">down</span></div></div>
        <div className="sum"><div className="l">Stacks</div><div className="v">{arcane.projects.length}<span className="unit">compose</span></div></div>
        <div className="sum"><div className="l">Images</div><div className="v">{arcane.counts.images ?? "—"}<span className="unit">cached</span></div></div>
        <div className="sum"><div className="l">Networks</div><div className="v">{arcane.counts.networks ?? "—"}<span className="unit">net</span></div></div>
        <div className="sum"><div className="l">Volumes</div><div className="v">{arcane.counts.volumes ?? "—"}<span className="unit">vol</span></div></div>
      </div>

      <FilterBar q={q} setQ={setQ} scope={scope} setScope={setScope} counts={counts} />

      {grouped.stacks.map((s, i) => (
        <Stack
          key={s.project.name}
          idx={i}
          project={s.project}
          services={s.services}
          envId={arcane.envId}
          onAction={onContainerAction}
          onProjectAction={onProjectAction}
        />
      ))}

      {grouped.ixStacks.length > 0 && (() => {
        const ixUp = grouped.ixStacks.reduce((n, s) => n + s.services.filter(c => c.state === "running").length, 0);
        const ixTot = grouped.ixStacks.reduce((n, s) => n + s.services.length, 0);
        const allUp = ixUp === ixTot;
        return (
          <section className={"section ix-section" + (ixOpen ? " is-open" : "")}>
            <button
              type="button"
              className="ix-toggle"
              onClick={() => setIxOpen(o => !o)}
              aria-expanded={ixOpen}
            >
              <span className={`status-dot ${allUp ? "up" : ixUp === 0 ? "down" : "warn"}`} />
              <span className="ix-toggle-numeral">// {String(grouped.stacks.length + 1).padStart(2, "0")}</span>
              <span className="ix-toggle-title">truenas apps</span>
              <span className="ix-toggle-badge">{grouped.ixStacks.length} stacks</span>
              <span className="ix-toggle-meta">{ixUp}/{ixTot} up · managed by ix</span>
              <span className="ix-toggle-action">{ixOpen ? "hide" : "show"}</span>
              <svg className="ix-toggle-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {ixOpen && (
              <div className="ix-children">
                {grouped.ixStacks.map((s, i) => (
                  <Stack
                    key={s.project.name}
                    idx={grouped.stacks.length + i + 1}
                    project={s.project}
                    services={s.services}
                    envId={arcane.envId}
                    onAction={onContainerAction}
                    onProjectAction={onProjectAction}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })()}

      {grouped.loose.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div className="section-title">
              <span className="numeral">// {String(grouped.stacks.length + (grouped.ixStacks.length ? 2 : 1)).padStart(2, "0")}</span>
              <h2>loose containers</h2>
            </div>
            <span className="section-meta">{grouped.loose.length} unmanaged</span>
          </div>
          <div className="docker-grid">
            {grouped.loose.map(c => (
              <ContainerCard key={c.id} c={c} envId={arcane.envId} onAction={onContainerAction} />
            ))}
          </div>
        </section>
      )}

      <div className="footbar">
        <div className="stats">
          <span><b>{counts.up}</b> running</span>
          <span><b style={{ color: "var(--status-down)" }}>{counts.down}</b> stopped</span>
          <span><b>{counts.total}</b> total</span>
          <span><b>{arcane.projects.length}</b> stacks</span>
        </div>
        <div>arylmera · containers · {now.toISOString().slice(0, 10)}</div>
      </div>
    </div>
  );
}
