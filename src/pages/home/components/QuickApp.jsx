import Mark from './Mark.jsx';

export default function QuickApp({ svc, statusMap, statText }) {
  const reachable = statusMap[svc.id];
  const live = reachable === undefined ? svc.status : (reachable ? "up" : "down");
  return (
    <a className="quickapp" href={svc.url} target="_blank" rel="noopener noreferrer">
      <div className="qa-ico"><Mark id={svc.icon} /></div>
      <div className="qa-body">
        <div className="qa-name">
          <span className={`dot ${live}`} />
          {svc.name}
        </div>
        <div className="qa-stat">{statText}</div>
      </div>
    </a>
  );
}
