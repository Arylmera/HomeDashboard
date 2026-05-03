import Dot from './Dot.jsx';
import DomainLink from './DomainLink.jsx';
import { statusOf, certLabel, certExpiry, joinDomains, fmtScheme } from '../utils.js';

function flagsOf(h) {
  const f = [];
  if (h.ssl_forced) f.push('SSL');
  if (h.http2_support) f.push('H2');
  if (h.hsts_enabled) f.push('HSTS');
  if (h.allow_websocket_upgrade) f.push('WS');
  if (h.caching_enabled) f.push('cache');
  if (h.block_exploits) f.push('block');
  return f;
}

export default function ProxyTable({ hosts, certsById }) {
  return (
    <div className="net-table-wrap">
      <table className="net-table">
        <thead>
          <tr>
            <th className="col-status" />
            <th className="col-domain">domain</th>
            <th className="col-target">upstream</th>
            <th className="col-cert">cert</th>
            <th className="col-flags">flags</th>
            <th className="col-acl">access</th>
          </tr>
        </thead>
        <tbody>
          {hosts.map(h => {
            const status = statusOf(h);
            const cert = h.certificate || certsById.get(h.certificate_id);
            const exp = certExpiry(cert);
            const expiringSoon = exp && exp.days <= 14;
            const expired = exp && exp.days < 0;
            const domains = h.domain_names || [];
            const primary = domains[0];
            const linkScheme = h.ssl_forced || cert ? 'https' : 'http';
            const flags = flagsOf(h);
            return (
              <tr key={h.id} className={h.enabled === false ? 'is-down' : ''}>
                <td className="col-status"><Dot s={status} /></td>
                <td className="col-domain">
                  <DomainLink domain={primary} scheme={linkScheme} className="net-card-link">
                    <span title={joinDomains(domains)}>
                      {primary || `#${h.id}`}
                      {domains.length > 1 && <span className="net-card-more"> +{domains.length - 1}</span>}
                    </span>
                  </DomainLink>
                </td>
                <td className="col-target">
                  <span className="scheme">{fmtScheme(h.forward_scheme)}://</span>
                  <span className="host">{h.forward_host}</span>
                  <span className="colon">:</span>
                  <span className="port">{h.forward_port}</span>
                </td>
                <td className="col-cert">
                  {cert ? (
                    <span
                      className={'cert-chip' + (expiringSoon ? ' is-warn' : '')}
                      title={exp ? `expires ${exp.date.toISOString().slice(0, 10)} (${exp.days}d)` : ''}
                    >
                      {certLabel(cert)}
                      {exp && <span className="cert-days">{expired ? `${-exp.days}d ago` : `${exp.days}d`}</span>}
                    </span>
                  ) : <span className="net-table-dash">—</span>}
                </td>
                <td className="col-flags">
                  {flags.length === 0 ? <span className="net-table-dash">—</span> : (
                    <span className="flag-row">
                      {flags.map((f, i) => <span key={i} className="flag-chip">{f}</span>)}
                    </span>
                  )}
                </td>
                <td className="col-acl">
                  {h.access_list?.name
                    ? <span className="net-card-acl" title={`access list: ${h.access_list.name}`}>🔒 {h.access_list.name}</span>
                    : <span className="net-table-dash">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
