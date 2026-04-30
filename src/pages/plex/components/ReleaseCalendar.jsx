import { useMemo, useState } from 'react';
import { WEEKDAYS, MONTHS, dayKey, buildMonthGrid } from '../calendar.js';

export function ReleaseCalendar({ upcoming }) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const byDay = useMemo(() => {
    const m = new Map();
    for (const u of upcoming) {
      const k = dayKey(new Date(u.when));
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(u);
    }
    return m;
  }, [upcoming]);
  const todayKey = dayKey(today);
  const monthLabel = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  const shiftMonth = (n) => setCursor(c => new Date(c.getFullYear(), c.getMonth() + n, 1));

  if (upcoming.length === 0) {
    return (
      <>
        <SectionTitle count={0} />
        <div className="empty-state">
          No upcoming items. Wire <code>VITE_SONARR_URL</code> and <code>VITE_RADARR_URL</code> to populate.
        </div>
      </>
    );
  }

  return (
    <>
      <SectionTitle count={upcoming.length} />
      <div className="cal-month">
        <div className="cal-toolbar">
          <button className="cal-nav" onClick={() => shiftMonth(-1)} aria-label="previous month">‹</button>
          <div className="cal-label">{monthLabel}</div>
          <button className="cal-nav" onClick={() => shiftMonth(1)} aria-label="next month">›</button>
          <button className="cal-today" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>today</button>
        </div>
        <div className="cal-weekdays">
          {WEEKDAYS.map(w => <div key={w} className="cal-wd">{w}</div>)}
        </div>
        <div className="cal-grid">
          {grid.map((d) => {
            const k = dayKey(d);
            const items = byDay.get(k) || [];
            const otherMonth = d.getMonth() !== cursor.getMonth();
            const isToday = k === todayKey;
            return (
              <div key={k} className={`cal-cell${otherMonth ? ' muted' : ''}${isToday ? ' today' : ''}`}>
                <div className="cal-cell-date">{d.getDate()}</div>
                <div className="cal-cell-items">
                  {items.map((u, i) => {
                    const rawEp = u.kind === 'sonarr' ? u.sub.split(' · ').slice(1).join(' · ') : null;
                    const epTitle = rawEp && rawEp.toUpperCase() !== 'TBA' ? rawEp : null;
                    return (
                      <div key={`${u.kind}-${i}`} className={`cal-pill ${u.kind}`} title={`${u.title} — ${u.sub}`}>
                        <span className="dot" />
                        <span className="body">
                          <span className="t">{u.title}</span>
                          {epTitle && <span className="ep">{epTitle}</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function SectionTitle({ count }) {
  return (
    <div className="nas-section-title">
      <span className="numeral">04 · upcoming</span>
      <h2>Release calendar</h2>
      <span className="meta">{count} releases · sonarr + radarr</span>
    </div>
  );
}
