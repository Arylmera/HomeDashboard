const ICON_EXTERNAL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3h7v7"/><path d="M21 3 12 12"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>
  </svg>
);
const ICON_REFRESH = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/>
  </svg>
);
const ICON_HOME = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 12 9-9 9 9"/><path d="M5 10v10h14V10"/>
  </svg>
);

export default function NetworkTopbar({ npmUrl, onRefresh }) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 20 L12 4 L19 20" />
            <path d="M8.5 13 H15.5" />
          </svg>
        </div>
        <div className="brand-name">arylmera <span className="sub">network · npm</span></div>
      </div>
      <div className="topbar-right">
        {npmUrl && (
          <a className="nav-pill" href={npmUrl} target="_blank" rel="noreferrer" title="open NPM admin">
            {ICON_EXTERNAL}<span>open NPM</span>
          </a>
        )}
        <button type="button" className="nav-pill" onClick={onRefresh} title="refresh now">
          {ICON_REFRESH}<span>refresh</span>
        </button>
        <a className="nav-pill" href="/">
          {ICON_HOME}<span>home</span>
        </a>
      </div>
    </div>
  );
}
