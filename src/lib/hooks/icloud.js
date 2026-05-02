import { useState, useEffect } from 'react';

/* Calendar (iCloud CalDAV via /api/icloud/events).
 * Server-side middleware (src/server/icloud.js) handles CalDAV
 * discovery + REPORT and returns parsed JSON. State "idle" means
 * the env (ICLOUD_USER / ICLOUD_APP_PASSWORD / ICLOUD_CALENDAR)
 * is not configured. */
export function useCalendar({ poll = 5 * 60_000 } = {}) {
  const [data, setData] = useState({ events: [], state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await fetch("/api/icloud/events");
        const j = await r.json();
        if (!alive) return;
        if (j.state !== "live") { setData({ events: [], state: j.state || "error" }); return; }
        const events = (j.events || []).map(e => ({
          ...e,
          start: new Date(e.start),
          end: e.end ? new Date(e.end) : null,
        }));
        setData({ events, state: "live" });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}

// Reminders (iCloud VTODO via /api/icloud/todos). Read-only.
export function useReminders({ poll = 2 * 60_000 } = {}) {
  const [data, setData] = useState({ todos: [], openCount: 0, state: "loading" });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await fetch("/api/icloud/todos");
        const j = await r.json();
        if (!alive) return;
        if (j.state !== "live") { setData({ todos: [], openCount: 0, state: j.state || "error" }); return; }
        const todos = (j.todos || []).map(t => ({
          ...t,
          due: t.due ? new Date(t.due) : null,
        }));
        setData({ todos, openCount: todos.length, state: "live" });
      } catch { if (alive) setData(d => ({ ...d, state: "error" })); }
    };
    run();
    const id = setInterval(run, poll);
    return () => { alive = false; clearInterval(id); };
  }, [poll]);
  return data;
}
