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
import { QUICK_APP_IDS } from '../home/pages.jsx';

const STATUS_LABEL = { up: "online", warn: "degraded", down: "offline", off: "status unknown" };
const statusText = (s) => STATUS_LABEL[s] || "status unknown";

function Mark({ id }) {
  const def = ICONS[id];
  if (!def) return <span style={{ color: "var(--ink-faint)", fontFamily: "var(--font-mono)", fontSize: 11 }}>?</span>;
  return def.svg;
}

function ServiceCard({ s, editing, disabled, pinned, onToggle, onTogglePin, status }) {
  const cls = "qlinks-card "
    + (s.featured ? "featured " : "")
    + (editing ? "editing " : "")
    + (pinned && editing ? "pinned " : "")
    + (disabled ? "disabled" : "");
  const live = status || s.status;

  if (editing) {
    return (
      <div className={cls}>
        <div className="qlinks-card-ico"><Mark id={s.icon} /></div>
        <div className="qlinks-card-body">
          <div className="qlinks-card-title">
            <span className="qlinks-name">{s.name}</span>
            <span className={`status-dot ${live}`} role="img" aria-label={`status: ${statusText(live)}`} title={statusText(live)} />
          </div>
          <div className="qlinks-card-desc">{s.desc}</div>
        </div>
        <div className="qlinks-card-edit-actions">
          <button type="button" className={"qlinks-card-pin" + (pinned ? " on" : "")}
                  onClick={() => onTogglePin(s.id)}
                  aria-label={pinned ? `unpin ${s.name} from home` : `pin ${s.name} to home`}
                  title={pinned ? "pinned to home. click to unpin." : "click to pin to home."}>
            {pinned ? "★" : "☆"}
          </button>
          <button type="button" className="qlinks-card-arrow"
                  onClick={() => onToggle(s.id)}
                  aria-label={disabled ? `show ${s.name}` : `hide ${s.name}`}
                  title={disabled ? "hidden. click to show again." : "showing. click to hide."}>
            {disabled ? "○" : "●"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <a className={cls}
       href={s.url} target="_blank" rel="noopener noreferrer"
       aria-label={`${s.name}, ${statusText(live)}, opens ${s.url} in a new tab`}
       title={`${s.name} · ${statusText(live)} · ${s.url}`}>
      <div className="qlinks-card-ico"><Mark id={s.icon} /></div>
      <div className="qlinks-card-body">
        <div className="qlinks-card-title">
          {s.name}
          <span className={`status-dot ${live}`} role="img" aria-label={`status: ${statusText(live)}`} title={statusText(live)} />
        </div>
        <div className="qlinks-card-desc">{s.desc}</div>
      </div>
      <span className="qlinks-card-arrow">{UI.arrow}</span>
    </a>
  );
}

function Section({ s, editing, disabledSet, pinnedSet, onToggle, onTogglePin, live }) {
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
            pinned={pinnedSet.has(svc.id)}
            onToggle={onToggle}
            onTogglePin={onTogglePin}
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
          placeholder={scope === "web" ? "Search the web…" : "Jump to a service. Try sonarr, pihole, plex…"}
          aria-label={scope === "web" ? "search the web" : "search services"}
        />
        <div className="search-scope" role="tablist" aria-label="search scope">
          <button role="tab" aria-selected={scope === "svc"} aria-label="search services" title="search services on this network"
                  className={scope === "svc" ? "on" : ""} onClick={() => setScope("svc")}>SVC</button>
          <button role="tab" aria-selected={scope === "web"} aria-label="search the web" title="search the web with Google"
                  className={scope === "web" ? "on" : ""} onClick={() => setScope("web")}>WEB</button>
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
            <div className="search-empty">
              Nothing matched <b style={{ color: "var(--ink)" }}>{q}</b>. Try a shorter name, or switch to <b style={{ color: "var(--ink)" }}>WEB</b> to search the web.
            </div>
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
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [dateStr]);

  const [disabled, setDisabled] = usePrefs('quicklinks.disabled', []);
  const [pinned, setPinned] = usePrefs('quicklinks.pinned', QUICK_APP_IDS);
  const [editing, setEditing] = useState(false);
  const [recentlyHidden, setRecentlyHidden] = useState(null);
  const disabledSet = useMemo(() => new Set(disabled), [disabled]);
  const pinnedSet = useMemo(() => new Set(pinned || []), [pinned]);
  const live = useHealth();

  useEffect(() => {
    if (!recentlyHidden) return;
    const t = setTimeout(() => setRecentlyHidden(null), 6000);
    return () => clearTimeout(t);
  }, [recentlyHidden]);

  const onToggle = (id) => {
    if (disabledSet.has(id)) {
      setDisabled(disabled.filter(x => x !== id));
      setRecentlyHidden(null);
    } else {
      const svc = ALL_SERVICES.find(s => s.id === id);
      setDisabled([...disabled, id]);
      setRecentlyHidden({ id, name: svc?.name || id });
    }
  };

  const undoHide = () => {
    if (!recentlyHidden) return;
    setDisabled(disabled.filter(x => x !== recentlyHidden.id));
    setRecentlyHidden(null);
  };

  const onTogglePin = (id) => {
    const list = pinned || [];
    const next = pinnedSet.has(id) ? list.filter(x => x !== id) : [...list, id];
    setPinned(next);
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
          <button type="button" className={"nav-pill" + (editing ? " on" : "")}
                  onClick={() => setEditing(e => !e)}
                  aria-pressed={editing}
                  title={editing ? "finish editing." : "edit which services show, and pin favorites to home."}>
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
          <p className="greeting-sub qlinks-hero-status">
            <span><b>{counts.up}</b> of <b>{counts.total}</b> online</span>
            <span className="sep">·</span>
            <code>192.168.1.100</code>
            <span className="sep">·</span>
            <code>*.arylmera.duckdns.org</code>
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

      {!editing && counts.total === 0 && (
        <div className="qlinks-empty" role="status">
          <div className="qlinks-empty-title">Nothing to show.</div>
          <div className="qlinks-empty-sub">
            All {ALL_SERVICES.length} services are hidden. Tap <b>edit</b> above to bring some back.
          </div>
        </div>
      )}

      {SECTIONS.map((s) => (
        <Section key={s.id} s={s} editing={editing}
                 disabledSet={disabledSet} pinnedSet={pinnedSet}
                 onToggle={onToggle} onTogglePin={onTogglePin} live={live} />
      ))}

      {recentlyHidden && (
        <div className="qlinks-undo" role="status" aria-live="polite">
          <span><b>{recentlyHidden.name}</b> hidden.</span>
          <button type="button" onClick={undoHide} aria-label={`undo. show ${recentlyHidden.name} again`}>
            undo
          </button>
        </div>
      )}

      <div className="footbar" role="status" aria-live="polite">
        <div className="stats">
          <span aria-label={`${counts.up} services online`}>
            <span className="status-dot up" role="img" aria-hidden="true" style={{ display: "inline-block", marginRight: 6, verticalAlign: "middle" }} />
            <b>{counts.up}</b> online
          </span>
          <span aria-label={`${counts.warn} services degraded`}>
            <span className="status-dot warn" role="img" aria-hidden="true" style={{ display: "inline-block", marginRight: 6, verticalAlign: "middle" }} />
            <b style={{ color: "var(--status-warn)" }}>{counts.warn}</b> degraded
          </span>
          <span aria-label={`${counts.down} services offline`}>
            <span className="status-dot down" role="img" aria-hidden="true" style={{ display: "inline-block", marginRight: 6, verticalAlign: "middle" }} />
            <b style={{ color: "var(--status-down)" }}>{counts.down}</b> offline
          </span>
          <span aria-label={`${counts.total} services total`}><b>{counts.total}</b> total</span>
        </div>
        <div>arylmera · directory · {todayISO}</div>
      </div>
    </div>
  );
}
