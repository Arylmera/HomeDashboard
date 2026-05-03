import { iconForZone } from '../icons.jsx';
import { Device } from './Device.jsx';

export function ZoneCard({ zone, collapsed, onToggle, onDeviceToggle }) {
  const onCount = zone.devices.filter(d => d.on).length;
  return (
    <div className={"zone" + (collapsed ? " collapsed" : "")}>
      <button
        type="button"
        className="zone-head"
        onClick={() => onToggle(zone.id)}
        aria-expanded={!collapsed}
        aria-controls={`zone-body-${zone.id}`}
      >
        <div className="ico">{iconForZone(zone.name)}</div>
        <span className="zt">{zone.name}</span>
        <span className="zm">{zone.devices.length} dev</span>
        <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {collapsed ? (
        <div className="zone-summary">
          <span className="t">{zone.temp != null ? Number(zone.temp).toFixed(1) : "—"}<span className="u">°C</span></span>
          {zone.humidity != null && <><span className="sep">·</span><span>{Math.round(zone.humidity)}% RH</span></>}
          <span className="sep">·</span>
          <span className={onCount > 0 ? "lights-on" : ""}>{onCount}/{zone.devices.length} on</span>
        </div>
      ) : (
        <div id={`zone-body-${zone.id}`} className="zone-body">
          <div className="zone-climate">
            <div className="t">{zone.temp != null ? Number(zone.temp).toFixed(1) : "—"}<span className="u">°C</span></div>
            <div className="h"><span>RH</span>{zone.humidity != null ? `${Math.round(zone.humidity)}%` : "—"}</div>
          </div>
          <div className="dev-list">
            {zone.devices.map(d => <Device d={d} key={d.id} onToggle={onDeviceToggle} />)}
          </div>
        </div>
      )}
    </div>
  );
}
