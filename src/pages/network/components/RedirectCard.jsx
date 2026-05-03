import Dot from './Dot.jsx';
import DomainLink from './DomainLink.jsx';
import { statusOf, joinDomains, fmtScheme } from '../utils.js';

export default function RedirectCard({ h }) {
  const status = statusOf(h);
  const domains = h.domain_names || [];
  const fwdScheme = h.forward_scheme || 'http';
  return (
    <div className={'net-card' + (h.enabled === false ? ' is-down' : '')}>
      <div className="net-card-head">
        <Dot s={status} />
        <DomainLink
          domain={domains[0]}
          scheme={fwdScheme === 'https' ? 'https' : 'http'}
          className="net-card-name net-card-link"
        >
          <span title={joinDomains(domains)}>
            {domains[0] || `#${h.id}`}
            {domains.length > 1 && <span className="net-card-more"> +{domains.length - 1}</span>}
          </span>
        </DomainLink>
        <span className="redir-code">{h.forward_http_code || 301}</span>
      </div>
      <DomainLink
        domain={h.forward_domain_name}
        scheme={fwdScheme}
        className="net-card-target net-card-link"
      >
        <span className="scheme">{fmtScheme(fwdScheme)}://</span>
        <span className="host">{h.forward_domain_name}</span>
      </DomainLink>
    </div>
  );
}
