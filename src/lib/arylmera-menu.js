/* ARYLMERA — cross-site settings menu (entry point).
 *
 * Side-effect import: applies persisted theme/density to <html>,
 * injects the drawer + hamburger button once the DOM is ready, and
 * exposes `arylmeraSettings` on window for legacy callers.
 *
 * Implementation lives under ./menu/. Split for SRP:
 *   - menu/store.js   storage, defaults, themes, load/save/apply
 *   - menu/styles.js  CSS template + injectStyles()
 *   - menu/drawer.js  DOM construction + event wiring */

import { THEMES, load, apply } from './menu/store.js';
import { injectStyles } from './menu/styles.js';
import { mountDrawer } from './menu/drawer.js';

let state = load();
apply(state);
injectStyles();

const getState = () => state;
const setState = (s) => { state = s; };

function init() {
  mountDrawer(getState, setState);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

export const arylmeraSettings = { get: () => ({ ...state }), THEMES };
if (typeof window !== "undefined") window.arylmeraSettings = arylmeraSettings;
