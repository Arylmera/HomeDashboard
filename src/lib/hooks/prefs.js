import { useEffect, useState, useCallback } from 'react';

/* Server-backed prefs hook (SQLite via /api/prefs/:key).
 * Optimistic updates + localStorage fallback so the UI never blocks on the API. */
export function usePrefs(key, fallback) {
  const lsKey = `prefs:${key}`;
  const [value, setValue] = useState(() => readPref(key, fallback));
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

  /* React to in-tab pref writes from outside React (e.g. vanilla drawer). */
  useEffect(() => {
    const onChange = (e) => {
      if (e?.detail?.key === key) setValue(e.detail.value);
    };
    window.addEventListener('prefs-changed', onChange);
    return () => window.removeEventListener('prefs-changed', onChange);
  }, [key]);

  const save = useCallback((next) => {
    setValue(next);
    writePref(key, next);
  }, [key]);

  return [value, save, loaded];
}

/* Write a pref from anywhere (React or vanilla). Persists localStorage + server,
 * and dispatches a window event so any usePrefs mounted on the same key updates. */
export function writePref(key, value) {
  const lsKey = `prefs:${key}`;
  try { localStorage.setItem(lsKey, JSON.stringify(value)); } catch {}
  fetch(`/api/prefs/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  }).catch(() => {});
  try { window.dispatchEvent(new CustomEvent('prefs-changed', { detail: { key, value } })); } catch {}
}

export function readPref(key, fallback) {
  try { const raw = localStorage.getItem(`prefs:${key}`); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
