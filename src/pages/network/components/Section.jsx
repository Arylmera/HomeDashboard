export default function Section({ idx, title, sub, count, children }) {
  return (
    <section className="section">
      <div className="section-head">
        <div className="section-title">
          <span className="numeral">// {String(idx).padStart(2, '0')}</span>
          <h2>{title}</h2>
        </div>
        <span className="section-meta">{sub ? `${sub} · ` : ''}{count} entr{count === 1 ? 'y' : 'ies'}</span>
      </div>
      {children}
    </section>
  );
}
