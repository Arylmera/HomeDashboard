/* ============================================================== *
 *  TasksCard — open VTODOs from one iCloud Reminders list.
 *  Read-only.
 * ============================================================== */
import { useReminders } from '../../../lib/hooks.js';

function fmtDue(d) {
  if (!d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const due = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((due - today) / (24 * 60 * 60 * 1000));
  if (diff < 0)   return `${Math.abs(diff)}d late`;
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff < 7)   return `${diff}d`;
  return d.toLocaleDateString([], { day: "numeric", month: "short" }).toLowerCase();
}

export default function TasksCard() {
  const { todos, openCount, state } = useReminders();

  const visible = todos.slice(0, 8);

  return (
    <div className="panel tasks-panel">
      <div className="panel-head">
        <div className="panel-title"><span className="numeral">// tasks</span>Tasks</div>
        <div className="panel-meta">
          {state === "idle"  && <span>not configured</span>}
          {state === "error" && <span className="meta-err">offline</span>}
          {state === "live"  && <span>{openCount} open</span>}
        </div>
      </div>

      {state === "idle" && (
        <p className="cal-empty">Set <code>ICLOUD_REMINDERS</code> to surface a Reminders list here.</p>
      )}
      {state === "live" && visible.length === 0 && (
        <p className="cal-empty">Nothing to do. Nice.</p>
      )}

      <ul className="tasks-list">
        {visible.map(t => (
          <li className="tasks-item" key={t.uid || t.title}>
            <span className="tasks-title">{t.title}</span>
            {t.due && <span className={`tasks-due ${t.due < new Date() ? "late" : ""}`}>{fmtDue(t.due)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
