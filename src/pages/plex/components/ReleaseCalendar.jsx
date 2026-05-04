import { useMemo, useState } from 'react';
import { WEEKDAYS, MONTHS, dayKey, buildMonthGrid } from '../calendar.js';

const VIEWS = ['day', 'week', 'month'];

function startOfWeek(d) {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - offset);
  return out;
}

function buildWeek(d) {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return x;
  });
}

function fmtRange(view, cursor) {
  if (view === 'day') {
    return cursor.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (view === 'week') {
    const week = buildWeek(cursor);
    const a = week[0], b = week[6];
    const sameMonth = a.getMonth() === b.getMonth();
    const left = a.toLocaleDateString(undefined, { day: 'numeric', month: sameMonth ? undefined : 'short' });
    const right = b.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${left} – ${right}`;
  }
  return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
}

export function ReleaseCalendar({ upcoming }) {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState('week');
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));

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

  const shift = (n) => setCursor(c => {
    const out = new Date(c);
    if (view === 'day') out.setDate(out.getDate() + n);
    else if (view === 'week') out.setDate(out.getDate() + n * 7);
    else out.setMonth(out.getMonth() + n);
    return out;
  });
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

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
          <button className="cal-nav" onClick={() => shift(-1)} aria-label={`previous ${view}`}>‹</button>
          <div className="cal-label">{fmtRange(view, cursor)}</div>
          <button className="cal-nav" onClick={() => shift(1)} aria-label={`next ${view}`}>›</button>
          <div className="cal-views" role="tablist" aria-label="calendar view">
            {VIEWS.map(v => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                className={`cal-view${view === v ? ' active' : ''}`}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <button className="cal-today" onClick={goToday}>today</button>
        </div>
        {view === 'month' && <MonthView cursor={cursor} byDay={byDay} todayKey={todayKey} />}
        {view === 'week' && <WeekView cursor={cursor} byDay={byDay} todayKey={todayKey} />}
        {view === 'day' && <DayView cursor={cursor} byDay={byDay} todayKey={todayKey} />}
      </div>
    </>
  );
}

function MonthView({ cursor, byDay, todayKey }) {
  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  return (
    <>
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
                {items.map((u, i) => <Pill key={`${u.kind}-${i}`} u={u} />)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function WeekView({ cursor, byDay, todayKey }) {
  const week = useMemo(() => buildWeek(cursor), [cursor]);
  return (
    <>
      <div className="cal-weekdays">
        {WEEKDAYS.map(w => <div key={w} className="cal-wd">{w}</div>)}
      </div>
      <div className="cal-grid cal-grid-week">
        {week.map(d => {
          const k = dayKey(d);
          const items = byDay.get(k) || [];
          const isToday = k === todayKey;
          return (
            <div key={k} className={`cal-cell${isToday ? ' today' : ''}`}>
              <div className="cal-cell-date">{d.getDate()}</div>
              <div className="cal-cell-items">
                {items.map((u, i) => <Pill key={`${u.kind}-${i}`} u={u} />)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function DayView({ cursor, byDay, todayKey }) {
  const k = dayKey(cursor);
  const items = byDay.get(k) || [];
  const isToday = k === todayKey;
  return (
    <div className={`cal-day${isToday ? ' today' : ''}`}>
      {items.length === 0 ? (
        <div className="cal-day-empty">Nothing scheduled for this day.</div>
      ) : (
        <div className="cal-day-items">
          {items.map((u, i) => <Pill key={`${u.kind}-${i}`} u={u} large />)}
        </div>
      )}
    </div>
  );
}

function fmtRuntime(min) {
  if (!Number.isFinite(min) || min <= 0) return null;
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function Pill({ u, large = false }) {
  const epTitle = u.kind === 'sonarr' ? u.sub.split(' · ').slice(1).join(' · ') : null;
  const code = u.kind === 'sonarr' ? u.sub.split(' · ')[0] : null;
  const className = `cal-pill ${u.kind}${large ? ' large' : ''}${u.href ? ' linked' : ''}${u.poster ? ' has-poster' : ''}`;
  const inner = (
    <>
      {u.poster
        ? <img className="pill-poster" src={u.poster} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        : <span className="dot" aria-hidden="true" />}
      <span className="body">
        <span className="t">{epTitle || u.title}</span>
        {epTitle && <span className="ep">{code ? `${code} · ${u.title}` : u.title}</span>}
      </span>
      <PreviewCard u={u} />
    </>
  );
  if (u.href) {
    return (
      <a className={className} href={u.href} target="_blank" rel="noreferrer noopener">
        {inner}
      </a>
    );
  }
  return <div className={className}>{inner}</div>;
}

function PreviewCard({ u }) {
  const rt = fmtRuntime(u.runtime);
  const overview = (u.overview || '').trim();
  const truncated = overview.length > 280 ? overview.slice(0, 277) + '…' : overview;
  return (
    <div className="cal-preview" role="tooltip">
      {u.poster && (
        <img className="cal-preview-poster" src={u.poster} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
      )}
      <div className="cal-preview-body">
        <div className="cal-preview-title">{u.title}</div>
        <div className="cal-preview-sub">{u.sub}</div>
        <div className="cal-preview-meta">
          {u.network && <span>{u.network}</span>}
          {rt && <span>{rt}</span>}
          <span className="kind">{u.kind}</span>
        </div>
        {truncated && <p className="cal-preview-overview">{truncated}</p>}
      </div>
    </div>
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
