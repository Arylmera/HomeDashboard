/* Service marks — dashboardicons.com via jsdelivr.
 * Each ICONS entry returns { svg: <img/> } to keep the consumer API stable. */

const ICON_BASE = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons";
const di = (slug, ext = "svg") => ({
  svg: (
    <img
      src={`${ICON_BASE}/${ext}/${slug}.${ext}`}
      alt={slug}
      loading="lazy"
      style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
    />
  ),
});

export const ICONS = {
  // Media
  plex:           di("plex"),
  jellyfin:       di("jellyfin"),
  music:          di("navidrome"),
  sonarr:         di("sonarr"),
  radarr:         di("radarr"),
  lidarr:         di("lidarr"),
  tautulli:       di("tautulli"),
  maintainerr:    di("maintainerr"),
  seerr:          di("jellyseerr"),
  prowlarr:       di("prowlarr"),
  jackett:        di("jackett"),
  recyclarr:      di("recyclarr", "png"),
  flaresolverr:   di("flaresolverr"),
  cinephage:      di("kometa", "png"),
  huntarr:        di("huntarr", "png"),

  // Downloads
  qbittorrent:    di("qbittorrent"),
  joal:           di("joal", "png"),

  // Books / Audio
  audiobookshelf: di("audiobookshelf"),
  lazylibrarian:  di("lazylibrarian", "png"),
  shelfarr:       di("readarr"),
  book:           di("calibre-web"),
  vaultwarden:    di("vaultwarden"),

  // Smart home
  homey:          di("homey"),
  homeassistant:  di("home-assistant"),

  // Cloud / Files
  nextcloud:      di("nextcloud"),
  syncthing:      di("syncthing"),
  filebrowser:    di("filebrowser"),
  cloudreve:      di("cloudreve"),

  // Network
  pihole:         di("pi-hole"),
  nginx:          di("nginx-proxy-manager"),
  truenas:        di("truenas"),
  router:         di("mikrotik"),
  socketproxy:    di("docker"),
  twingate:       di("twingate"),
  authentik:      di("authentik"),
  dockge:         di("dockge"),

  // Notify / Automation
  ntfy:           di("ntfy"),
  n8n:            di("n8n"),
  cronmaster:     di("cronicle"),

  // Dashboards
  homepage:       di("homepage", "png"),

  // Monitoring
  glances:        di("glances"),
  speedtest:      di("speedtest-tracker", "png"),
  beszel:         di("beszel"),
  tugtainer:      di("portainer"),
  uptime:         di("uptime-kuma"),

  // Management
  arcane:         di("portainer"),
  qui:            di("autobrr"),
  dockdeploy:     di("dockge"),

  // Utility / AI
  scanopy:        di("paperless-ngx"),
  vert:           di("vertiv"),
  mazanoke:       di("immich"),
  weaviate:       di("qdrant"),
  ai:             di("open-webui"),
  baserow:        di("baserow"),
  organizr:       di("organizr"),
  astropath:      di("homarr"),

  // Projects
  leaderboard:    di("grafana"),
  openclaw:       di("retroarch"),
};
