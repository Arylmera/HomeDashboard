/* Aggregated *arr health pill. `items` is the raw array returned by
 * /api/v3/health (each entry has type, message, source, wikiUrl). */
export function HealthPill({ items }) {
  if (!Array.isArray(items)) return null;
  const errors = items.filter((i) => i.type === 'error');
  const warns = items.filter((i) => i.type === 'warning' || i.type === 'notice');
  if (!errors.length && !warns.length) {
    return <span className="health-pill ok" title="All checks passing">healthy</span>;
  }
  const tone = errors.length ? 'err' : 'warn';
  const tip = [...errors, ...warns].slice(0, 6).map((i) => `${i.type}: ${i.message}`).join('\n');
  return (
    <span className={`health-pill ${tone}`} title={tip}>
      {errors.length > 0 && <span className="hp-seg err">{errors.length} err</span>}
      {warns.length > 0 && <span className="hp-seg warn">{warns.length} warn</span>}
    </span>
  );
}
