import { useEffect, useRef, memo } from 'react';

const TYPE_BUCKETS = [
  { key: 'speaker',   label: 'Speakers',  match: (t) => /speaker|avr|tv|stb|cast|game_console/i.test(t) },
  { key: 'computer',  label: 'Computers', match: (t) => /computer|laptop|tablet/i.test(t) },
  { key: 'phone',     label: 'Phones',    match: (t) => /smartphone|phone|automobile/i.test(t) },
  { key: 'other',     label: 'Other',     match: () => true },
];

function bucketOf(type) {
  const t = type || '';
  for (const b of TYPE_BUCKETS) if (b.match(t)) return b.key;
  return 'other';
}

const ICONS = {
  speaker:  <path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm5 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>,
  computer: <path d="M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm-1 15h20v2H2z"/>,
  phone:    <path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm5 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>,
  other:    <circle cx="12" cy="12" r="4"/>,
};

export const DevicePicker = memo(function DevicePicker({ devices, currentDeviceId, onTransfer }) {
  // Track when each device was last seen as active (in-memory, session-scoped).
  const lastSeen = useRef({});
  useEffect(() => {
    const now = Date.now();
    for (const d of devices) if (d.is_active) lastSeen.current[d.id] = now;
  }, [devices]);

  const grouped = TYPE_BUCKETS.map(b => ({
    ...b,
    devices: devices.filter(d => bucketOf(d.type) === b.key),
  })).filter(b => b.devices.length > 0);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Spotify Connect</h2>
        <span className="panel-meta">{devices.length} online</span>
      </div>
      <div className="device-list">
        {grouped.map(bucket => (
          <div key={bucket.key} className="device-bucket">
            <div className="device-bucket-head">
              <svg className="device-bucket-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                {ICONS[bucket.key]}
              </svg>
              <span>{bucket.label}</span>
              <span className="device-bucket-count">{bucket.devices.length}</span>
            </div>
            {bucket.devices.map(d => {
              const isCurrent = d.id === currentDeviceId;
              const lastUsedAgo = lastSeen.current[d.id]
                ? formatAgo(Date.now() - lastSeen.current[d.id])
                : null;
              return (
                <button
                  key={d.id}
                  className={`device ${isCurrent ? 'active' : ''} ${!d.is_active ? 'idle' : ''}`}
                  onClick={() => onTransfer(d.id)}
                  title={`${d.type} · ${d.name}`}
                >
                  <span className="device-name">
                    <span className="device-name-text">{d.name}</span>
                    {!d.is_active && lastUsedAgo && (
                      <span className="device-lastused">last · {lastUsedAgo}</span>
                    )}
                  </span>
                  <span className="device-meta">
                    {d.volume_percent != null && (
                      <span className="device-vol">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M3 9v6h4l5 5V4L7 9H3z"/>
                        </svg>
                        {d.volume_percent}
                      </span>
                    )}
                    <span className="device-type">{d.type?.toLowerCase()}</span>
                    {isCurrent && <span className="device-active-dot" />}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
        {devices.length === 0 && <div className="empty">No Spotify Connect devices online. Open the Spotify app on a Sonos speaker once to register.</div>}
      </div>
      <div className="panel-hint">Tap to transfer playback. Sonos speakers appear once you've played to them at least once from the Spotify app.</div>
    </section>
  );
});

function formatAgo(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
