import { useEffect, useState, useCallback } from 'react';

/**
 * Server-backed prefs hook (SQLite via /api/prefs/:key).
 * Optimistic updates + localStorage fallback so the UI never blocks on the API.
 */
export function usePrefs(key, fallback) {
  const lsKey = `prefs:${key}`;
  const [value, setValue] = useState(() => {
    try { const raw = localStorage.getItem(lsKey); return raw ? JSON.parse(raw) : fallback; }
    catch { return fallback; }
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/prefs/${encodeURIComponent(key)}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!alive) return;
        if (j && j.value != null) {
          setValue(j.value);
          try { localStorage.setItem(lsKey, JSON.stringify(j.value)); } catch {}
        }
        setLoaded(true);
      })
      .catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [key]);

  const save = useCallback((next) => {
    setValue(next);
    try { localStorage.setItem(lsKey, JSON.stringify(next)); } catch {}
    fetch(`/api/prefs/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: next }),
    }).catch(() => {});
  }, [key, lsKey]);

  return [value, save, loaded];
}
