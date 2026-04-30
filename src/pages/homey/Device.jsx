import { I, DEV_ICON } from './icons.jsx';

export function Device({ d }) {
  const cls = "dev " + (d.on ? "on" : "");
  const ds = d.on === true ? "ON" : d.on === false ? "OFF" : (d.reading || "—");
  const stateLabel = d.on === true ? "on" : d.on === false ? "off" : "status unknown";
  return (
    <div className={cls} role="group" aria-label={`${d.name}: ${stateLabel}`}>
      <div className="dico">{DEV_ICON[d.type] || I.plug}</div>
      <div className="dn">{d.name}</div>
      <div className="ds">{d.power ? `${d.power} W` : ds}</div>
      {/* Read-only state indicator. Control is not wired yet; render a status dot, not a fake toggle. */}
      {d.on !== undefined && (
        <span className={`status-dot ${d.on ? "up" : "off"}`} role="img" aria-label={`device ${stateLabel}`} />
      )}
    </div>
  );
}
