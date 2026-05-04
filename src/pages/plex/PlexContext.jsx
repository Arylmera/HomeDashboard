import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const Ctx = createContext(null);

/* Density is owned by the global arylmera-menu store. It writes
 * data-density="comfortable"|"dense" onto <html>. We subscribe via
 * MutationObserver so this page reacts when the user flips the
 * setting from the hamburger drawer. */
function readGlobalDensity() {
  if (typeof document === 'undefined') return 'cozy';
  return document.documentElement.dataset.density === 'dense' ? 'compact' : 'cozy';
}

export function PlexProvider({ children }) {
  const [stage, setStage] = useState(null);
  const [density, setDensityState] = useState(() => readGlobalDensity());

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    const sync = () => setDensityState(readGlobalDensity());
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ['data-density'] });
    return () => mo.disconnect();
  }, []);

  const toggleStage = useCallback((s) => {
    setStage((prev) => (prev === s ? null : s));
  }, []);

  useEffect(() => {
    if (!stage) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setStage(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage]);

  const value = useMemo(() => ({ stage, setStage, toggleStage, density }), [stage, toggleStage, density]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlexUI() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlexUI must be used inside <PlexProvider>');
  return v;
}

export const SERVICE_STAGE = {
  seerr: 'request',
  prowlarr: 'index',
  sonarr: 'acquire',
  radarr: 'acquire',
  lidarr: 'acquire',
  qui: 'download',
  qbittorrent: 'download',
  plex: 'serve',
  audiobookshelf: 'serve',
  tautulli: 'monitor',
};
