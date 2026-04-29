/* --------------------------------------------------------------- *
 *  SERVICES registry — all pulled from your markdown.
 *
 *  Note: replace the `.url` on any service with its final
 *  public URL (e.g. https://sonarr.arylmera.duckdns.org) or LAN URL
 *  (e.g. http://192.168.1.100:30027). Both modes are pre-filled.
 *
 *  Status is a static hint for now ("up" | "warn" | "down" | "off").
 *  To wire real health checks, point `healthUrl` at a lightweight
 *  endpoint and replace the value in `status` via fetch() on mount.
 *
 *  API-key placeholders:
 *    - Sonarr / Radarr / Lidarr / Prowlarr → Settings → General
 *    - Plex → X-Plex-Token in account.plex.tv
 *    - Tautulli → Settings → Web Interface
 *    - qBittorrent → WebUI auth
 *    - Pi-hole v6 → password → POST /api/auth
 * --------------------------------------------------------------- */

// ─────────────────────────────────────────────
//  BASE — swap to match your LAN or FQDN prefs
// ─────────────────────────────────────────────
const LAN  = "http://192.168.1.100";
const FQDN = "https://__sub__.arylmera.duckdns.org"; // replace __sub__

// Prefer "fqdn" (Nginx proxy) or "lan". Change globally here.
const PREFER = "fqdn";
const url = (sub, port) =>
  PREFER === "fqdn" && sub
    ? FQDN.replace("__sub__", sub)
    : `${LAN}:${port}`;

