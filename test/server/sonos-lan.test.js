import { describe, it, expect } from 'vitest';
import { spotifyUriToSonos, buildSpotifyDidl, hmsToMs } from '../../src/server/sonos-lan.js';

describe('hmsToMs', () => {
  it.each([
    ['00:00:30', 30_000],
    ['01:23:45', (1 * 3600 + 23 * 60 + 45) * 1000],
    ['12:34', (12 * 60 + 34) * 1000],
    ['5', 5_000],
  ])('hmsToMs(%s) === %i', (input, expected) => {
    expect(hmsToMs(input)).toBe(expected);
  });
});

describe('spotifyUriToSonos', () => {
  it('builds track URI', () => {
    const r = spotifyUriToSonos('spotify:track:abc123', '7');
    expect(r.isContainer).toBe(false);
    expect(r.uri).toContain('x-sonos-spotify:');
    expect(r.uri).toContain('sn=7');
    expect(r.upnpClass).toBe('object.item.audioItem.musicTrack');
  });
  it('builds album container URI', () => {
    const r = spotifyUriToSonos('spotify:album:xyz', '7');
    expect(r.isContainer).toBe(true);
    expect(r.upnpClass).toBe('object.container.album.musicAlbum');
    expect(r.uri).toContain('x-rincon-cpcontainer:1004206c');
  });
  it('builds playlist container URI', () => {
    const r = spotifyUriToSonos('spotify:playlist:p1', '7');
    expect(r.upnpClass).toBe('object.container.playlistContainer');
    expect(r.uri).toContain('1006206c');
  });
  it('rejects non-Spotify URIs', () => {
    expect(() => spotifyUriToSonos('http://nope', '7')).toThrow('invalid_spotify_uri');
    expect(() => spotifyUriToSonos('spotify:foo:bar', '7')).toThrow('invalid_spotify_uri');
  });
});

describe('buildSpotifyDidl', () => {
  it('produces valid DIDL-Lite XML', () => {
    const xml = buildSpotifyDidl({
      didlId: '00032020abc',
      parentId: '00020000track:0',
      upnpClass: 'object.item.audioItem.musicTrack',
    });
    expect(xml).toContain('<DIDL-Lite');
    expect(xml).toContain('id="00032020abc"');
    expect(xml).toContain('parentID="00020000track:0"');
    expect(xml).toContain('object.item.audioItem.musicTrack');
    expect(xml).toContain('SA_RINCON');
  });
});
