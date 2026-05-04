/* ============================================================== *
 *  Glass mode — site-wide frosted style, toggled via body.style-glass.
 *
 *  Strategy:
 *   1. Override shared design tokens (--bg-card, --bg-deep, --line-soft)
 *      so any component that draws via these tokens becomes transparent.
 *      Only elements with an explicit selector below paint a card.
 *   2. Frost an explicit list of top-level card classes per page. Substring
 *      matchers like [class*="-card"] also match descendants
 *      (.page-tile-head, .qa-ico) and produce nested white rectangles, so
 *      we list them by name.
 *   3. Reset descendants of frosted cards to never re-frost.
 *   4. Force solid backgrounds on popups so text stays readable.
 *
 *  When adding a new component, decide which bucket it belongs in:
 *    - Top-level card → add to FROST_CARDS.
 *    - Section wrapper that should stay open (border only) → add to UNFROST.
 *    - Floating panel that needs to be readable → handled by [role=tooltip]
 *      / [class*="-popup"] selectors automatically; add an explicit class
 *      only if it doesn't match those.
 * ============================================================== */
export const GLASS_CSS = `
  /* ---- Design-token overrides -------------------------------------- */
  body.style-glass {
    --bg-raised:  transparent;
    --bg-card:    transparent;
    --bg-card-hi: oklch(1 0 0 / 0.06);
    --bg-deep:    transparent;
    --line:       oklch(1 0 0 / 0.18);
    --line-soft:  oklch(1 0 0 / 0.08);
    --shadow-card: 0 8px 32px oklch(0 0 0 / 0.30), inset 0 1px 0 oklch(1 0 0 / 0.10);
    --radius:    14px;
    --radius-lg: 22px;
    color: oklch(0.96 0 0);
  }

  /* ---- Animated tri-blob backdrop ---------------------------------- */
  body.style-glass::before {
    content: ""; position: fixed; inset: -10vh -10vw; z-index: -2; pointer-events: none;
    background:
      radial-gradient(35vw 35vw at 10% 75%, oklch(0.65 0.18 30  / 0.30), transparent 65%),
      radial-gradient(40vw 40vw at 90% 60%, oklch(0.55 0.20 290 / 0.28), transparent 65%),
      radial-gradient(45vw 45vw at 50% 110%, oklch(0.62 0.16 200 / 0.25), transparent 65%),
      linear-gradient(180deg, oklch(0.14 0.02 270) 0%, oklch(0.11 0.015 270) 100%);
    filter: blur(60px);
    animation: glass-drift 40s ease-in-out infinite alternate;
  }
  @keyframes glass-drift {
    0%   { transform: translate3d(0, 0, 0) scale(1); }
    50%  { transform: translate3d(2vw, -2vh, 0) scale(1.05); }
    100% { transform: translate3d(-2vw, 2vh, 0) scale(1); }
  }

  /* ---- Frosted card surfaces (explicit list, top-level only) ------- */
  body.style-glass .page-tile,
  body.style-glass .quickapp,
  body.style-glass .hero-card,
  body.style-glass .nas-card,
  body.style-glass .pi-card,
  body.style-glass .speedtest-card,
  body.style-glass .energy-card,
  body.style-glass .sun-card,
  body.style-glass .recently-added,
  body.style-glass .updates-chip,
  body.style-glass .statusbar,
  body.style-glass .am-drawer,
  body.style-glass .am-theme,
  body.style-glass .am-trigger,
  body.style-glass .pool-card,
  body.style-glass .core-card,
  body.style-glass .container-card,
  body.style-glass .ix-section,
  body.style-glass .stack,
  body.style-glass .zone-card,
  body.style-glass .variable-card,
  body.style-glass .flow-group,
  body.style-glass .device,
  body.style-glass .router-panel,
  body.style-glass .network-hero,
  body.style-glass .network-banner,
  body.style-glass .redirect-card,
  body.style-glass .dead-card,
  body.style-glass .stream-card,
  body.style-glass .cert-card,
  body.style-glass .access-list-card,
  body.style-glass .speedtest-panel,
  body.style-glass .queue-panel,
  body.style-glass .playlists-panel,
  body.style-glass .room-groups,
  body.style-glass .auth-cards,
  body.style-glass .device-picker,
  body.style-glass .service-row,
  body.style-glass .release-calendar,
  body.style-glass .watch-column,
  body.style-glass .curate-column,
  body.style-glass .acquire-column,
  body.style-glass .health-hero,
  body.style-glass .issues-jump,
  body.style-glass .summary-tiles,
  body.style-glass .status-lede,
  body.style-glass .searchbar,
  body.style-glass .search-wrap,
  body.style-glass .search-scope,
  body.style-glass .filter-bar,
  body.style-glass .filterbar,
  body.style-glass .toolbar,
  body.style-glass .nav-pill,
  body.style-glass .now-playing,
  body.style-glass .playback,
  body.style-glass .controls,
  body.style-glass .app-card,
  body.style-glass .svc-card,
  body.style-glass .service-card,
  body.style-glass .app-detail,
  body.style-glass .detail-panel,
  body.style-glass .group,
  body.style-glass .subgroup,
  body.style-glass .card,
  body.style-glass .tile {
    backdrop-filter: blur(20px) saturate(1.4);
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
    background-color: oklch(0.18 0.02 270 / 0.45);
    border-color: oklch(1 0 0 / 0.10);
    box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.08), 0 8px 32px oklch(0 0 0 / 0.28);
  }

  /* Reset: descendants of frosted cards never re-frost themselves. */
  body.style-glass .page-tile *,
  body.style-glass .quickapp *,
  body.style-glass .nas-card *,
  body.style-glass .pi-card *,
  body.style-glass .speedtest-card *,
  body.style-glass .energy-card *,
  body.style-glass .sun-card *,
  body.style-glass .recently-added *,
  body.style-glass .pool-card *,
  body.style-glass .container-card *,
  body.style-glass .zone-card *,
  body.style-glass .router-panel *,
  body.style-glass .speedtest-panel *,
  body.style-glass .output-panel *,
  body.style-glass .queue-panel *,
  body.style-glass .playlists-panel *,
  body.style-glass .vinyl-hero *,
  body.style-glass .service-row *,
  body.style-glass .health-hero *,
  body.style-glass .network-hero *,
  body.style-glass .network-banner * {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  /* ---- Section wrappers: border-only, no fill ---------------------- *
   * .panel / .vinyl-hero / .output-panel are containers, not cards.
   * Stacking another frost on top of their parent looked muddy. */
  body.style-glass .panel,
  body.style-glass .vinyl-hero,
  body.style-glass .output-panel {
    background-color: transparent !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  body.style-glass .section-head { background: transparent; box-shadow: none; }

  /* ---- Inputs: subtle dark fill, not glowing white --------------- */
  body.style-glass input,
  body.style-glass select,
  body.style-glass textarea,
  body.style-glass .search,
  body.style-glass .search-box {
    background-color: oklch(0 0 0 / 0.18);
    border-color: oklch(1 0 0 / 0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: var(--ink);
  }
  body.style-glass input::placeholder { color: oklch(0.7 0 0 / 0.55); }
  body.style-glass input:focus,
  body.style-glass select:focus,
  body.style-glass textarea:focus {
    background-color: oklch(0 0 0 / 0.28);
    border-color: oklch(1 0 0 / 0.18);
  }

  /* ---- Filter / segment buttons ---------------------------------- */
  body.style-glass .search-scope button,
  body.style-glass .searchbar button,
  body.style-glass .filter-bar button {
    background: oklch(0 0 0 / 0.25);
    border: 1px solid oklch(1 0 0 / 0.08);
    color: var(--ink-dim);
  }
  body.style-glass .search-scope button.on,
  body.style-glass .searchbar button.on,
  body.style-glass .filter-bar button.on {
    background: oklch(1 0 0 / 0.10);
    color: var(--ember-hi);
    border-color: oklch(1 0 0 / 0.20);
  }

  /* ---- Popups, tooltips, modals: legibility wins ------------------ */
  body.style-glass [role="tooltip"],
  body.style-glass [role="menu"],
  body.style-glass [role="listbox"],
  body.style-glass [role="dialog"]:not(.am-drawer),
  body.style-glass [class*="-popup"],
  body.style-glass [class*="-popover"],
  body.style-glass [class*="-modal"],
  body.style-glass [class*="-dropdown"],
  body.style-glass [class*="-tooltip"],
  body.style-glass [class*="-overlay"]:not(.am-overlay),
  body.style-glass [class*="-flyout"],
  body.style-glass .menu,
  body.style-glass .dropdown,
  body.style-glass .popover,
  body.style-glass .ra-popup,
  body.style-glass .ra-detail,
  body.style-glass .recently-popup {
    background-color: oklch(0.14 0.015 270 / 0.96) !important;
    border: 1px solid oklch(1 0 0 / 0.16) !important;
    box-shadow: 0 24px 64px oklch(0 0 0 / 0.6) !important;
    backdrop-filter: blur(28px) saturate(1.3);
    -webkit-backdrop-filter: blur(28px) saturate(1.3);
    color: var(--ink);
    z-index: 9999 !important;
  }
  /* Plex calendar release preview: explicit class for max z-index. */
  body.style-glass .cal-preview {
    z-index: 99999 !important;
    position: absolute;
  }

  /* ---- Plex page exceptions -------------------------------------- */
  body.style-glass .plex-sticky { display: none !important; }
  body.style-glass .plex-hero-bg {
    opacity: 0.18 !important;
    filter: saturate(0.7) blur(2px);
  }

  /* ---- Modern interactive feel ----------------------------------- */
  body.style-glass .page-tile,
  body.style-glass .quickapp,
  body.style-glass .pool-card,
  body.style-glass .container-card,
  body.style-glass .zone-card {
    transition: transform 280ms cubic-bezier(.2,.9,.3,1.2),
                background-color 200ms ease,
                border-color 200ms ease,
                box-shadow 220ms ease;
  }
  body.style-glass .page-tile:hover,
  body.style-glass .quickapp:hover,
  body.style-glass .pool-card:hover,
  body.style-glass .container-card:hover,
  body.style-glass .zone-card:hover {
    transform: translateY(-3px) scale(1.01);
    background-color: oklch(0.22 0.025 270 / 0.55);
    border-color: oklch(1 0 0 / 0.20);
  }
  body.style-glass *:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px oklch(1 0 0 / 0.20),
                0 0 24px oklch(0.75 0.18 250 / 0.45);
  }

  /* ---- Typography: tighter, more variable weight ----------------- */
  body.style-glass h1,
  body.style-glass h2,
  body.style-glass h3 {
    letter-spacing: -0.025em;
    font-weight: 650;
  }
  body.style-glass .greeting {
    font-weight: 700;
    letter-spacing: -0.04em;
  }

  @media (prefers-reduced-motion: reduce) {
    body.style-glass::before { animation: none; }
  }
`;
