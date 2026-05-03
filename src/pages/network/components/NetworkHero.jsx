import { UI } from '../../../lib/icons.jsx';

export default function NetworkHero({ now, greeting, weather, stateLine }) {
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="hero">
      <div>
        <div className="greeting-eyebrow">{dateStr} · Europe/Brussels</div>
        <h1 className="greeting">{greeting}, <em>Guillaume.</em></h1>
        <p className="greeting-sub">{stateLine}</p>
      </div>
      <div className="hero-meta">
        <div className="hero-card">
          <div className="ico">{UI.clock}</div>
          <div>
            <div className="val">{timeStr}</div>
            <div className="lab">local time</div>
          </div>
        </div>
        <div className="hero-card">
          <div className="ico">{UI.cloud}</div>
          <div>
            <div className="val">{weather.temp}°</div>
            <div className="lab">{weather.desc}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
