/* Settings persistence + theme catalog for the Arylmera menu.
 * Settings live in localStorage under "arylmera.settings":
 *   { theme: "forge"|"midnight"|"forest"|"blossom",
 *     density: "comfortable"|"dense",
 *     refresh: number (10–300) }
 * Listen for changes via:
 *   window.addEventListener("arylmera:settings", e => e.detail) */

export const STORAGE_KEY = "arylmera.settings";
export const DEFAULTS = { theme: "forge", density: "comfortable", refresh: 30 };

export const THEMES = [
  { id: "forge",    name: "Forge",    desc: "warm graphite · copper", swatch: ["oklch(0.235 0.014 50)",  "oklch(0.73 0.14 50)",  "oklch(0.95 0.01 60)"] },
  { id: "midnight", name: "Midnight", desc: "cool deep blue · steel", swatch: ["oklch(0.20 0.025 250)",  "oklch(0.72 0.15 240)", "oklch(0.94 0.01 240)"] },
  { id: "forest",   name: "Forest",   desc: "dark green · teal",      swatch: ["oklch(0.21 0.025 165)",  "oklch(0.70 0.13 165)", "oklch(0.94 0.01 160)"] },
  { id: "blossom",  name: "Blossom",  desc: "soft pink · rose",       swatch: ["oklch(0.22 0.03 350)",   "oklch(0.78 0.13 350)", "oklch(0.96 0.01 350)"] },
];

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULTS }; }
}

export function save(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
  window.dispatchEvent(new CustomEvent("arylmera:settings", { detail: s }));
}

export function apply(s) {
  document.documentElement.dataset.theme = s.theme;
  document.documentElement.dataset.density = s.density;
}
