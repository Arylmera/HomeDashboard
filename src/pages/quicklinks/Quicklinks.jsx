/* ============================================================== *
 *  Quicklinks — full service directory.
 *  Every service from src/lib/services.js as a card, grouped into
 *  categories, with global Cmd-K / `/` search and a status footer.
 * ============================================================== */
import { useState, useMemo, useRef, useEffect } from 'react';
import { ICONS, UI } from '../../lib/icons.jsx';
import { SECTIONS, ALL_SERVICES } from '../../lib/services.js';
import { useClock, useGreeting, useWeather } from '../../lib/hooks.js';
import { usePrefs } from '../../lib/usePrefs.js';
import { useHealth } from '../../lib/useHealth.js';

function Mark({ id }) {
  const def = ICONS[id];
  if (!def) return <span style={{ color: "var(--ink-faint)", fontFamily: "var(--font-mono)", fontSize: 11 }}>?</span>;
  return def.svg;
}

function ServiceCard({ s, editing, disabled, onToggle, status }) {
  const cls = "qlinks-card "
    + (s.featured ? "featured " : "")
    + (editing ? "editing " : "")
    + (disabled ? "disabled" : "");
  const live = status || s.status;

  if (editing) {
    return (
      <button type="button" className={cls} onClick={() => onToggle(s.id)} title={`${disabled ? "hidden" : "visible"} · click to toggle`}>
        <div className="qlinks-card-ico"><Mark id={s.icon} /></div>
        <div className="qlinks-card-body">
          <div className="qlinks-card-title">
            {s.name}
            <span className={`status-dot ${live}`} title={live} />
          </div>
          <div className="qlinks-card-desc">{s.desc}</div>
        </div>
        <span className="qlinks-card-arrow">{disabled ? "○" : "●"}</span>
      </button>
    );
  }

  return (
    <a className={cls}
       href={s.url} target="_blank" rel="noopener noreferrer" title={`${s.name} · ${s.url}`}>
      <div className="qlinks-card-ico"><Mark id={s.icon} /></div>
      <div className="qlinks-card-body">
        <div className="qlinks-card-title">
          {s.name}
          <span className={`status-dot ${live}`} title={live} />
        </div>
        <div className="qlinks-card-desc">{s.desc}</div>
      </div>
      <span className="qlinks-card-arrow">{UI.arrow}</span>
    </a>
  );
}

function Section({ s, editing, disabledSet, onToggle, live }) {
  const visible = editing ? s.services : s.services.filter(svc => !disabledSet.has(svc.id));
  if (!visible.length) return null;
  return (
    <section className="section" id={`sec-${s.id}`}>
      <div className="section-head">
        <div className="section-title">
          <span className="numeral">// {s.numeral}</span>
          <h2>{s.title}</h2>
        </div>
        <span className="section-meta">{s.meta} · {visible.length} svc</span>
      </div>
      <div className="qlinks-grid">
        {visible.map((svc) => (
          <ServiceCard key={svc.id} s={svc}
            editing={editing}
            disabled={disabledSet.has(svc.id)}
            onToggle={onToggle}
            status={live[svc.id]} />
        ))}
      </div>
    </section>
  );
}

