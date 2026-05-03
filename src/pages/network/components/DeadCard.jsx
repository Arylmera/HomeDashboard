import Dot from './Dot.jsx';
import DomainLink from './DomainLink.jsx';
import { statusOf, joinDomains } from '../utils.js';

export default function DeadCard({ h }) {
  const status = statusOf(h);
  const domains = h.domain_names || [];
  return (
    <div className={'net-card' + (h.enabled === false ? ' is-down' : '')}>
      <div className="net-card-head">
        <Dot s={status} />
        <DomainLink
          domain={domains[0]}
          scheme="http"
          className="net-card-name net-card-link"
        >
          <span title={joinDomains(domains)}>
            {domains[0] || `#${h.id}`}
            {domains.length > 1 && <span className="net-card-more"> +{domains.length - 1}</span>}
          </span>
        </DomainLink>
        <span className="redir-code">404</span>
      </div>
    </div>
  );
}
