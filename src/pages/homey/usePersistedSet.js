import { useCallback, useState } from 'react';

/* localStorage-backed Set<string> with a stable toggle handler. */
export function usePersistedSet(storageKey) {
  const [set, setSet] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) || "[]")); }
    catch { return new Set(); }
  });
  const toggle = useCallback((id) => {
    setSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [storageKey]);
  return [set, toggle];
}
