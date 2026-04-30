import { useEffect, useState } from 'react';

/* Polls Homey OAuth status every 60s. */
export function useHomeyAuth() {
  const [s, setS] = useState({ authenticated: false, configured: false, expires_at: null });
  useEffect(() => {
    let alive = true;
    const run = () => fetch('/api/homey/oauth/status')
      .then(r => r.json())
      .then(j => { if (alive) setS(j); })
      .catch(() => {});
    run();
    const id = setInterval(run, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return s;
}
