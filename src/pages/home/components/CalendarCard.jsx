/* ============================================================== *
 *  CalendarCard — today + next 7 days from iCloud CalDAV.
 *
 *  Rendered as a `.panel` so it sits flush with NetworkPanel /
 *  NASPanel. Groups events into "today", "tomorrow", and "this
 *  week". States:
 *    state === "idle"  →  no calendar configured (env empty)
 *    state === "error" →  fetch / parse failed
 *    state === "live"  →  rendered list (may be empty)
 * ============================================================== */
import { useCalendar } from '../../../lib/hooks.js';

const DAY = 24 * 60 * 60 * 1000;

function bucket(d) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t < start + DAY)        return "today";
  if (t < start + 2 * DAY)    return "tomorrow";
  return "later";
}

function fmtTime(d, allDay) {
  if (allDay) return "all day";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDay(d) {
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }).toLowerCase();
}

export default function CalendarCard() {
  const { events, state } = useCalendar();

  const groups = { today: [], tomorrow: [], later: [] };
  for (const ev of events) groups[bucket(ev.start)].push(ev);

  return (
    <div className="panel cal-panel">
      <div className="panel-head">
        <div className="panel-title"><span className="numeral">// cal</span>Calendar</div>
        <div className="panel-meta">
          {state === "idle"  && <span>not configured</span>}
          {state === "error" && <span className="meta-err">offline</span>}
          {state === "live"  && <span>{events.length} · 7 days</span>}
        </div>
      </div>

      {state === "idle" && (
        <p className="cal-empty">Set <code>ICLOUD_USER</code>, <code>ICLOUD_APP_PASSWORD</code>, and <code>ICLOUD_CALENDAR</code> (use <code>*</code> for every calendar) to surface events here.</p>
      )}
      {state === "live" && events.length === 0 && (
        <p className="cal-empty">Nothing on the calendar this week.</p>
      )}

      {(["today", "tomorrow", "later"]).map(key => groups[key].length > 0 && (
        <div className="cal-group" key={key}>
          <div className="cal-group-label">{key}</div>
          <ul className="cal-list">
            {groups[key].map(ev => (
              <li className="cal-item" key={`${ev.uid || ev.title}-${ev.start.getTime()}`}>
                <span className="cal-when">
                  {key === "later" ? fmtDay(ev.start) : fmtTime(ev.start, ev.allDay)}
                </span>
                <span className="cal-title">{ev.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