// ─────────────────────────────────────────────
//  Sections (order matters — rendered top→bottom)
// ─────────────────────────────────────────────
export const SECTIONS = [
  {
    id: "media",
    numeral: "01",
    title: "Media",
    meta: "arr stack · plex",
    services: [
      { id: "plex",        name: "Plex",         desc: "32400 · serve",           icon: "plex",        status: "up",   featured: true, url: url("plex",       32400) },
      { id: "seerr",       name: "Seerr",        desc: "30357 · request",          icon: "seerr",       status: "up",   featured: true, url: url("overseer",   30357) },
      { id: "sonarr",      name: "Sonarr",       desc: "30027 · tv",               icon: "sonarr",      status: "up",   url: url("sonarr",   30027) },
      { id: "radarr",      name: "Radarr",       desc: "30025 · movies",           icon: "radarr",      status: "up",   url: url("radarr",   30025) },
      { id: "lidarr",      name: "Lidarr",       desc: "30071 · music",            icon: "lidarr",      status: "up",   url: url("lidarr",   30071) },
      { id: "prowlarr",    name: "Prowlarr",     desc: "30050 · index",            icon: "prowlarr",    status: "up",   url: url("prowlarr", 30050) },
      { id: "tautulli",    name: "Tautulli",     desc: "30047 · stats",            icon: "tautulli",    status: "up",   url: url("tautulli", 30047) },
      { id: "maintainerr", name: "Maintainerr",  desc: "30180 · cleanup",          icon: "maintainerr", status: "up",   url: url("maintainerr", 30180) },
      { id: "flaresolverr",name: "Flaresolverr", desc: "internal · cf bypass",     icon: "flaresolverr",status: "up",   url: `${LAN}:31027` },
      { id: "cinephage",   name: "Cinephage",    desc: "30001 · arcane",           icon: "cinephage",   status: "up",   url: url("cinephage", 30001) },
      { id: "huntarr",     name: "Huntarr",      desc: "30262 · search",           icon: "huntarr",     status: "off",  url: url("huntarr",  30262) },
    ],
  },
  {
    id: "downloads",
    numeral: "02",
    title: "Downloads",
    meta: "torrents",
    services: [
      { id: "qbittorrent", name: "qBittorrent",  desc: "30024 · torrents",         icon: "qbittorrent", status: "up", featured: true, url: url("torrent",  30024) },
      { id: "joal",        name: "Joal",         desc: "30023 · ratio",            icon: "joal",        status: "up", url: url("joal",     30023) },
    ],
  },
  {
    id: "smarthome",
    numeral: "03",
    title: "Smart Home",
    meta: "homey · ha",
    services: [
      { id: "homey",         name: "Homey Pro",        desc: "192.168.1.99 · hub",       icon: "homey",         status: "up", featured: true, url: "http://192.168.1.99" },
      { id: "homeassistant", name: "Home Assistant",   desc: "8123 · ha vm",             icon: "homeassistant", status: "up", featured: true, url: url("ha", 8123) },
      { id: "ntfy",          name: "ntfy",             desc: "30184 · push",             icon: "ntfy",          status: "up", url: url("ntfy",   30184) },
      { id: "n8n",           name: "n8n",              desc: "30109 · flows",            icon: "n8n",           status: "up", url: url("n8n",    30109) },
      { id: "cronmaster",    name: "CronMaster",       desc: "40123 · schedules",        icon: "cronmaster",    status: "up", url: url("cronmaster", 40123) },
    ],
  },
  {
    id: "network",
    numeral: "04",
    title: "Network & Infrastructure",
    meta: "deepspace9 · 192.168.1.0/24",
    services: [
      { id: "router",       name: "Asus Router",    desc: "192.168.1.1 · gateway",      icon: "router",      status: "up", url: "http://192.168.1.1" },
      { id: "truenas",      name: "TrueNAS",        desc: "8443 · scale",               icon: "truenas",     status: "up", featured: true, url: url("truenas", 8443) },
      { id: "pihole",       name: "Pi-hole",        desc: "20720 · dns · blocklist",    icon: "pihole",      status: "up", featured: true, url: url("pihole",  20720) },
      { id: "nginx",        name: "Nginx Proxy Mgr",desc: "30017 · reverse proxy",      icon: "nginx",       status: "up", url: url("nginx",   30017) },
      { id: "arcane",       name: "Arcane",         desc: "30258 · docker",             icon: "arcane",      status: "up", url: url("arcane",  30258) },
      { id: "qui",          name: "Qui",            desc: "30318 · mgmt",               icon: "qui",         status: "up", url: url("qui",     30318) },
      { id: "dockdeploy",   name: "Dock-Dploy",     desc: "30000 · deploys",            icon: "dockdeploy",  status: "up", url: url("dock-deploy", 30000) },
      { id: "socketproxy",  name: "Socket Proxy",   desc: "internal · docker sock",     icon: "socketproxy", status: "up", url: `${LAN}` },
      { id: "twingate",     name: "Twingate",       desc: "vpn · remote",               icon: "twingate",    status: "warn", url: "https://admin.twingate.com" },
    ],
  },
  {
    id: "storage",
    numeral: "05",
    title: "Storage & Files",
    meta: "bunker a · 11.17 tib",
    services: [
      { id: "nextcloud",   name: "Nextcloud",      desc: "30028 · cloud",             icon: "nextcloud",   status: "up", featured: true, url: url("nextcloud", 30028) },
      { id: "syncthing",   name: "Syncthing",      desc: "20910 · sync",              icon: "syncthing",   status: "up", url: url("syncthing", 20910) },
      { id: "filebrowser", name: "Filebrowser",    desc: "30051 · browse",            icon: "filebrowser", status: "up", url: url("file",      30051) },
      { id: "cloudreve",   name: "CloudReve",      desc: "5212 · share",              icon: "cloudreve",   status: "up", url: url("cloudreve", 5212)  },
      { id: "audiobooks",  name: "Audiobookshelf", desc: "30067 · books",             icon: "audiobookshelf", status: "up", url: url("audiobookshelf", 30067) },
      { id: "lazylib",     name: "LazyLibrarian",  desc: "31089 · books",             icon: "lazylibrarian", status: "up", url: url("librarian", 31089) },
      { id: "shelfarr",    name: "Shelfarr",       desc: "5056 · books",              icon: "shelfarr",    status: "up", url: url("shelfarr", 5056) },
    ],
  },
  {
    id: "monitoring",
    numeral: "06",
    title: "Monitoring",
    meta: "eyes on everything",
    services: [
      { id: "glances",   name: "Glances",          desc: "30015 · host",              icon: "glances",   status: "up", url: url("glances",   30015) },
      { id: "beszel",    name: "Beszel",           desc: "38190 · metrics",           icon: "beszel",    status: "up", url: url("beszel",    38190) },
      { id: "speedtest", name: "Speedtest Tracker",desc: "30220 · isp",               icon: "speedtest", status: "up", url: url("speedtest", 30220) },
      { id: "tugtainer", name: "Tugtainer",        desc: "9412 · updates",            icon: "tugtainer", status: "up", url: url("tugtainer", 9412)  },
      { id: "homepage",  name: "Homepage",         desc: "30054 · legacy",            icon: "homepage",  status: "up", url: url("homepage",  30054) },
    ],
  },
  {
    id: "utility",
    numeral: "07",
    title: "Utilities",
    meta: "pocket tools",
    services: [
      { id: "vert",     name: "Vert",     desc: "30022 · convert",             icon: "vert",     status: "up", url: url("vert",    30022) },
      { id: "mazanoke", name: "Mazanoke", desc: "3474 · compress",             icon: "mazanoke", status: "up", url: url("mazanoke", 3474) },
      { id: "scanopy",  name: "Scanopy",  desc: "60072 · scan",                icon: "scanopy",  status: "up", url: url("scanopy", 60072) },
      { id: "weaviate", name: "Weaviate", desc: "internal · vector db",        icon: "weaviate", status: "up", url: `${LAN}` },
    ],
  },
  {
    id: "projects",
    numeral: "08",
    title: "Projects",
    meta: "devopsday · workshops",
    services: [
      { id: "greengauntlet", name: "The Green Gauntlet", desc: "1337 · workshop",       icon: "leaderboard", status: "up", featured: true, url: url("thegreengauntlet", 1337) },
      { id: "devopsday",     name: "DevOps Day",         desc: "1337 · leaderboard",     icon: "leaderboard", status: "up", url: url("devopsday", 1337) },
    ],
  },
];

export const ALL_SERVICES = SECTIONS.flatMap(s =>
  s.services.map(svc => ({ ...svc, section: s.title }))
);
