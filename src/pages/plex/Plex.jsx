/* ============================================================== *
 *  Plex page — three columns (Watch / Curate / Acquire) +
 *  upcoming-releases calendar pulled from Sonarr + Radarr.
 *  Live data via Vite proxies; secrets stay in .env.
 * ============================================================== */
import { useMemo, useState } from 'react';
import { ICONS } from '../../lib/icons.jsx';
import { usePlex, useArr, useSeerr, useTautulli, useAudiobookshelf } from '../../lib/hooks.js';

function Mark({ id }) { return ICONS[id] ? ICONS[id].svg : null; }

function StatCell({ label, value, loading, tone }) {
  return (
    <div className={"plex-stat" + (loading ? " loading" : "")}>
      <div className={"v " + (tone || (value == null ? "muted" : ""))}>
        {loading ? "…" : (value == null ? "—" : (typeof value === "number" ? value.toLocaleString() : value))}
      </div>
      <div className="l">{label}</div>
    </div>
  );
}

function ServiceRow({ icon, name, desc, port, url, statusBadge, stats }) {
  const cls = "row-stats c" + Math.min(Math.max(stats.length, 2), 5);
  return (
    <div className="plex-row">
      <a className="row-head" href={url} target="_blank" rel="noopener noreferrer">
        <div className="ico"><Mark id={icon} /></div>
        <div>
          <div className="title">{name}</div>
          <div className="desc">{desc}</div>
        </div>
        <div className="meta">
          <span className="port">:{port}</span>
          {statusBadge}
        </div>
      </a>
      <div className={cls}>
        {stats.map(s => <StatCell key={s.label} {...s} />)}
      </div>
    </div>
  );
}

function badge(state) {
  if (state === "loading") return <span className="latency dim">loading…</span>;
  if (state === "error")   return <span className="latency warn">error</span>;
  if (state === "live")    return <span className="latency">live</span>;
  return <span className="latency dim">not configured</span>;
}

const PIPELINE = [
  { n: "01", t: "Request",  d: "ask" },
  { n: "02", t: "Index",    d: "find" },
  { n: "03", t: "Acquire",  d: "automate" },
  { n: "04", t: "Download", d: "fetch" },
  { n: "05", t: "Serve",    d: "stream" },
  { n: "06", t: "Monitor",  d: "watch" },
];

