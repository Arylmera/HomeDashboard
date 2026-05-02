import { useState, useEffect } from 'react';

export function useNextcloud({ poll = 5 * 60_000 } = {}) {
  const [data, setData] = useState({ info: null, state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await fetch("/api/nextcloud/ocs/v1.php/cloud/user?format=json", {
          headers: { "OCS-APIRequest": "true", Accept: "application/json" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!alive) return;
        setData({ info: j?.ocs?.data ?? null, state: "live" });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}
