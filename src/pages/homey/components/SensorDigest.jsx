/* Sensor digest — per-room climate visualized as comfort-band bars.
 * Temp on a 16–26°C scale, humidity dot on a 30–70% scale.
 * Each row colors warm (hot) / cool (cold) / on-band (comfortable).
 */

const T_MIN = 16, T_MAX = 26;        // temperature scale
const T_COMFORT = [19.5, 23.5];      // comfort band
const H_MIN = 30, H_MAX = 70;
const H_COMFORT = [40, 60];

function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function pct(v, lo, hi) { return clamp01((v - lo) / (hi - lo)) * 100; }

function classifyTemp(t) {
  if (t == null) return 'na';
  if (t < T_COMFORT[0]) return 'cool';
  if (t > T_COMFORT[1]) return 'warm';
  return 'ok';
}

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

  rows.sort((a, b) => (b.temp ?? -Infinity) - (a.temp ?? -Infinity));

  const comfortLeft = pct(T_COMFORT[0], T_MIN, T_MAX);
  const comfortRight = pct(T_COMFORT[1], T_MIN, T_MAX);

  return (
    <>
      <div className="nas-section-title">
        <span className="numeral">01 · sensors</span>
        <h2>Climate digest</h2>
        <span className="meta">
          {coldest
            ? <>{rows.length} zone{rows.length === 1 ? '' : 's'} · avg <b>{avgTemp}</b>°C · {T_COMFORT[0]}–{T_COMFORT[1]}° comfort band</>
            : <>{rows.length} zone{rows.length === 1 ? '' : 's'}</>}
        </span>
      </div>

      {coldest && (
        <div className="climate-extremes">
          <div className="extreme cool">
            <span className="lbl">coldest</span>
            <span className="name">{coldest.name}</span>
            <span className="val">{coldest.temp.toFixed(1)}°</span>
          </div>
          <div className="extreme avg">
            <span className="lbl">average</span>
            <span className="name">{rows.length} zones</span>
            <span className="val">{avgTemp}°</span>
          </div>
          <div className="extreme warm">
            <span className="lbl">warmest</span>
            <span className="name">{warmest.name}</span>
            <span className="val">{warmest.temp.toFixed(1)}°</span>
          </div>
        </div>
      )}

      <div className="climate-bars" role="list">
        {rows.map(r => {
          const cls = classifyTemp(r.temp);
          const tx = r.temp != null ? pct(r.temp, T_MIN, T_MAX) : null;
          const hx = r.humidity != null ? pct(r.humidity, H_MIN, H_MAX) : null;
          return (
            <div className={"climate-row " + cls} role="listitem" key={r.id}>
              <div className="cr-name">{r.name}</div>
              <div className="cr-track" aria-hidden="true">
                <span
                  className="cr-band"
                  style={{ left: comfortLeft + '%', width: (comfortRight - comfortLeft) + '%' }}
                />
                {tx != null && (
                  <span className="cr-marker temp" style={{ left: tx + '%' }} />
                )}
                {hx != null && (
                  <span className="cr-marker hum" style={{ left: hx + '%' }} title={`${r.humidity}% RH`} />
                )}
              </div>
              <div className="cr-vals">
                <span className="t">{r.temp != null ? `${r.temp.toFixed(1)}°` : ''}</span>
                <span className="h">{r.humidity != null ? `${r.humidity}%` : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
