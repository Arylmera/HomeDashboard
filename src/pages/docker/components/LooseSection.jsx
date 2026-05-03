import ContainerCard from './ContainerCard.jsx';

export default function LooseSection({ containers, idx, onAction }) {
  return (
    <section className="section">
      <div className="section-head">
        <div className="section-title">
          <span className="numeral">// {String(idx).padStart(2, '0')}</span>
          <h2>loose containers</h2>
        </div>
        <span className="section-meta">{containers.length} unmanaged</span>
      </div>
      <div className="docker-grid">
        {containers.map(c => (
          <ContainerCard key={c.id} c={c} onAction={onAction} />
        ))}
      </div>
    </section>
  );
}
