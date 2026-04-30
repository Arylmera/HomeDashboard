export default function PageTile({ page, stats }) {
  return (
    <a
      className={`page-tile pattern-${page.pattern}`}
      href={page.href}
      style={{ "--accent": page.accent, "--accent-soft": page.accentSoft }}
    >
      <div className="page-tile-head">
        <div className="page-tile-ico">{page.glyph}</div>
        <div>
          <div className="page-tile-name">{page.name}</div>
          <div className="page-tile-desc">{page.desc}</div>
        </div>
      </div>
      <div className="page-tile-stats">
        {stats.map(s => (
          <div className="stat" key={s.label}>
            <b>{s.value}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="page-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      </div>
    </a>
  );
}
