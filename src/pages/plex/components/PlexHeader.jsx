import { useEffect, useRef, useState } from 'react';

const HOME_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 12 9-9 9 9"/><path d="M5 10v10h14V10"/>
  </svg>
);

const BRAND_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 20 L12 4 L19 20" /><path d="M8.5 13 H15.5" />
  </svg>
);

/* Sticky bar — fades in once the hero scrolls out. Keeps overall page
 * status visible on long scrolls without doubling chrome height. */
function StickyBar({ healthTone, healthLabel, streams }) {
  const [shown, setShown] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => setShown(!entry.isIntersecting),
      { rootMargin: '-12px 0px 0px 0px', threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="plex-sticky-sentinel" aria-hidden="true" />
      <div className={`plex-sticky${shown ? ' visible' : ''}`} role="region" aria-label="Plex stack status">
        <span className={`status-dot tone-${healthTone}`} title={healthLabel} aria-label={healthLabel} />
        <span className="plex-sticky-title">arylmera · plex</span>
        {streams != null && (
          <span className="plex-sticky-streams" title="Active streams">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3 L12 8 L5 13 Z" /></svg>
            {streams}
          </span>
        )}
        <a className="plex-sticky-home" href="/" aria-label="Home">{HOME_ICON}</a>
      </div>
    </>
  );
}

export function PlexHeader({ heroBg, healthTone, healthLabel, streams }) {
  return (
    <>
      <StickyBar healthTone={healthTone} healthLabel={healthLabel} streams={streams} />

      {heroBg && (
        <div className="plex-hero-bg" aria-hidden="true" style={{ backgroundImage: `url(${heroBg})` }} />
      )}

      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">{BRAND_ICON}</div>
          <div className="brand-name">arylmera <span className="sub">plex stack</span></div>
        </div>
        <div className="topbar-right">
          <a className="nav-pill" href="/">{HOME_ICON}<span>home</span></a>
        </div>
      </div>

      <div className="eyebrow">Entertainment</div>
      <h1 className="page-h1">The <em>library.</em></h1>
      <p className="page-lede">
        Three columns, one chain. <b>Watch</b> what you've already got, <b>curate</b> what's missing, and <b>acquire</b> the rest. Secrets live in <code>.env</code>. Set the relevant <code>VITE_*_URL</code> and key for each tile to wake it up.
      </p>
    </>
  );
}
