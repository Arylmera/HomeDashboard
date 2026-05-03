/* Top bar — brand mark and back-to-home pill. */
export default function Topbar() {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 20 L12 4 L19 20" />
            <path d="M8.5 13 H15.5" />
          </svg>
        </div>
        <div className="brand-name">arylmera <span className="sub">smart home · hera</span></div>
      </div>
      <div className="topbar-right">
        <a className="nav-pill" href="/">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 12 9-9 9 9" />
            <path d="M5 10v10h14V10" />
          </svg>
          <span>home</span>
        </a>
      </div>
    </div>
  );
}
