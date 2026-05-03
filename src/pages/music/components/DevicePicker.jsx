export function DevicePicker({ devices, currentDeviceId, onTransfer }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Spotify Connect</h2>
      </div>
      <div className="device-list">
        {devices.map(d => (
          <button
            key={d.id}
            className={`device ${d.id === currentDeviceId ? 'active' : ''} ${!d.is_active ? 'idle' : ''}`}
            onClick={() => onTransfer(d.id)}
            title={`${d.type} · ${d.name}`}
          >
            <span className="device-name">{d.name}</span>
            <span className="device-type">{d.type?.toLowerCase()}</span>
            {d.id === currentDeviceId && <span className="device-active-dot" />}
          </button>
        ))}
        {devices.length === 0 && <div className="empty">No Spotify Connect devices online. Open the Spotify app on a Sonos speaker once to register.</div>}
      </div>
      <div className="panel-hint">Sonos speakers appear here once you've played to them at least once from the Spotify app. Tap to transfer playback.</div>
    </section>
  );
}
