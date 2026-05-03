function Stat({ label, value, unit, valueClass }) {
  return (
    <div className="sum">
      <div className="l">{label}</div>
      <div className={'v' + (valueClass ? ' ' + valueClass : '')}>
        {value}<span className="unit">{unit}</span>
      </div>
    </div>
  );
}

export default function NetworkBanner({ wan, npm, counts, certCounts }) {
  const wanState = wan.state === 'live' ? (wan.up ? 'up' : 'down') : '—';
  const wanClass = wan.state === 'live' ? (wan.up ? 'on' : 'off') : '';
  const wanUnit = wan.up && wan.latencyMs != null ? `${wan.latencyMs} ms` : (wan.target || 'sentinel');

  return (
    <div className="docker-banner">
      <Stat label="WAN" value={wanState} unit={wanUnit} valueClass={wanClass} />
      <Stat label="Proxy hosts" value={npm.proxyHosts.length} unit="total" valueClass="on" />
      <Stat label="Online"      value={counts.up}   unit={`/ ${counts.all}`} />
      <Stat label="Offline"     value={counts.down} unit="down" />
      <Stat label="Disabled"    value={counts.off}  unit="off" />
      <Stat label="Streams"     value={npm.streams.length} unit="tcp/udp" />
      <Stat label="Certificates"
            value={npm.certificates.length}
            unit={certCounts.warn ? `${certCounts.warn} expiring` : 'ok'} />
    </div>
  );
}
