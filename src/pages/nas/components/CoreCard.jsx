import Mark from './Mark.jsx';
import Sparkline from './Sparkline.jsx';

export default function CoreCard({ core, history }) {
  const c = core;
  const hot = c.temp != null && c.temp >= 70;
  const warn = c.temp != null && c.temp >= 60;
  const color = hot ? 'var(--status-down)' : warn ? 'var(--status-warn)' : 'var(--ember)';
  return (
    <div className="nas-card">
      <div className="h">
        <div className="ico"><Mark id="beszel" /></div>
        <span className="t">CPU {c.i}</span>
        <span className="sub">core</span>
      </div>
      <Sparkline
        seed={100 + c.i}
        data={history}
        color={color}
        h={48}
        domain={[30, 90]}
        format={(v) => `${Math.round(v)}°`}
        showLabels={false}
        showTimeTicks={false}
      />
      <div className="content">
        <div className="num" style={{ color }}>
          {c.temp != null ? <>{Math.round(c.temp)}<small> °C</small></> : <small>—</small>}
        </div>
        {c.usage != null && (
          <div className="nas-bar"><i style={{ width: `${Math.min(100, Math.max(0, c.usage))}%`, background: color }} /></div>
        )}
        <div className="hint">
          {c.usage != null ? `${c.usage}% load` : 'no glances data'}
        </div>
      </div>
    </div>
  );
}
