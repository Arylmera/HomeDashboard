/* Sensor digest — per-room mean temperature and humidity from Homey.
 * Reads `zones` already loaded by useHomey on the Homey page; no extra
 * network call. Shows a coldest/warmest summary plus one row per zone
 * with the average of all temp/humidity sensors in that zone.
 */

function zoneAverages(zone) {
  const temps = [], hums = [];
  for (const d of zone.devices || []) {
    if (d.temp != null) temps.push(d.temp);
    if (d.humidity != null) hums.push(d.humidity);
  }
  if (temps.length === 0 && hums.length === 0) return null;
  const avg = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  return {
    id: zone.id,
    name: zone.name,
    temp: temps.length ? +avg(temps).toFixed(1) : null,
    humidity: hums.length ? Math.round(avg(hums)) : null,
    sensors: Math.max(temps.length, hums.length),
  };
}

export default function SensorDigest({ zones }) {
  const rows = (zones || []).map(zoneAverages).filter(Boolean);
  if (rows.length === 0) return null;

  const withTemp = rows.filter(r => r.temp != null);
  let coldest = null, warmest = null, avgTemp = null;
  if (withTemp.length) {
    coldest = withTemp.reduce((a, b) => (a.temp <= b.temp ? a : b));
    warmest = withTemp.reduce((a, b) => (a.temp >= b.temp ? a : b));
    avgTemp = +(withTemp.reduce((s, r) => s + r.temp, 0) / withTemp.length).toFixed(1);
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="nas-section-title">
        <span className="numeral">01 · sensors</span>
        <h2>Climate digest</h2>
        <span className="meta">
          {coldest
            ? <>
                {rows.length} zone{rows.length === 1 ? '' : 's'} · avg <b>{avgTemp}</b>°C ·
                coldest <b>{coldest.name}</b> {coldest.temp.toFixed(1)}° ·
                warmest <b>{warmest.name}</b> {warmest.temp.toFixed(1)}°
              </>
            : <>{rows.length} zone{rows.length === 1 ? '' : 's'}</>}
        </span>
      </div>
      <div className="sensor-grid">
        {rows.map(r => (
          <div className="sensor-zone" key={r.id}>
            <div className="sensor-zone-name">{r.name}</div>
            <div className="sensor-row">
              <span className="sensor-vals">
                {r.temp != null && <span className="t">{r.temp.toFixed(1)}°</span>}
                {r.humidity != null && <span className="h">{r.humidity}%</span>}
              </span>
              <span className="sensor-name dim">
                {r.sensors} sensor{r.sensors === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
