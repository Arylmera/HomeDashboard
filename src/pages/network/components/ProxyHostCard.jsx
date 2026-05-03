import Dot from './Dot.jsx';
import DomainLink from './DomainLink.jsx';
import { statusOf, certLabel, certExpiry, joinDomains, fmtScheme } from '../utils.js';

export default function ProxyHostCard({ h, certsById }) {
  const status = statusOf(h);
  const cert = h.certificate || certsById.get(h.certificate_id);
  const exp = certExpiry(cert);
  const expiringSoon = exp && exp.days <= 14;
  const domains = h.domain_names || [];

  const flags = [];
  if (h.ssl_forced) flags.push('SSL forced');
  if (h.http2_support) flags.push('HTTP/2');
  if (h.hsts_enabled) flags.push('HSTS');
  if (h.block_exploits) flags.push('block exploits');
  if (h.caching_enabled) flags.push('cache');
  if (h.allow_websocket_upgrade) flags.push('ws');

  const primary = domains[0];
  const linkScheme = h.ssl_forced || cert ? 'https' : 'http';
  return (
    <div className={'net-card' + (h.enabled === false ? ' is-down' : '')}>
      <div className="net-card-head">
        <Dot s={status} />
        <DomainLink
          domain={primary}
          scheme={linkScheme}
          className="net-card-name net-card-link"
        >
          <span title={joinDomains(domains)}>
            {primary || `#${h.id}`}
            {domains.length > 1 && <span className="net-card-more"> +{domains.length - 1}</span>}
          </span>
        </DomainLink>
        {cert && (
          <span
            className={'cert-chip' + (expiringSoon ? ' is-warn' : '')}
            title={exp ? `expires ${exp.date.toISOString().slice(0, 10)} (${exp.days}d)` : ''}
          >
            {certLabel(cert)}
            {exp && <span className="cert-days">{exp.days}d</span>}
          </span>
        )}
      </div>

      <div className="net-card-target">
        <span className="scheme">{fmtScheme(h.forward_scheme)}://</span>
        <span className="host">{h.forward_host}</span>
        <span className="colon">:</span>
        <span className="port">{h.forward_port}</span>
      </div>

      {flags.length > 0 && (
        <div className="net-card-flags">
          {flags.map((f, i) => <span key={i} className="flag-chip">{f}</span>)}
        </div>
      )}

      {h.access_list?.name && (
        <div className="net-card-acl" title={`access list: ${h.access_list.name}`}>
          🔒 {h.access_list.name}
        </div>
      )}
    </div>
  );
}
