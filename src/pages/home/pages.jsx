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
  docker: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4"  y="14" width="4" height="4" rx="0.6" />
      <rect x="9"  y="14" width="4" height="4" rx="0.6" />
      <rect x="14" y="14" width="4" height="4" rx="0.6" />
      <rect x="9"  y="9"  width="4" height="4" rx="0.6" />
      <rect x="14" y="9"  width="4" height="4" rx="0.6" />
      <rect x="14" y="4"  width="4" height="4" rx="0.6" />
      <path d="M3 19 c1.5 4 6 6 11 6 c8 0 13-4 14-9 c-1.5 1-3.5 1-5 0" />
    </svg>
  ),
  network: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="11" />
      <ellipse cx="16" cy="16" rx="5" ry="11" />
      <path d="M5 16 H27" />
      <path d="M16 5 V27" opacity="0.5" />
      <circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" />
    </svg>
  ),
  music: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22 V8 L26 5 V19" />
      <ellipse cx="9" cy="22" rx="3.2" ry="2.4" fill="currentColor" stroke="none" />
      <ellipse cx="23" cy="19" rx="3.2" ry="2.4" fill="currentColor" stroke="none" />
      <path d="M12 11 L26 8" opacity="0.45" />
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
    id: "docker", name: "Containers", desc: "arcane · stacks · live",
    href: "docker.html", glyph: PageGlyphs.docker,
    accent: "oklch(0.78 0.12 250)",
    accentSoft: "oklch(0.78 0.12 250 / .14)",
    pattern: "grid",
  },
  {
    id: "network", name: "Network", desc: "npm · router · traffic",
    href: "network.html", glyph: PageGlyphs.network,
    accent: "oklch(0.80 0.13 200)",
    accentSoft: "oklch(0.80 0.13 200 / .14)",
    pattern: "rings",
  },
  {
    id: "music", name: "Music", desc: "spotify · sonos · rooms",
    href: "music.html", glyph: PageGlyphs.music,
    accent: "oklch(0.78 0.16 145)",
    accentSoft: "oklch(0.78 0.16 145 / .14)",
    pattern: "rays",
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
