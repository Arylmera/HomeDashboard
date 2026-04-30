const PageGlyphs = {
  media: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="26" height="20" rx="3" />
      <path d="M3 11h26 M3 21h26" opacity="0.5" />
      <path d="M7 6v20 M25 6v20" opacity="0.35" strokeDasharray="1 2.5" />
      <path d="M14 12.5 L21 16 L14 19.5 Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  storage: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="16" cy="9" rx="10" ry="3.5" />
      <path d="M6 9v6c0 1.93 4.48 3.5 10 3.5s10-1.57 10-3.5V9" />
      <path d="M6 15v6c0 1.93 4.48 3.5 10 3.5s10-1.57 10-3.5v-6" />
      <circle cx="16" cy="22" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 15 L16 5 L27 15 V26 a2 2 0 0 1-2 2 H7 a2 2 0 0 1-2-2 Z" />
      <path d="M11 28 V19 h10 v9" opacity="0.55" />
      <circle cx="22.5" cy="9.5" r="1.6" fill="currentColor" stroke="none" />
      <path d="M19.5 9.5 a3 3 0 0 1 6 0 M16.5 9.5 a6 6 0 0 1 12 0" opacity="0.55" />
    </svg>
  ),
  directory: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="14" height="3" rx="1" />
      <rect x="4" y="12" width="14" height="3" rx="1" />
      <rect x="4" y="18" width="9" height="3" rx="1" />
      <circle cx="22" cy="22" r="5" />
      <path d="M26 26 L29 29" />
    </svg>
  ),
};

export const PAGES = [
  {
    id: "plex", name: "Media", desc: "plex · arr · downloads",
    href: "plex.html", glyph: PageGlyphs.media,
    accent: "oklch(0.78 0.15 35)",
    accentSoft: "oklch(0.78 0.15 35 / .14)",
    pattern: "rays",
  },
  {
    id: "nas", name: "Storage", desc: "truenas · pools · disks",
    href: "nas.html", glyph: PageGlyphs.storage,
    accent: "oklch(0.78 0.10 220)",
    accentSoft: "oklch(0.78 0.10 220 / .14)",
    pattern: "grid",
  },
  {
    id: "homey", name: "Smart Home", desc: "homey · ha · automations",
    href: "homey.html", glyph: PageGlyphs.home,
    accent: "oklch(0.80 0.13 150)",
    accentSoft: "oklch(0.80 0.13 150 / .14)",
    pattern: "rings",
  },
  {
    id: "quicklinks", name: "Directory", desc: "every service · search",
    href: "quicklinks.html", glyph: PageGlyphs.directory,
    accent: "oklch(0.80 0.13 320)",
    accentSoft: "oklch(0.80 0.13 320 / .14)",
    pattern: "dots",
  },
];

export const QUICK_APP_IDS = ["plex", "seerr", "sonarr", "radarr", "qbittorrent", "pihole", "homey", "homeassistant"];
