/* useKeyboardShortcuts — global key handlers for the music page.
 * Space toggles play/pause, ←/→ seek 5s, ↑/↓ adjust volume.
 * Suppressed when focus is in an input or contenteditable. */
import { useEffect } from 'react';
import { spotify, sonos } from '../../../lib/hooks.js';
import { toast } from '../../../lib/toast.js';

export function useKeyboardShortcuts({ enabled, playback, effectiveDevice, selectedGroupId, groupPb }) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      const pb = playback.playback;
      const dev = effectiveDevice;
      const useSonos = !!dev?.is_restricted && !!selectedGroupId;
      const opt = dev?.id ? { deviceId: dev.id } : undefined;

      if (e.code === 'Space') {
        e.preventDefault();
        const playing = !!pb?.is_playing;
        if (useSonos) (playing ? sonos.pause(selectedGroupId) : sonos.play(selectedGroupId));
        else (playing ? spotify.pause(opt) : spotify.play(opt));
        toast(playing ? 'Paused' : 'Playing');
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (useSonos) return;
        const delta = (e.key === 'ArrowRight' ? 1 : -1) * 5000;
        const pos = Math.max(0, (pb?.progress_ms || 0) + delta);
        spotify.seek(pos, opt).catch(() => {});
        e.preventDefault();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const cur = useSonos ? (groupPb?.volume?.volume ?? 30) : (dev?.volume_percent ?? 30);
        const v = Math.max(0, Math.min(100, cur + (e.key === 'ArrowUp' ? 5 : -5)));
        if (useSonos) sonos.setGroupVolume(selectedGroupId, v).catch(() => {});
        else spotify.setVolume(v, opt).catch(() => {});
        toast(`Volume ${v}`);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, playback.playback, effectiveDevice, selectedGroupId, groupPb]);
}
