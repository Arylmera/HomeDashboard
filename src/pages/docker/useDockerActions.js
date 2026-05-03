import { useEffect, useState } from 'react';
import { arcaneAction } from '../../lib/hooks.js';

/* ============================================================== *
 *  useDockerActions — wraps Arcane container/project actions,
 *  surfaces errors via a transient toast string, and refreshes
 *  the underlying dataset shortly after each call.
 * ============================================================== */
export default function useDockerActions(arcane) {
  const [actionErr, setActionErr] = useState(null);

  useEffect(() => {
    if (!actionErr) return;
    const t = setTimeout(() => setActionErr(null), 6000);
    return () => clearTimeout(t);
  }, [actionErr]);

  const onContainerAction = async (kind, id, action) => {
    try {
      await arcaneAction(arcane.envId, kind, id, action);
      setTimeout(arcane.refresh, 600);
    } catch (e) {
      console.warn('[arcane action]', e);
      setActionErr(`${action} failed: ${e?.message || 'unknown error'}`);
    }
  };

  const onProjectAction = async (projectId, action) => {
    try {
      await arcaneAction(arcane.envId, 'projects', projectId, action);
      setTimeout(arcane.refresh, 1200);
    } catch (e) {
      console.warn('[arcane project]', e);
      setActionErr(`stack ${action} failed: ${e?.message || 'unknown error'}`);
    }
  };

  return { actionErr, setActionErr, onContainerAction, onProjectAction };
}
