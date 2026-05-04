/* DOM construction + wiring for the Arylmera settings drawer.
 * `mountDrawer(getState, setState)` returns the trigger button
 * and handles open/close + escape/overlay/storage events. */

import { THEMES, STORAGE_KEY, load, save, apply } from './store.js';
import { readPref, writePref } from '../hooks/prefs.js';

const ICON_HAMBURGER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
const ICON_X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

const NAV_PAGES = [
  { name: "Home",       desc: "dashboard",            href: "index.html" },
  { name: "Media",      desc: "plex · arr · downloads", href: "plex.html" },
  { name: "NAS",        desc: "truenas · pools · disks", href: "nas.html" },
  { name: "Smart Home", desc: "homey · ha · automations", href: "homey.html" },
  { name: "Docker",     desc: "arcane · stacks · live", href: "docker.html" },
  { name: "Network",    desc: "npm · router · traffic", href: "network.html" },
  { name: "Music",      desc: "spotify · sonos · rooms", href: "music.html" },
  { name: "Apps",       desc: "every service · search", href: "apps.html" },
];

function currentPageFile() {
  const p = location.pathname.split("/").pop() || "index.html";
  return p === "" ? "index.html" : p;
}

export const el = (tag, attrs = {}, ...children) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return n;
};

function buildDrawer(getState, setState) {
  const overlay = el("div", { class: "am-overlay", "aria-hidden": "true" });
  const drawer = el("div", { class: "am-drawer", role: "dialog", "aria-label": "Settings", "aria-hidden": "true" });

  const closeBtn = el("button", { class: "am-close", "aria-label": "Close", html: ICON_X });
  const head = el("div", { class: "am-head" },
    el("div", {},
      el("div", { class: "am-title" },
        el("span", { class: "am-numeral" }, "//"),
        el("span", {}, "Settings"),
      ),
      el("div", { class: "am-sub" }, "saved locally"),
    ),
    closeBtn,
  );

  const body = el("div", { class: "am-body" });

  const navList = el("div", { class: "am-nav" });
  const here = currentPageFile();
  NAV_PAGES.forEach((p) => {
    const isCurrent = p.href === here;
    navList.appendChild(el("a", {
      class: "am-nav-item" + (isCurrent ? " am-on" : ""),
      href: p.href,
      ...(isCurrent ? { "aria-current": "page" } : {}),
    },
      el("span", { class: "am-nav-name" }, p.name),
      el("span", { class: "am-nav-desc" }, p.desc),
    ));
  });
  body.appendChild(el("div", { class: "am-section" },
    el("div", { class: "am-label" }, "Pages"),
    navList,
  ));

  const themeGrid = el("div", { class: "am-themes" });
  const state0 = getState();
  THEMES.forEach((t) => {
    const swatch = el("div", { class: "am-swatch" });
    t.swatch.forEach(c => swatch.appendChild(el("span", { style: `background:${c}` })));
    const card = el("button", {
      class: "am-theme" + (state0.theme === t.id ? " am-on" : ""),
      "data-theme-id": t.id,
      onClick: () => {
        const next = { ...getState(), theme: t.id };
        setState(next); apply(next); save(next);
        [...themeGrid.querySelectorAll(".am-theme")].forEach(c => c.classList.remove("am-on"));
        card.classList.add("am-on");
      },
    },
      swatch,
      el("div", {},
        el("div", { class: "am-name" }, t.name),
        el("div", { class: "am-tdesc" }, t.desc),
      ),
    );
    themeGrid.appendChild(card);
  });
  body.appendChild(el("div", { class: "am-section" },
    el("div", { class: "am-label" }, "Theme"),
    themeGrid,
  ));

  /* Helper — build a 2-button segment bound to a usePrefs key.
   * options is [{ value, label }, { value, label }]. */
  const prefSegment = (sectionLabel, prefKey, fallback, options, hint) => {
    const buttons = options.map(o => el("button", {}, o.label));
    const sync = (v) => buttons.forEach((b, i) => b.classList.toggle("am-on", options[i].value === v));
    sync(readPref(prefKey, fallback));
    options.forEach((o, i) => buttons[i].onclick = () => { writePref(prefKey, o.value); sync(o.value); });
    return el("div", { class: "am-section" },
      el("div", { class: "am-label" }, sectionLabel),
      el("div", { class: "am-segment" }, ...buttons),
      el("div", { class: "am-hint" }, hint),
    );
  };

  /* Site-wide: visual style (flat / glass) */
  body.appendChild(prefSegment(
    "Style", "home.style", "default",
    [{ value: "default", label: "flat" }, { value: "glass", label: "glass" }],
    "Glass adds frosted cards over an animated gradient backdrop, site-wide.",
  ));

  /* Home page only — time-aware layout */
  if (here === "index.html") {
    body.appendChild(prefSegment(
      "Home layout", "home.timeAware", false,
      [{ value: false, label: "off" }, { value: true, label: "auto" }],
      "Auto reorders sections by time of day. Pages stay on top.",
    ));
  }

  const densitySeg = el("div", { class: "am-segment" });
  const densComf = el("button", { class: state0.density === "comfortable" ? "am-on" : "" }, "comfortable");
  const densDense = el("button", { class: state0.density === "dense" ? "am-on" : "" }, "dense");
  const setDensity = (d) => {
    const next = { ...getState(), density: d };
    setState(next); apply(next); save(next);
    densComf.classList.toggle("am-on", d === "comfortable");
    densDense.classList.toggle("am-on", d === "dense");
  };
  densComf.onclick = () => setDensity("comfortable");
  densDense.onclick = () => setDensity("dense");
  densitySeg.append(densComf, densDense);
  body.appendChild(el("div", { class: "am-section" },
    el("div", { class: "am-label" }, "Density"),
    densitySeg,
    el("div", { class: "am-hint" }, "Pages can opt into compact spacing."),
  ));

  const valEl = el("div", { class: "am-val" }, `${state0.refresh}s`);
  const slider = el("input", { type: "range", min: "10", max: "300", step: "5", value: String(state0.refresh) });
  slider.addEventListener("input", () => {
    const v = parseInt(slider.value, 10);
    valEl.textContent = `${v}s`;
  });
  slider.addEventListener("change", () => {
    const v = parseInt(slider.value, 10);
    const next = { ...getState(), refresh: v };
    setState(next); save(next);
  });
  body.appendChild(el("div", { class: "am-section" },
    el("div", { class: "am-label" }, "Auto-refresh"),
    el("div", { class: "am-slider-row" }, slider, valEl),
    el("div", { class: "am-hint" }, "How often live data on the page reloads."),
  ));

  drawer.appendChild(head);
  drawer.appendChild(body);

  drawer.appendChild(el("div", { class: "am-foot" },
    el("span", {}, "arylmera · settings"),
    el("a", { href: "#", onClick: (e) => {
      e.preventDefault();
      if (confirm("Reset all stored settings? This wipes service tokens too.")) {
        Object.keys(localStorage).filter(k => k.startsWith("arylmera.")).forEach(k => localStorage.removeItem(k));
        location.reload();
      }
    }}, "reset all"),
  ));

  return { overlay, drawer, closeBtn };
}

