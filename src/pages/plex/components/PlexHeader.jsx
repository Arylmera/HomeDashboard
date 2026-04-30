export function PlexHeader() {
  return (
    <>
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 20 L12 4 L19 20" /><path d="M8.5 13 H15.5" />
            </svg>
          </div>
          <div className="brand-name">arylmera <span className="sub">plex stack</span></div>
        </div>
        <div className="topbar-right">
          <a className="nav-pill" href="/">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 12 9-9 9 9"/><path d="M5 10v10h14V10"/></svg>
            <span>home</span>
          </a>
        </div>
      </div>

      <div className="eyebrow">Entertainment</div>
      <h1 className="page-h1">The <em>library.</em></h1>
      <p className="page-lede">
        Three columns, one chain. <b style={{ color: 'var(--ink)' }}>Watch</b> what you've already got,
        <b style={{ color: 'var(--ink)' }}> curate</b> what's missing, and
        <b style={{ color: 'var(--ink)' }}> acquire</b> the rest. All secrets live in <code>.env</code> — set the
        relevant <code>VITE_*_URL</code> + key for each tile to wake up.
      </p>
    </>
  );
}
