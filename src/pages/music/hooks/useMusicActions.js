/* useMusicActions — centralizes the cross-cutting playback actions
 * shared by VinylHero, OutputPanel, PlaylistsPanel, QueuePanel.
 *
 * Each handler is wrapped in useCallback with a tight dependency
 * footprint so memoized panel components don't re-render on every
 * unrelated parent state change. */
import { useCallback } from 'react';
import { spotify, sonos } from '../../../lib/hooks.js';
import { toast } from '../../../lib/toast.js';

export function useMusicActions({
  selectedGroupId,
  setSelectedGroupId,
  setPendingDeviceId,
  playback,
  groupPb,
  groups,
  queue,
  devices,
}) {
  const refreshAll = useCallback(() => {
    playback.refresh();
    groupPb.refresh();
    queue.refresh();
  }, [playback, groupPb, queue]);

  /** Play a Spotify URI on the active output (Sonos group → LAN, else Connect). */
  const playUri = useCallback(async (uri) => {
    const gid = selectedGroupId;
    try {
      if (gid) {
        await sonos.playSpotify(gid, uri);
      } else if (uri.startsWith('spotify:track:')) {
        await spotify.play({ uris: [uri] });
      } else {
        await spotify.play({ contextUri: uri });
      }
      playback.refresh();
      groupPb.refresh();
      queue.refresh();
    } catch (e) {
      toast(`Couldn't start playback`, { kind: 'error', ttl: 3500 });
      console.warn('[music] playUri failed', { uri, gid, err: e });
    }
  }, [selectedGroupId, playback, groupPb, queue]);

  /** Play a Spotify URI on a specific Sonos group (used by drag-to-room). */
  const playUriOnGroup = useCallback(async (uri, gid, label, gname) => {
    try {
      await sonos.playSpotify(gid, uri);
      toast(`Playing ${label || 'track'} in ${gname}`);
      playback.refresh();
      groupPb.refresh();
      queue.refresh();
    } catch {
      toast(`Couldn't play in ${gname}`, { kind: 'error', ttl: 3500 });
    }
  }, [playback, groupPb, queue]);

  /** Transfer Spotify Connect playback to a device. */
  const transferDevice = useCallback(async (id) => {
    const target = devices.find(d => d.id === id);
    setPendingDeviceId(id);
    if (target && !target.is_restricted) setSelectedGroupId(null);
    try {
      await spotify.transfer(id, { play: true });
      toast(`Playing on ${target?.name || 'device'}`);
    } finally {
      playback.refresh();
      setTimeout(playback.refresh, 600);
      setTimeout(playback.refresh, 1500);
      setTimeout(() => setPendingDeviceId(null), 2500);
    }
  }, [devices, playback, setPendingDeviceId, setSelectedGroupId]);

  /** Select a Sonos group: resume its queue, else hand off Spotify context. */
  const selectGroup = useCallback(async (gid) => {
    setSelectedGroupId(gid);
    setPendingDeviceId(null);
    const ladder = () => {
      groupPb.refresh();
      groups.refresh();
      setTimeout(() => { groupPb.refresh(); groups.refresh(); }, 600);
      setTimeout(() => { groupPb.refresh(); groups.refresh(); }, 1500);
    };
    try {
      await sonos.play(gid);
      ladder();
      return;
    } catch { /* empty queue */ }
    const ctxUri = playback.playback?.context?.uri || playback.playback?.item?.uri;
    if (ctxUri) {
      try {
        await sonos.playSpotify(gid, ctxUri);
        playback.refresh();
        ladder();
      } catch (e) {
        console.warn('[music] handoff failed', e);
      }
    } else {
      ladder();
    }
  }, [groupPb, groups, playback, setPendingDeviceId, setSelectedGroupId]);

  return { refreshAll, playUri, playUriOnGroup, transferDevice, selectGroup };
}
