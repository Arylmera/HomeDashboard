import Dot from './Dot.jsx';
import { certExpiry, joinDomains } from '../utils.js';

export default function CertCard({ c }) {
  const exp = certExpiry(c);
  const expiringSoon = exp && exp.days <= 14;
  const expired = exp && exp.days < 0;
  return (
    <div className={'net-card' + (expired ? ' is-down' : '')}>
      <div className="net-card-head">
        <Dot s={expired ? 'offline' : expiringSoon ? 'unknown' : 'online'} />
        <div className="net-card-name" title={joinDomains(c.domain_names)}>
          {c.nice_name || c.domain_names?.[0] || `#${c.id}`}
        </div>
        <span className={'cert-chip' + (expiringSoon ? ' is-warn' : '')}>
          {c.provider === 'letsencrypt' ? 'LE' : (c.provider || 'cert')}
        </span>
      </div>
      <div className="net-card-meta">
        {c.domain_names?.length > 1 && <span>{c.domain_names.length} domains</span>}
        {exp && (
          <span className={expiringSoon ? 'warn' : ''}>
            {expired ? 'expired' : `${exp.days}d`} · {exp.date.toISOString().slice(0, 10)}
          </span>
        )}
      </div>
    </div>
  );
}
