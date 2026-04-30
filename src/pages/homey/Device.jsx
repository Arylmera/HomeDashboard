import { I, DEV_ICON } from './icons.jsx';

export function Device({ d }) {
  const cls = "dev " + (d.on ? "on" : "");
  const ds = d.on === true ? "ON" : d.on === false ? "OFF" : (d.reading || "—");
  return (
    <div className={cls}>
      <div className="dico">{DEV_ICON[d.type] || I.plug}</div>
      <div className="dn">{d.name}</div>
      <div className="ds">{d.power ? `${d.power} W` : ds}</div>
      {d.on !== undefined && <div className="toggle" />}
    </div>
  );
}
