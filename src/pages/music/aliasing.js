/* Display-only aliasing for Sonos players.
 *
 * Some users always keep certain physical speakers grouped (e.g. a
 * stereo pair, or front/back speakers in the same room). This module
 * collapses them into a single synthetic "player" in the UI so the
 * room list is clean.
 *
 * Server data is untouched. We translate ids in/out at the React layer.
 */

export const PLAYER_GROUPS = [
  // Add entries here to merge specific speakers into a single pill.
  // Example: { displayName: 'Dining Room', members: ['Dining Room Front', 'Dining Room Back'] }
];

/* Replace each grouped set of physical players with a single synthetic
 * player. The synthetic id is `alias:<displayName>`; `_members` carries
 * the underlying physical ids for action fan-out.
 *
 * Two passes:
 *   1. Explicit PLAYER_GROUPS config (named, manual).
 *   2. Auto-merge any speakers that share the same exact name (stereo
 *      pairs and bonded sub/satellite groups report as duplicate names
 *      in Sonos LAN topology). */
export function aliasPlayers(players) {
  const out = [];
  const consumed = new Set();

  // Pass 1: explicit config (case-insensitive name match)
  for (const cfg of PLAYER_GROUPS) {
    const want = new Set(cfg.members.map(s => s.toLowerCase()));
    const found = players.filter(p => want.has((p.name || '').toLowerCase()));
    if (found.length === 0) continue;
    found.forEach(p => consumed.add(p.id));
    out.push({
      id: `alias:${cfg.displayName}`,
      name: cfg.displayName,
      _members: found.map(p => p.id),
      _memberNames: found.map(p => stripCommonPrefix(p.name, cfg.displayName)),
    });
  }

  // Pass 2: auto-merge same-name speakers (stereo pairs etc.)
  const byName = new Map();
  for (const p of players) {
    if (consumed.has(p.id)) continue;
    const list = byName.get(p.name) || [];
    list.push(p);
    byName.set(p.name, list);
  }
  for (const [name, list] of byName) {
    if (list.length > 1) {
      list.forEach(p => consumed.add(p.id));
      out.push({
        id: `alias:${name}`,
        name,
        _members: list.map(p => p.id),
        // No _memberNames for auto-merged duplicates — Sonos doesn't
        // distinguish them by name, so anything we synthesize is noise.
      });
    }
  }

  // Pass 3: leftover singletons
  for (const p of players) if (!consumed.has(p.id)) out.push(p);
  return out;
}

/* Strip stereo-pair / multi-speaker suffixes ("back", "front", "left",
 * "right") from group titles so a group coordinated by "Dining room back"
 * displays as "Dining room". Pure cosmetic — doesn't change ids. */
const SIDE_SUFFIX = /\s+(back|front|left|right|top|bottom)$/i;
function cleanGroupName(name) {
  if (!name) return name;
  return name.replace(SIDE_SUFFIX, '');
}

/* Rewrite group memberships so any aliased physical player is shown as
 * the alias id. Dedupes the resulting array. Also tidies group names. */
export function aliasGroups(groups, aliasedPlayers) {
  const memberToAlias = new Map();
  for (const ap of aliasedPlayers) {
    if (ap._members) for (const m of ap._members) memberToAlias.set(m, ap.id);
  }
  return groups.map(g => ({
    ...g,
    name: cleanGroupName(g.name),
    playerIds: [...new Set((g.playerIds || []).map(id => memberToAlias.get(id) || id))],
  }));
}

/* Translate a (possibly aliased) player id back to its physical ids. */
export function expandPlayerId(aliasedPlayers, id) {
  const ap = aliasedPlayers.find(p => p.id === id);
  return ap?._members || [id];
}

/* Lowercase, trim, and strip a leading common prefix (e.g. the alias's
 * display name) from a member name. Returns the residual that
 * distinguishes one member from another (e.g. "back", "front"). */
function stripCommonPrefix(name, prefix) {
  if (!name) return name;
  const n = name.trim();
  const p = prefix.trim();
  const lower = n.toLowerCase();
  if (lower.startsWith(p.toLowerCase() + ' ')) return n.slice(p.length + 1);
  return n;
}
