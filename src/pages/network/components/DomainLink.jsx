import { domainHref } from '../utils.js';

export default function DomainLink({ domain, scheme, className, children }) {
  const href = domainHref(domain, scheme);
  if (!href) return <span className={className}>{children ?? domain}</span>;
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`open ${href}`}
    >
      {children ?? domain}
    </a>
  );
}
