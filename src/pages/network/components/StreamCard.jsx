import Dot from './Dot.jsx';
import { statusOf } from '../utils.js';

export default function StreamCard({ s }) {
  const status = statusOf(s);
  const protos = [];
  if (s.tcp_forwarding) protos.push('tcp');
  if (s.udp_forwarding) protos.push('udp');
  return (
    <div className={'net-card' + (s.enabled === false ? ' is-down' : '')}>
      <div className="net-card-head">
        <Dot s={status} />
        <div className="net-card-name">:{s.incoming_port}</div>
        <span className="redir-code">{protos.join('/').toUpperCase() || '—'}</span>
      </div>
      <div className="net-card-target">
        <span className="host">{s.forwarding_host}</span>
        <span className="colon">:</span>
        <span className="port">{s.forwarding_port}</span>
      </div>
    </div>
  );
}
