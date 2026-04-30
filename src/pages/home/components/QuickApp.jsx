import Mark from './Mark.jsx';

const STATUS_LABEL = { up: "online", warn: "degraded", down: "offline", off: "status unknown" };

export default function QuickApp({ svc, statusMap, statText }) {
  const live = statusMap[svc.id] || svc.status;
  const label = STATUS_LABEL[live] || "status unknown";
  return (
    <a className="quickapp" href={svc.url} target="_blank" rel="noopener noreferrer"
       aria-label={`${svc.name}, ${label}, opens in a new tab`}
       title={`${svc.name} · ${label} · ${svc.url}`}>
      <div className="qa-ico"><Mark id={svc.icon} /></div>
      <div className="qa-body">
        <div className="qa-name">
          <span className={`status-dot ${live}`} role="img" aria-label={`status: ${label}`} title={label} />
          <span className="qa-name-text">{svc.name}</span>
        </div>
        <div className="qa-stat">{statText}</div>
      </div>
    </a>
  );
}
