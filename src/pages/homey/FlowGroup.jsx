export function FlowGroup({ group, collapsed, onToggle }) {
  const onCount = group.flows.filter(f => f.enabled).length;
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
          {group.flows.map(f => (
            <div className={"flow " + (f.enabled ? "on" : "off")} key={f.id}>
              <span className="ft">{f.name}</span>
              <span className="fd">{f.trigger}</span>
              <div className="fdot" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
