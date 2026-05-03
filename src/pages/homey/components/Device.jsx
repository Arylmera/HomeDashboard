import { useState } from 'react';
import { I, DEV_ICON } from '../icons.jsx';

export function Device({ d, onToggle }) {
  const [pending, setPending] = useState(false);
  const cls = "dev " + (d.on ? "on" : "");
  const ds = d.on === true ? "ON" : d.on === false ? "OFF" : (d.reading || "—");
  const stateLabel = d.on === true ? "on" : d.on === false ? "off" : "status unknown";
  const controllable = !!onToggle && d.on !== undefined && d.on !== null && (d.capabilities || []).includes('onoff');

  const click = async (e) => {
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try { await onToggle(d); } finally { setPending(false); }
  };

  return (
    <div className={cls} role="group" aria-label={`${d.name}: ${stateLabel}`}>
      <div className="dico">{DEV_ICON[d.type] || I.plug}</div>
      <div className="dn">{d.name}</div>
      <div className="ds">{d.power ? `${d.power} W` : ds}</div>
      {controllable ? (
        <button
          type="button"
          className={"dev-toggle" + (d.on ? " on" : " off") + (pending ? " pending" : "")}
          onClick={click}
          disabled={pending}
          aria-pressed={!!d.on}
          aria-label={`turn ${d.name} ${d.on ? "off" : "on"}`}
        >
          <span className="knob" />
        </button>
      ) : d.on !== undefined && d.on !== null ? (
        <span className={`status-dot ${d.on ? "up" : "off"}`} role="img" aria-label={`device ${stateLabel}`} />
      ) : null}
    </div>
  );
}
