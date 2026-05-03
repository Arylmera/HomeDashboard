import Dot from './Dot.jsx';

export default function AccessListCard({ a }) {
  const items = a.items || [];
  const clients = a.clients || [];
  return (
    <div className="net-card">
      <div className="net-card-head">
        <Dot s="online" />
        <div className="net-card-name">{a.name}</div>
      </div>
      <div className="net-card-meta">
        <span>{items.length} user{items.length === 1 ? '' : 's'}</span>
        <span>·</span>
        <span>{clients.length} ip rule{clients.length === 1 ? '' : 's'}</span>
        {a.satisfy_any ? <span>· any</span> : <span>· all</span>}
      </div>
    </div>
  );
}
