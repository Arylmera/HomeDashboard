# Product

## Register

product

## Users

The owner-operator and the rest of the household. The owner uses HomeDashboard daily as a private console for the home stack: Plex queues, NAS pools, Homey zones, Docker stacks, and a wall of bookmarked services. Family members reach the same surfaces from a phone, tablet, or shared desktop, often without the operator's vocabulary or patience for raw service URLs.

Context of use is short and ambient, not deep-work. A typical session lasts seconds, not minutes: a glance to confirm everything is up, a tap to land on Plex, a quick toggle in Homey. The dashboard sits behind the home network, so trust is implicit; the surface should respect attention, not court it.

## Product Purpose

HomeDashboard unifies a household's self-hosted services under one calm, fast, opinionated console. Three jobs run side-by-side, with **jump-off slightly dominant**:

1. **Jump-off** — the fastest path from "I want to use Plex / NAS / homepage X" to actually being there. Quicklinks, Home tiles, search.
2. **Status check** — at-a-glance answers to "is everything still up?" without reading dashboards. Status dots, hero stats, statusbars.
3. **Action** — light operations that don't justify opening the underlying tool: start a Homey flow, peek at a Docker stack, look up a NAS pool.

Success looks like the household reaching for the dashboard before reaching for a bookmark, and the operator not feeling the need to apologize for it on a phone screen.

## Brand Personality

**Warm. Cosy. Technical.** Three words, in tension on purpose.

- **Warm** — the palette is graphite browned toward 50–60 hue, never neutral grey, never blue-shifted. The voice is direct without being cold.
- **Cosy** — this is somebody's home, not a NOC. Density is human, copy is short and friendly where it can be, the surface should feel inhabited rather than monitored.
- **Technical** — values, identifiers, status text, and labels are set in JetBrains Mono, tracked open. The technical voice is reserved for the technical bits; everything else stays warm.

Voice: terse but not curt, confident without ceremony, never cute. Mono is for machines and metrics; Inter speaks to people.

## Anti-references

This is a household console, not any of these:

- **Synology DSM and similar consumer NAS UIs** — too glossy, too marketing, too many gradients and card decorations.
- **Home Assistant default theme** — too busy, too many bright pastels stacked on the same screen, dashboard-as-toy-store.
- **Grafana / typical observability dashboards** — too cold, cobalt-blue developer-tool palette, NOC-shaped density. We are not a 2am incident response surface.
- **Typical SaaS dashboard chrome** — gradient hero, big-number-small-label, AI-slop identical card grids, glassmorphism, side-stripe accent borders.

Two-word summary of the failure modes to avoid: **not too busy, not too cold.**

## Design Principles

1. **Glance before deep-read.** Status, identity, jump-off should resolve in one second. Anything that requires a second glance to parse has failed the room.
2. **One voice for accent, two voices for type.** Ember is the only decorative color; Inter speaks to people, JetBrains Mono speaks to the machine. Discipline beats variety.
3. **Cosy density.** This is a home, not an ops center. Many small calm cells beat a few large dramatic ones, but never so dense that a phone user feels they're reading a config file.
4. **Respect every screen the household actually uses.** Phone, tablet, desktop. The same density and variant controls (`html[data-density]`, `body[data-variant]`) must keep the system legible across all three; don't optimize for one and cripple another.
5. **Trust the operator, protect the visitor.** Power features can be terse and assume context. First-time / household-member surfaces (search, quicklinks, Home) must read without prior knowledge of what the host names look like.

## Accessibility & Inclusion

WCAG **AA** is the baseline for contrast and interaction targets. No special requirements beyond that, but the system should still:

- Respect `prefers-reduced-motion` — the status-up pulse is the only ambient animation, and it should hold still under that preference.
- Pair every status color with a non-color signal in dense or accessibility-flagged contexts (a glyph, a label, a position cue), since green/yellow/red status dots are deuteranopia-prone by themselves.
- Keep tap targets at 36×36 minimum (the icon button and nav pill already meet this); don't shrink chrome below it on dense or playful variants.
- Keep body line length capped at 60–65ch for prose-shaped surfaces (the greeting sub already does this).
