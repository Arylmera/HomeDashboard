import { useState } from 'react';

export function FlowGroup({ group, collapsed, onToggle, onTrigger }) {
  const onCount = group.flows.filter(f => f.enabled).length;
  const [pulsing, setPulsing] = useState({});

  const fire = async (e, flow) => {
    e.stopPropagation();
    if (!onTrigger || pulsing[flow.id]) return;
    setPulsing(p => ({ ...p, [flow.id]: true }));
    try { await onTrigger(flow); }
    catch {}
    finally {
      setTimeout(() => setPulsing(p => { const n = { ...p }; delete n[flow.id]; return n; }), 600);
    }
  };

  return (
    <div className={"flow-group" + (collapsed ? " collapsed" : "")}>
      <button
        type="button"
        className="flow-group-head"
        onClick={() => onToggle(group.id)}
        aria-expanded={!collapsed}
      >
        <span className="fgt">{group.name}</span>
        <span className="fgm">{onCount}/{group.flows.length} on</span>
        <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {!collapsed && (
        <div className="flows">
          {group.flows.map(f => {
            const interactive = !!onTrigger;
            const cls = "flow " + (f.enabled ? "on" : "off") + (pulsing[f.id] ? " pulsing" : "") + (interactive ? " interactive" : "");
            const label = `${f.name} flow, ${f.enabled ? "enabled" : "disabled"}${interactive ? ", click to trigger" : ""}`;
            return interactive ? (
              <button
                type="button"
                className={cls}
                key={f.id}
                onClick={(e) => fire(e, f)}
                disabled={!!pulsing[f.id]}
                aria-label={label}
              >
                <span className="ft">{f.name}</span>
                <span className="fd">{f.trigger}</span>
                <span className={`status-dot ${f.enabled ? "up" : "off"}`} role="img" aria-label={f.enabled ? "enabled" : "disabled"} />
              </button>
            ) : (
              <div className={cls} key={f.id} aria-label={label}>
                <span className="ft">{f.name}</span>
                <span className="fd">{f.trigger}</span>
                <span className={`status-dot ${f.enabled ? "up" : "off"}`} role="img" aria-label={f.enabled ? "enabled" : "disabled"} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
