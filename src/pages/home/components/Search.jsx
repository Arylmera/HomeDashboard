import { useState, useEffect, useMemo, useRef } from 'react';
import { ALL_SERVICES } from '../../../lib/services.js';
import { clamp } from '../../../lib/format.js';
import { PAGES } from '../pages.jsx';
import Mark from './Mark.jsx';

export default function Search() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const needle = q.toLowerCase();
    const pages = PAGES.map(p => ({ ...p, _kind: "page" }))
      .filter(p => p.name.toLowerCase().includes(needle) || p.desc.toLowerCase().includes(needle));
    const svcs = ALL_SERVICES.filter(s =>
      s.name.toLowerCase().includes(needle) ||
      s.desc.toLowerCase().includes(needle) ||
      s.section.toLowerCase().includes(needle)
    ).map(s => ({ ...s, _kind: "service" }));
    return [...pages, ...svcs].slice(0, 8);
  }, [q]);

  return (
    <div className="search-wrap">
      <div className="searchbar">
        <svg className="q" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        <input
          ref={ref}
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => clamp(a + 1, 0, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => clamp(a - 1, 0, results.length - 1)); }
            else if (e.key === "Enter" && results[active]) {
              const r = results[active];
              window.location.href = r._kind === "page" ? r.href : r.url;
            }
          }}
          placeholder="Search pages, services, anything…"
        />
        <span className="kbd">⌘K</span>
      </div>
      {q && (
        <div className="search-results">
          {results.length === 0 && <div className="search-empty">No matches</div>}
          {results.map((r, i) => (
            <a
              key={`${r._kind}-${r.id}`}
              className={`row ${i === active ? "active" : ""}`}
              href={r._kind === "page" ? r.href : r.url}
              target={r._kind === "service" ? "_blank" : undefined}
              rel={r._kind === "service" ? "noopener noreferrer" : undefined}
              onMouseEnter={() => setActive(i)}
            >
              <div className="qa-ico"><Mark id={r.icon} /></div>
              <div>
                <div className="name">{r.name}</div>
                <div className="desc">{r.desc}</div>
              </div>
              <div className="cat">{r._kind === "page" ? "page" : r.section}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