function buildTrigger() {
  return el("button", {
    class: "am-trigger",
    "aria-label": "Settings menu",
    title: "Settings",
    html: ICON_HAMBURGER,
  });
}

/* Apply or remove the body.style-glass class based on the home.style pref.
 * Runs on every page mount via mountDrawer + listens for prefs-changed so
 * toggling the drawer takes effect site-wide without a reload. */
function applyGlassClass(value) {
  document.body.classList.toggle("style-glass", value === "glass");
}

export function mountDrawer(getState, setState) {
  const { overlay, drawer, closeBtn } = buildDrawer(getState, setState);
  const trigger = buildTrigger();

  applyGlassClass(readPref("home.style", "default"));
  window.addEventListener("prefs-changed", (e) => {
    if (e?.detail?.key === "home.style") applyGlassClass(e.detail.value);
  });

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  const attach = () => {
    const slot = document.querySelector(".topbar-right");
    if (slot && trigger.parentElement !== slot) {
      trigger.classList.remove("am-floating");
      slot.appendChild(trigger);
      return true;
    }
    return false;
  };
  if (!attach()) {
    trigger.classList.add("am-floating");
    document.body.appendChild(trigger);
    const obs = new MutationObserver(() => { if (attach()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  const open = () => {
    drawer.classList.add("am-open");
    overlay.classList.add("am-open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");
  };
  const close = () => {
    drawer.classList.remove("am-open");
    overlay.classList.remove("am-open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-hidden", "true");
  };

  trigger.addEventListener("click", () => {
    if (drawer.classList.contains("am-open")) close(); else open();
  });
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("am-open")) close();
  });

  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) { const next = load(); setState(next); apply(next); }
  });
}
