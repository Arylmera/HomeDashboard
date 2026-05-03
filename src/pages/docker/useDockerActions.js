import { useEffect, useState } from 'react';
import { arcaneAction } from '../../lib/hooks.js';

/* ============================================================== *
 *  useDockerActions — wraps Arcane container/project actions,
 *  surfaces errors via a transient toast string, and refreshes
 *  the underlying dataset shortly after each call.
 * ============================================================== */
export default function useDockerActions(arcane) {
  const [actionErr, setActionErr] = useState(null);
  // Auto-flip when Arcane refuses writes (no API key / no permission).
  // Once tripped, the page hides action UI for the rest of the session.
  const [writeBlocked, setWriteBlocked] = useState(false);

  useEffect(() => {
    if (!actionErr) return;
    const t = setTimeout(() => setActionErr(null), 6000);
    return () => clearTimeout(t);
  }, [actionErr]);

  const handle = (e, label) => {
    const msg = e?.message || 'unknown error';
    if (/HTTP 40[13]/.test(msg)) {
      setWriteBlocked(true);
      setActionErr(`${label}: Arcane refused (${msg.match(/40[13]/)?.[0]}) — switching to read-only mode.`);
    } else {
      setActionErr(`${label} failed: ${msg}`);
    }
  };

  const onContainerAction = async (kind, id, action) => {
    try {
      await arcaneAction(arcane.envId, kind, id, action);
      setTimeout(arcane.refresh, 600);
    } catch (e) {
      console.warn('[arcane action]', e);
      handle(e, action);
    }
  };

  const onProjectAction = async (projectId, action) => {
    try {
      await arcaneAction(arcane.envId, 'projects', projectId, action);
      setTimeout(arcane.refresh, 1200);
    } catch (e) {
      console.warn('[arcane project]', e);
      handle(e, `stack ${action}`);
    }
  };

  return { actionErr, setActionErr, writeBlocked, onContainerAction, onProjectAction };
}
