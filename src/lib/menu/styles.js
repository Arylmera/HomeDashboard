/* CSS for the Arylmera menu drawer + theme tokens.
 * Injected once into <head> by injectStyles().
 * Glass-mode styles live in ./glass.js and are concatenated below. */

import { GLASS_CSS } from './glass.js';

const MENU_CSS = `
  [data-theme="forge"] {
    --bg:          oklch(0.19 0.01 50);
    --bg-raised:   oklch(0.22 0.012 50);
    --bg-card:     oklch(0.235 0.014 50);
    --bg-card-hi:  oklch(0.275 0.016 50);
    --line:        oklch(0.32 0.012 50);
    --line-soft:   oklch(0.28 0.01 50 / .6);
    --ink:         oklch(0.95 0.01 60);
    --ink-dim:     oklch(0.72 0.01 55);
    --ink-faint:   oklch(0.55 0.01 55);
    --ember:       oklch(0.73 0.14 50);
    --ember-hi:    oklch(0.80 0.15 55);
    --ember-soft:  oklch(0.73 0.14 50 / .14);
  }
  [data-theme="midnight"] {
    --bg:          oklch(0.16 0.025 250);
    --bg-raised:   oklch(0.19 0.028 250);
    --bg-card:     oklch(0.20 0.025 250);
    --bg-card-hi:  oklch(0.245 0.028 250);
    --line:        oklch(0.30 0.03 245);
    --line-soft:   oklch(0.26 0.025 245 / .6);
    --ink:         oklch(0.94 0.01 240);
    --ink-dim:     oklch(0.72 0.02 235);
    --ink-faint:   oklch(0.55 0.02 235);
    --ember:       oklch(0.72 0.15 240);
    --ember-hi:    oklch(0.80 0.16 235);
    --ember-soft:  oklch(0.72 0.15 240 / .15);
  }
  [data-theme="midnight"] body::before {
    background:
      radial-gradient(60% 70% at 30% 10%, color-mix(in oklch, var(--ember) 14%, transparent) 0%, transparent 60%),
      radial-gradient(50% 60% at 80% 0%, color-mix(in oklch, var(--ember) 8%, transparent) 0%, transparent 55%) !important;
  }
  [data-theme="forest"] {
    --bg:          oklch(0.17 0.022 165);
    --bg-raised:   oklch(0.20 0.025 165);
    --bg-card:     oklch(0.21 0.025 165);
    --bg-card-hi:  oklch(0.255 0.028 165);
    --line:        oklch(0.30 0.03 160);
    --line-soft:   oklch(0.26 0.025 160 / .6);
    --ink:         oklch(0.94 0.01 160);
    --ink-dim:     oklch(0.74 0.02 155);
    --ink-faint:   oklch(0.56 0.02 155);
    --ember:       oklch(0.70 0.13 165);
    --ember-hi:    oklch(0.78 0.14 160);
    --ember-soft:  oklch(0.70 0.13 165 / .15);
  }
  [data-theme="forest"] body::before {
    background:
      radial-gradient(60% 70% at 30% 10%, color-mix(in oklch, var(--ember) 14%, transparent) 0%, transparent 60%),
      radial-gradient(50% 60% at 80% 0%, color-mix(in oklch, var(--ember) 8%, transparent) 0%, transparent 55%) !important;
  }
  [data-theme="blossom"] {
    --bg:          oklch(0.18 0.022 350);
    --bg-raised:   oklch(0.21 0.025 350);
    --bg-card:     oklch(0.22 0.028 350);
    --bg-card-hi:  oklch(0.265 0.03 350);
    --line:        oklch(0.32 0.03 350);
    --line-soft:   oklch(0.28 0.025 350 / .6);
    --ink:         oklch(0.96 0.01 350);
    --ink-dim:     oklch(0.76 0.02 345);
    --ink-faint:   oklch(0.58 0.025 345);
    --ember:       oklch(0.78 0.13 350);
    --ember-hi:    oklch(0.84 0.14 345);
    --ember-soft:  oklch(0.78 0.13 350 / .16);
  }
  [data-theme="blossom"] body::before {
    background:
      radial-gradient(60% 70% at 30% 10%, color-mix(in oklch, var(--ember) 16%, transparent) 0%, transparent 60%),
      radial-gradient(50% 60% at 80% 0%, color-mix(in oklch, var(--ember) 9%, transparent) 0%, transparent 55%) !important;
  }
  [data-density="dense"] { --am-density-scale: 0.92; }

  .am-trigger {
    width: 36px; height: 36px; border-radius: 9px;
    background: var(--bg-card); border: 1px solid var(--line-soft);
    color: var(--ink-dim); display: grid; place-items: center; cursor: pointer;
    transition: 140ms ease; padding: 0; font: inherit;
  }
  .am-trigger:hover { color: var(--ink); border-color: var(--line); background: var(--bg-card-hi); }
  .am-trigger svg { width: 16px; height: 16px; }
  .am-trigger.am-floating {
    position: fixed; top: 18px; right: 18px; z-index: 90;
    box-shadow: 0 6px 18px oklch(0 0 0 / .35);
  }

  .am-overlay {
    position: fixed; inset: 0; background: oklch(0 0 0 / .45);
    z-index: 1000; opacity: 0; pointer-events: none;
    transition: opacity 200ms ease;
    backdrop-filter: blur(2px);
  }
  .am-overlay.am-open { opacity: 1; pointer-events: auto; }

  .am-drawer {
    position: fixed; top: 0; right: 0; bottom: 0;
    width: min(380px, 92vw);
    background: var(--bg-raised);
    border-left: 1px solid var(--line);
    box-shadow: -20px 0 60px oklch(0 0 0 / .4);
    z-index: 1001;
    transform: translateX(100%);
    transition: transform 280ms cubic-bezier(.2, .7, .2, 1);
    display: flex; flex-direction: column;
    font-family: var(--font-sans, "Inter", system-ui, sans-serif);
    color: var(--ink);
  }
  .am-drawer.am-open { transform: translateX(0); }

  .am-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 22px 14px;
    border-bottom: 1px solid var(--line-soft);
  }
  .am-head .am-title { font-weight: 700; font-size: 14px; letter-spacing: -0.01em; display: flex; align-items: center; gap: 10px; }
  .am-head .am-title .am-numeral { font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 11px; color: var(--ember); letter-spacing: 0.1em; }
  .am-head .am-sub { font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 10px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.12em; margin-top: 2px; }
  .am-close { width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--line-soft); background: var(--bg-card); color: var(--ink-dim); cursor: pointer; display: grid; place-items: center; }
  .am-close:hover { color: var(--ink); border-color: var(--line); }
  .am-close svg { width: 14px; height: 14px; }

  .am-body { flex: 1; overflow: auto; padding: 18px 22px 22px; display: flex; flex-direction: column; gap: 22px; }
  .am-section { display: flex; flex-direction: column; gap: 10px; }
  .am-label { font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 10px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.14em; display: flex; align-items: center; gap: 8px; }
  .am-label::before { content: ""; width: 14px; height: 1px; background: var(--ember); opacity: 0.7; }
  .am-hint { font-size: 11.5px; color: var(--ink-faint); font-family: var(--font-mono, ui-monospace, Menlo, monospace); }

  .am-nav { display: flex; flex-direction: column; gap: 4px; }
  .am-nav-item {
    display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
    padding: 9px 12px; border-radius: 8px;
    background: var(--bg-card); border: 1px solid var(--line-soft);
    color: var(--ink); text-decoration: none;
    transition: 140ms ease;
  }
  .am-nav-item:hover { border-color: var(--line); background: var(--bg-card-hi); }
  .am-nav-item.am-on { border-color: var(--ember); background: var(--ember-soft); }
  .am-nav-name { font-weight: 600; font-size: 13px; }
  .am-nav-desc { font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 10.5px; color: var(--ink-faint); letter-spacing: 0.02em; }
  .am-nav-item.am-on .am-nav-desc { color: var(--ember-hi); }

  .am-themes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .am-theme {
    position: relative; padding: 12px; border-radius: 10px; cursor: pointer;
    background: var(--bg-card); border: 1px solid var(--line-soft);
    display: flex; flex-direction: column; gap: 8px;
    transition: 160ms ease; text-align: left; color: inherit; font: inherit;
  }
  .am-theme:hover { border-color: var(--line); background: var(--bg-card-hi); }
  .am-theme.am-on { border-color: var(--ember); box-shadow: 0 0 0 3px var(--ember-soft); }
  .am-theme .am-swatch { display: flex; gap: 4px; }
  .am-theme .am-swatch span { width: 14px; height: 14px; border-radius: 3px; border: 1px solid oklch(1 0 0 / .08); }
  .am-theme .am-name { font-weight: 600; font-size: 13px; }
  .am-theme .am-tdesc { font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 10.5px; color: var(--ink-faint); letter-spacing: 0.02em; }
  .am-theme.am-on::after { content: ""; position: absolute; top: 8px; right: 8px; width: 14px; height: 14px; border-radius: 50%; background: var(--ember); box-shadow: 0 0 0 3px var(--bg-raised); }

  .am-segment { display: grid; grid-template-columns: 1fr 1fr; background: var(--bg); border: 1px solid var(--line-soft); border-radius: 9px; padding: 3px; gap: 3px; }
  .am-segment button { font: inherit; font-size: 12px; padding: 7px 0; border: 0; border-radius: 6px; background: transparent; color: var(--ink-dim); cursor: pointer; font-family: var(--font-mono, ui-monospace, Menlo, monospace); letter-spacing: 0.04em; transition: 120ms ease; }
  .am-segment button.am-on { background: var(--bg-card-hi); color: var(--ember-hi); box-shadow: inset 0 0 0 1px var(--line); }

  .am-slider-row { display: flex; align-items: center; gap: 12px; }
  .am-slider-row input[type="range"] { flex: 1; -webkit-appearance: none; appearance: none; height: 4px; background: var(--line-soft); border-radius: 2px; outline: none; cursor: pointer; }
  .am-slider-row input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--ember); border: 2px solid var(--bg-raised); box-shadow: 0 0 0 1px var(--ember); cursor: grab; }
  .am-slider-row input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: var(--ember); border: 2px solid var(--bg-raised); cursor: grab; }
  .am-val { font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 12px; color: var(--ink); min-width: 50px; text-align: right; }

  .am-foot { padding: 14px 22px; border-top: 1px solid var(--line-soft); display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 10.5px; color: var(--ink-faint); letter-spacing: 0.06em; }
  .am-foot a { color: var(--ember-hi); text-decoration: none; }
  .am-foot a:hover { color: var(--ember); }

  @media (prefers-reduced-motion: reduce) {
    .am-overlay, .am-drawer { transition: none; }
  }
`;


export function injectStyles() {
  if (document.getElementById("arylmera-menu-style")) return;
  const styleEl = document.createElement("style");
  styleEl.id = "arylmera-menu-style";
  styleEl.textContent = MENU_CSS + GLASS_CSS;
  document.head.appendChild(styleEl);
}
