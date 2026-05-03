/* Top summary strip — five quick-glance tiles. */
function Tile({ label, value, unit, on }) {
  return (
    <div className="sum">
      <div className="l">{label}</div>
      <div className={"v" + (on ? ' on' : '')}>
        {value}<span className="unit">{unit}</span>
      </div>
    </div>
  );
}

export default function SummaryTiles({ st, nc, stats }) {
  const ispDown = st.down != null ? `${Math.round(st.down)}` : '—';
  const ncUsedGiB = nc.info?.quota?.used != null
    ? `${(nc.info.quota.used / 1024 / 1024 / 1024).toFixed(0)}`
    : '—';
  return (
    <div className="summary">
      <Tile label="ISP ↓" value={ispDown} unit="Mbps" />
      <Tile label="Nextcloud" value={ncUsedGiB} unit="GiB" />
      <Tile label="Avg temp" value={stats.avgTemp} unit="°C" on />
      <Tile label="Avg humidity" value={stats.avgHum} unit="%" />
      <Tile label="Lights on" value={stats.lightsOn} unit="on" on />
    </div>
  );
}
