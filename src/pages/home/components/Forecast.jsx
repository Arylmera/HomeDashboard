/* ============================================================== *
 *  Forecast — 3-day strip rendered next to the current weather
 *  reading inside the hero card. Compact: weekday · max° (min°).
 *  Quietly renders nothing if Open-Meteo's daily payload didn't
 *  arrive (e.g. offline first paint).
 * ============================================================== */
export default function Forecast({ daily }) {
  if (!daily?.length) return null;
  const fmt = (iso) => new Date(iso + "T00:00:00")
    .toLocaleDateString([], { weekday: "short" })
    .toLowerCase();
  return (
    <div className="forecast">
      {daily.map(d => (
        <div className="forecast-day" key={d.date} title={d.desc}>
          <span className="forecast-dow">{fmt(d.date)}</span>
          <span className="forecast-temp">{d.max != null ? `${d.max}°` : "—"}</span>
          <span className="forecast-min">{d.min != null ? `${d.min}°` : ""}</span>
        </div>
      ))}
    </div>
  );
}