function SearchBar({ disabledSet }) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState("svc");
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);

  const matches = useMemo(() => {
    if (!q.trim()) return [];
    const n = q.toLowerCase();
    return ALL_SERVICES.filter(s =>
      !disabledSet.has(s.id) && (
        s.name.toLowerCase().includes(n) ||
        s.id.includes(n) ||
        s.desc.toLowerCase().includes(n)
      )
    ).slice(0, 8);
  }, [q, disabledSet]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") inputRef.current?.blur();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = () => {
    if (scope === "web") {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank");
    } else if (matches[idx]) {
      window.open(matches[idx].url, "_blank");
    }
  };

  return (
    <div className="search-wrap">
      <div className="searchbar">
        <span className="q">{UI.search}</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setIdx(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(i + 1, matches.length - 1)); }
            if (e.key === "ArrowUp")   { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
            if (e.key === "Enter")     submit();
          }}
          placeholder={scope === "web" ? "Search the web…" : "Jump to a service — try sonarr, pihole, plex…"}
        />
        <div className="search-scope">
          <button className={scope === "svc" ? "on" : ""} onClick={() => setScope("svc")}>SVC</button>
          <button className={scope === "web" ? "on" : ""} onClick={() => setScope("web")}>WEB</button>
        </div>
        <span className="kbd">⌘K</span>
      </div>
      {open && (q.trim() || scope === "web") && (
        <div className="search-results" onMouseDown={(e) => e.preventDefault()}>
          {scope === "svc" && matches.length > 0 && matches.map((s, i) => (
            <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
               className={"row " + (i === idx ? "active" : "")}>
              <div className="qlinks-card-ico" style={{ width: 28, height: 28 }}><Mark id={s.icon} /></div>
              <div>
                <div className="name">{s.name}</div>
                <div className="desc">{s.desc}</div>
              </div>
              <span className="cat">{s.section}</span>
            </a>
          ))}
          {scope === "svc" && q.trim() && matches.length === 0 && (
            <div className="search-empty">No service matches <b style={{ color: "var(--ink)" }}>{q}</b></div>
          )}
          <div className="search-google" onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(q || "")}`, "_blank")}>
            <span style={{ width: 18, height: 18, display: "inline-flex" }}>{UI.google}</span>
            <span>Search Google for <b style={{ color: "var(--ink)" }}>{q || "…"}</b></span>
            <span style={{ marginLeft: "auto" }} className="kbd">↵</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Quicklinks() {
  const now = useClock();
  const greeting = useGreeting();
  const weather = useWeather();

  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const [disabled, setDisabled] = usePrefs('quicklinks.disabled', []);
  const [editing, setEditing] = useState(false);
  const disabledSet = useMemo(() => new Set(disabled), [disabled]);
  const live = useHealth();

  const onToggle = (id) => {
    const next = disabledSet.has(id)
      ? disabled.filter(x => x !== id)
      : [...disabled, id];
    setDisabled(next);
  };

  const counts = useMemo(() => {
    const visible = ALL_SERVICES.filter(s => !disabledSet.has(s.id));
    const stat = (s) => live[s.id] || s.status;
    const up   = visible.filter(s => stat(s) === "up").length;
    const warn = visible.filter(s => stat(s) === "warn").length;
    const down = visible.filter(s => { const x = stat(s); return x === "down" || x === "off"; }).length;
    return { total: visible.length, up, warn, down, hidden: ALL_SERVICES.length - visible.length };
  }, [disabledSet, live]);

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
          <div className="brand-name">arylmera <span className="sub">directory · hera</span></div>
        </div>
        <div className="topbar-right">
          <button type="button" className={"nav-pill" + (editing ? " on" : "")} onClick={() => setEditing(e => !e)} title="toggle which services to show">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>
            <span>{editing ? "done" : "edit"}</span>
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
            {counts.up} of {counts.total} services online on <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "2px 6px", background: "var(--bg-card)", border: "1px solid var(--line-soft)", borderRadius: 4, color: "var(--ink)" }}>192.168.1.100</code>.
            All reverse-proxied through Nginx at <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "2px 6px", background: "var(--bg-card)", border: "1px solid var(--line-soft)", borderRadius: 4, color: "var(--ink)" }}>*.arylmera.duckdns.org</code>.
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

      <SearchBar disabledSet={disabledSet} />

      {SECTIONS.map((s) => (
        <Section key={s.id} s={s} editing={editing} disabledSet={disabledSet} onToggle={onToggle} live={live} />
      ))}

      <div className="footbar">
        <div className="stats">
          <span><b>{counts.up}</b> up</span>
          <span><b style={{ color: "var(--status-warn)" }}>{counts.warn}</b> warn</span>
          <span><b style={{ color: "var(--status-down)" }}>{counts.down}</b> offline</span>
          <span><b>{counts.total}</b> total services</span>
        </div>
        <div>arylmera · directory · {now.toISOString().slice(0, 10)}</div>
      </div>
    </div>
  );
}
