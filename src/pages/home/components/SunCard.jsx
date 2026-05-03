/* ============================================================== *
 *  SunCard — sunrise / sunset / golden hour for today.
 *
 *  Pulls sun fields from the existing Open-Meteo call that
 *  `useWeather` makes. Golden hour is approximated as the 45 min
 *  window after sunrise and before sunset. Renders a thin daylight
 *  bar showing where "now" sits between the two events.
 * ============================================================== */
function fmtTime(d) {
  if (!d) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDuration(secs) {
  if (secs == null) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs - h * 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function fmtDelta(ms) {
  if (ms == null) return null;
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600_000);
  const m = Math.round((abs - h * 3600_000) / 60_000);
  const sign = ms < 0 ? "-" : "in ";
  if (h > 0) return `${sign}${h}h ${m}m`;
  return `${sign}${m}m`;
}

const GOLDEN_MS = 45 * 60 * 1000;

export default function SunCard({ sun }) {
  if (!sun) {
    return (
      <div className="panel sun-panel">
        <div className="panel-head">
          <div className="panel-title"><span className="numeral">// sun</span>Sun</div>
          <div className="panel-meta"><span className="meta-err">offline</span></div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const { sunrise, sunset, daylight, tomorrowRise } = sun;

  const goldenAm = new Date(sunrise.getTime() + GOLDEN_MS);
  const goldenPm = new Date(sunset.getTime() - GOLDEN_MS);

  let phase, nextLabel, nextDelta;
  if (now < sunrise) {
    phase = "before sunrise";
    nextLabel = "sunrise";
    nextDelta = sunrise - now;
  } else if (now < goldenAm) {
    phase = "golden hour";
    nextLabel = "ends";
    nextDelta = goldenAm - now;
  } else if (now < goldenPm) {
    phase = "daylight";
    nextLabel = "golden";
    nextDelta = goldenPm - now;
  } else if (now < sunset) {
    phase = "golden hour";
    nextLabel = "sunset";
    nextDelta = sunset - now;
  } else {
    phase = "after sunset";
    nextLabel = "sunrise";
    nextDelta = tomorrowRise ? tomorrowRise - now : null;
  }

  const span = sunset - sunrise;
  const t = now - sunrise;
  const pct = Math.max(0, Math.min(1, span > 0 ? t / span : 0)) * 100;
  const goldenAmPct = (GOLDEN_MS / span) * 100;
  const goldenPmPct = 100 - goldenAmPct;

  return (
    <div className="panel sun-panel">
      <div className="panel-head">
        <div className="panel-title"><span className="numeral">// sun</span>Sun</div>
        <div className="panel-meta">{phase}</div>
      </div>

      <div className="sun-stats">
        <div className="sun-stat">
          <div className="val">{fmtTime(sunrise)}</div>
          <div className="lab">sunrise</div>
        </div>
        <div className="sun-stat">
          <div className="val">{fmtTime(sunset)}</div>
          <div className="lab">sunset</div>
        </div>
        <div className="sun-stat">
          <div className="val">{fmtDuration(daylight)}</div>
          <div className="lab">daylight</div>
        </div>
      </div>

      <div className="sun-bar" title={`golden ${fmtTime(goldenAm)}–${fmtTime(goldenPm)} flipped`}>
        <span className="sun-bar-golden" style={{ left: 0, width: `${goldenAmPct}%` }} />
        <span className="sun-bar-golden" style={{ left: `${goldenPmPct}%`, width: `${100 - goldenPmPct}%` }} />
        {now >= sunrise && now <= sunset && (
          <span className="sun-bar-now" style={{ left: `${pct}%` }} />
        )}
      </div>

      <div className="sun-next">
        <span>{nextLabel}</span>
        <span>{fmtDelta(nextDelta)}</span>
      </div>
    </div>
  );
}