function libCount(libs, type) {
  if (!libs) return null;
  const filtered = libs.filter(d => d.type === type);
  if (!filtered.length) return null;
  return filtered.reduce((a, d) => a + (+d.count || 0), 0);
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(year, month) {
  // Monday-first 6×7 grid covering the given month
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // 0=Mon
  const start = new Date(year, month, 1 - startOffset);
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

export default function Plex() {
  const plex     = usePlex();
  const sonarr   = useArr("sonarr");
  const radarr   = useArr("radarr");
  const lidarr   = useArr("lidarr");
  const seerr    = useSeerr();
  const tautulli = useTautulli();
  const abs      = useAudiobookshelf();

  // Combined upcoming-releases calendar
  const upcoming = useMemo(() => {
    const items = [];
    if (sonarr.calendar) {
      for (const ep of sonarr.calendar) {
        items.push({
          when: ep.airDateUtc,
          title: ep.series?.title || ep.seriesTitle || "Episode",
          sub: `S${String(ep.seasonNumber).padStart(2, "0")}E${String(ep.episodeNumber).padStart(2, "0")} · ${ep.title}`,
          kind: "sonarr",
        });
      }
    }
    if (radarr.calendar) {
      for (const m of radarr.calendar) {
        items.push({
          when: m.inCinemas || m.digitalRelease || m.physicalRelease,
          title: m.title,
          sub: `${m.year} · ${m.studio || "release"}`,
          kind: "radarr",
        });
      }
    }
    return items
      .filter(i => i.when)
      .sort((a, b) => new Date(a.when) - new Date(b.when));
  }, [sonarr.calendar, radarr.calendar]);

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

  return (
    <div className="shell plex-shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 20 L12 4 L19 20" /><path d="M8.5 13 H15.5" />
            </svg>
          </div>
          <div className="brand-name">arylmera <span className="sub">plex stack</span></div>
        </div>
        <div className="topbar-right">
          <a className="nav-pill" href="/">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 12 9-9 9 9"/><path d="M5 10v10h14V10"/></svg>
            <span>home</span>
          </a>
        </div>
      </div>

      <div className="eyebrow">Entertainment</div>
      <h1 className="page-h1">The <em>library.</em></h1>
      <p className="page-lede">
        Three columns, one chain. <b style={{ color: "var(--ink)" }}>Watch</b> what you've already got,
        <b style={{ color: "var(--ink)" }}> curate</b> what's missing, and
        <b style={{ color: "var(--ink)" }}> acquire</b> the rest. All secrets live in <code>.env</code> — set the
        relevant <code>VITE_*_URL</code> + key for each tile to wake up.
      </p>

      <div className="plex-columns">
        {/* WATCH */}
        <div className="plex-col">
          <div className="col-head">
            <span className="num">01 · watch</span>
            <h3>Stream &amp; request</h3>
            <span className="meta">2</span>
          </div>

          <ServiceRow icon="plex" name="Plex" desc="Watch movies and TV shows."
            port="32400" url="https://plex.arylmera.duckdns.org"
            statusBadge={badge(plex.state)}
            stats={[
              { label: "Streams", value: plex.sessions?.size, loading: plex.state === "loading", tone: "accent" },
              { label: "Movies",  value: libCount(plex.libraries, "movie"), loading: plex.state === "loading" },
              { label: "Shows",   value: libCount(plex.libraries, "show"),  loading: plex.state === "loading" },
              { label: "Albums",  value: libCount(plex.libraries, "artist"),loading: plex.state === "loading" },
            ]}
          />

          <ServiceRow icon="seerr" name="Seerr" desc="Request portal."
            port="30357" url="https://seerr.arylmera.duckdns.org"
            statusBadge={badge(seerr.state)}
            stats={[
              { label: "Pending",  value: seerr.counts?.pending,   loading: seerr.state === "loading" },
              { label: "Approved", value: seerr.counts?.approved,  loading: seerr.state === "loading", tone: "up" },
              { label: "Done",     value: seerr.counts?.available, loading: seerr.state === "loading" },
            ]}
          />

          <ServiceRow icon="tautulli" name="Tautulli" desc="Plex monitoring."
            port="30047" url="https://tautulli.arylmera.duckdns.org"
            statusBadge={badge(tautulli.state)}
            stats={[
              { label: "Streaming", value: tautulli.activity?.stream_count, loading: tautulli.state === "loading", tone: "accent" },
              { label: "Bandwidth", value: tautulli.activity?.total_bandwidth ? `${tautulli.activity.total_bandwidth} kbps` : null, loading: tautulli.state === "loading" },
              { label: "Sessions",  value: tautulli.activity?.sessions?.length, loading: tautulli.state === "loading" },
            ]}
          />
        </div>

        {/* CURATE */}
        <div className="plex-col">
          <div className="col-head">
            <span className="num">02 · curate</span>
            <h3>Library managers</h3>
            <span className="meta">4</span>
          </div>

          <ServiceRow icon="sonarr" name="Sonarr" desc="Series management."
            port="30027" url="https://sonarr.arylmera.duckdns.org"
            statusBadge={badge(sonarr.state)}
            stats={[
              { label: "Missing", value: sonarr.missing, loading: sonarr.state === "loading" },
              { label: "Queued",  value: sonarr.queue?.totalRecords, loading: sonarr.state === "loading" },
              { label: "Series",  value: sonarr.total, loading: sonarr.state === "loading" },
            ]}
          />

          <ServiceRow icon="radarr" name="Radarr" desc="Movie management."
            port="30025" url="https://radarr.arylmera.duckdns.org"
            statusBadge={badge(radarr.state)}
            stats={[
              { label: "Missing", value: radarr.missing, loading: radarr.state === "loading" },
              { label: "Queued",  value: radarr.queue?.totalRecords, loading: radarr.state === "loading" },
              { label: "Movies",  value: radarr.total, loading: radarr.state === "loading" },
            ]}
          />

          <ServiceRow icon="lidarr" name="Lidarr" desc="Music management."
            port="30071" url="https://lidarr.arylmera.duckdns.org"
            statusBadge={badge(lidarr.state)}
            stats={[
              { label: "Missing", value: lidarr.missing, loading: lidarr.state === "loading" },
              { label: "Queued",  value: lidarr.queue?.totalRecords, loading: lidarr.state === "loading" },
              { label: "Artists", value: lidarr.total, loading: lidarr.state === "loading" },
            ]}
          />

          <ServiceRow icon="audiobookshelf" name="AudioBookShelf" desc="Audiobooks &amp; podcasts."
            port="30067" url="https://audiobookshelf.arylmera.duckdns.org"
            statusBadge={badge(abs.state)}
            stats={[
              { label: "Libraries", value: abs.libraries?.length, loading: abs.state === "loading" },
              { label: "Status",    value: abs.state === "live" ? "ok" : null, loading: abs.state === "loading", tone: "up" },
            ]}
          />
        </div>

        {/* ACQUIRE */}
        <div className="plex-col">
          <div className="col-head">
            <span className="num">03 · acquire</span>
            <h3>Download &amp; index</h3>
            <span className="meta">3</span>
          </div>

          <ServiceRow icon="qbittorrent" name="qBittorrent" desc="Download client."
            port="30024" url="https://torrent.arylmera.duckdns.org"
            statusBadge={<span className="latency dim">link only</span>}
            stats={[
              { label: "Status", value: "open", tone: "accent" },
            ]}
          />

          <ServiceRow icon="qui" name="Qui" desc="qBit dashboard."
            port="30318" url="https://qui.arylmera.duckdns.org"
            statusBadge={<span className="latency dim">link only</span>}
            stats={[
              { label: "Status", value: "open" },
            ]}
          />

          <ServiceRow icon="prowlarr" name="Prowlarr" desc="Indexer manager."
            port="30050" url="https://prowlarr.arylmera.duckdns.org"
            statusBadge={<span className="latency dim">link only</span>}
            stats={[
              { label: "Status", value: "open" },
            ]}
          />
        </div>
      </div>

      {/* Upcoming */}
      <div className="nas-section-title">
        <span className="numeral">04 · upcoming</span>
        <h2>Release calendar</h2>
        <span className="meta">{upcoming.length} releases · sonarr + radarr</span>
      </div>
      {upcoming.length === 0 ? (
        <div style={{ padding: 18, textAlign: 'center', color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', fontSize: 12, border: '1px dashed var(--line-soft)', borderRadius: 'var(--radius)' }}>
          no upcoming items — wire <code>VITE_SONARR_URL</code> + <code>VITE_RADARR_URL</code> to populate
        </div>
      ) : (
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
                <div key={k} className={`cal-cell${otherMonth ? " muted" : ""}${isToday ? " today" : ""}`}>
                  <div className="cal-cell-date">{d.getDate()}</div>
                  <div className="cal-cell-items">
                    {items.map((u, i) => {
                      const rawEp = u.kind === "sonarr" ? u.sub.split(" · ").slice(1).join(" · ") : null;
                      const epTitle = rawEp && rawEp.toUpperCase() !== "TBA" ? rawEp : null;
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
      )}

      <div className="nas-section-title">
        <span className="numeral">flow</span>
        <h2>From request to play</h2>
        <span className="meta">6 stages</span>
      </div>
      <div className="pipeline">
        {PIPELINE.map((p) => (
          <div key={p.n} className="stage">
            <span className="num">{p.n} · {p.d}</span>
            <span className="t">{p.t}</span>
            <div className="arrow" />
          </div>
        ))}
      </div>

      <div className="footnote">
        Live API · all secrets in <code>.env</code> · auto-refresh: Plex/Tautulli 30 s · arr / Seerr / ABS 60 s.
      </div>
    </div>
  );
}
