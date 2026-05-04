/* Barrel — keeps existing imports working after the split.
 * New code: prefer importing from the per-service module under ./hooks/. */
export { useClock, useGreeting } from './hooks/time.js';
export { useWeather } from './hooks/weather.js';
export { useTrueNAS } from './hooks/truenas.js';
export { useGlances } from './hooks/glances.js';
export { usePlex, usePlexSessions } from './hooks/plex.js';
export { useArr, useArrQueue } from './hooks/arr.js';
export { useQui } from './hooks/qui.js';
export { useTautulli, useRecentlyAdded } from './hooks/tautulli.js';
export { useSeerr } from './hooks/seerr.js';
export { usePihole } from './hooks/pihole.js';
export { useSpeedtest } from './hooks/speedtest.js';
export { useNextcloud } from './hooks/nextcloud.js';
export { useAudiobookshelf } from './hooks/audiobookshelf.js';
export { useHomey, homeySetCapability, homeySetVariable, homeyTriggerFlow } from './hooks/homey.js';
export { useArcane, arcaneAction } from './hooks/arcane.js';
export { useTugtainer } from './hooks/tugtainer.js';
export { useCalendar, useReminders } from './hooks/icloud.js';
export { useServiceHealth } from './hooks/service-health.js';
export { useNpm } from './hooks/npm.js';
export { useWan } from './hooks/wan.js';
export { useSpotifyAuth, useSpotifyPlayback, useSpotifyDevices, useSpotifyPlaylists, useSpotifyQueue, useSpotifyRecent, useSpotifyLiked, spotify, spotifyLogout } from './hooks/spotify.js';
export { useSonosAuth, useSonosHouseholds, useSonosGroups, useSonosGroupPlayback, sonos, sonosLogout } from './hooks/sonos.js';
