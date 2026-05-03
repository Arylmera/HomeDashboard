import { usePolling } from './usePolling.js';
import { getJson } from './_fetcher.js';

/* Calendar (iCloud CalDAV via /api/icloud/events).
 * Server-side middleware (src/server/icloud.js) handles CalDAV
 * discovery + REPORT and returns parsed JSON. State "idle" means the
 * env (ICLOUD_USER / ICLOUD_APP_PASSWORD / ICLOUD_CALENDAR) is not
 * configured. We forward the server's `state` verbatim so UIs can
 * distinguish "not set up" from "live empty" from "error". */
export function useCalendar({ poll = 5 * 60_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const j = await getJson('/api/icloud/events', { signal });
      if (j.state !== 'live') {
        const err = new Error(j.error || j.state || 'icloud_unavailable');
        err.serverState = j.state;
        throw err;
      }
      return (j.events || []).map((e) => ({
        ...e,
        start: new Date(e.start),
        end: e.end ? new Date(e.end) : null,
      }));
    },
    { poll }
  );
  return { events: data ?? [], state };
}

// Reminders (iCloud VTODO via /api/icloud/todos). Read-only.
export function useReminders({ poll = 2 * 60_000 } = {}) {
  const { data, state } = usePolling(
    async (signal) => {
      const j = await getJson('/api/icloud/todos', { signal });
      if (j.state !== 'live') {
        const err = new Error(j.error || j.state || 'icloud_unavailable');
        err.serverState = j.state;
        throw err;
      }
      return (j.todos || []).map((t) => ({
        ...t,
        due: t.due ? new Date(t.due) : null,
      }));
    },
    { poll }
  );
  return { todos: data ?? [], openCount: data?.length ?? 0, state };
}
