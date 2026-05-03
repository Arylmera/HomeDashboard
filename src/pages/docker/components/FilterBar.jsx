import { useRef, useEffect } from 'react';
import { UI } from '../../../lib/icons.jsx';

export default function FilterBar({ q, setQ, scope, setScope, counts }) {
  const inputRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault(); inputRef.current?.focus();
      }
      if (e.key === 'Escape') inputRef.current?.blur();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const showMatch = q.trim().length > 0;

  return (
    <div className="search-wrap">
      <div className="searchbar">
        <span className="q">{UI.search}</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="filter… try `down`, `image:nginx`, `port:8080`, `stack:media`"
        />
        {showMatch && (
          <span className="search-match" title="containers matching the current filter">
            <b>{counts.matched}</b>/{counts.total}
          </span>
        )}
        <div className="search-scope">
          {[
            ['all',     `all ${counts.total}`],
            ['running', `up ${counts.up}`],
            ['stopped', `down ${counts.down}`],
          ].map(([id, label]) => (
            <button key={id} className={scope === id ? 'on' : ''} onClick={() => setScope(id)}>{label}</button>
          ))}
        </div>
        <span className="kbd">⌘K</span>
      </div>
    </div>
  );
}
