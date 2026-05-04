---
name: HomeDashboard
description: Personal home-network operations console — Plex, NAS, Homey, Docker, quicklinks under one warm graphite roof.
colors:
  bg: "oklch(0.19 0.01 50)"
  bg-raised: "oklch(0.22 0.012 50)"
  bg-card: "oklch(0.235 0.014 50)"
  bg-card-hi: "oklch(0.275 0.016 50)"
  line: "oklch(0.32 0.012 50)"
  line-soft: "oklch(0.28 0.01 50 / 0.6)"
  ink: "oklch(0.95 0.01 60)"
  ink-dim: "oklch(0.72 0.01 55)"
  ink-faint: "oklch(0.55 0.01 55)"
  ember: "oklch(0.73 0.14 50)"
  ember-hi: "oklch(0.80 0.15 55)"
  ember-soft: "oklch(0.73 0.14 50 / 0.14)"
  sage: "oklch(0.72 0.06 150)"
  sage-soft: "oklch(0.72 0.06 150 / 0.14)"
  steel: "oklch(0.70 0.07 230)"
  steel-soft: "oklch(0.70 0.07 230 / 0.14)"
  alarm: "oklch(0.68 0.18 28)"
  status-up: "oklch(0.74 0.15 145)"
  status-warn: "oklch(0.82 0.15 85)"
  status-down: "oklch(0.65 0.20 28)"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "clamp(32px, 4.6vw, 48px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.003em"
  label:
    fontFamily: "JetBrains Mono, 'Geist Mono', ui-monospace, Menlo, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  sm: "6px"
  md: "8px"
  base: "10px"
  lg: "14px"
  xl: "18px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "24px"
  xl: "32px"
components:
  card:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "13px 14px"
  card-hover:
    backgroundColor: "{colors.bg-card-hi}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "13px 14px"
  icon-btn:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.md}"
    size: "36px"
  nav-pill:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  nav-pill-hover:
    backgroundColor: "{colors.bg-card-hi}"
    textColor: "{colors.ember-hi}"
    rounded: "{rounded.md}"
  searchbar:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.ink}"
    rounded: "12px"
    padding: "10px 14px"
  statusbar:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.md}"
    typography: "{typography.label}"
    padding: "6px 12px"
  hero-card:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "12px 14px"
  kbd:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink-faint}"
    rounded: "5px"
    padding: "3px 6px"
  bento-tile:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "18px"
  bento-tile-hover:
    backgroundColor: "{colors.bg-card-hi}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "18px"
---

# Design System: HomeDashboard

## 1. Overview

**Creative North Star: "The Forge at Night"**

This is a private operations console, not a product. One operator (the homeowner) sits at it after dark to glance at Plex queues, NAS pools, Homey zones, Docker stacks, and a wall of bookmarked services. The aesthetic is a warm-graphite workshop lit by a single banked ember, not a glassy SaaS dashboard, not a neon ops center, not the macOS native vocabulary. Surfaces are dim, slightly browned, never blue-grey; typography is Inter for prose, JetBrains Mono for any number, label, or technical readout. Every accent is the same copper-ember hue, used sparingly enough that lighting it up means something.

Density matters here. The user can flip a global density switch (`html[data-density="dense"]`) and a per-page variant attribute (`body[data-variant="dense|playful"]`); the system must respect both without re-theming. The grid prefers many small calm cells over few large dramatic ones. Read time is measured in seconds, not minutes. The Home page also reshuffles itself by time of day (morning, afternoon, evening, late) so the surfaces that matter at that hour rise to the top.

Media surfaces are the single carve-out from "no glass". On Plex and Music, an ambient blurred artwork backdrop sits at z-index -1 behind the panel and the foreground tiles are translucent over it (`backdrop-filter: blur(14–18px) saturate(1.15–1.2)`). That is the only sanctioned glass in the system, and only when the artwork itself is the warmth source. Chrome glass on dashboard, infrastructure, or settings surfaces is still forbidden.

What this system explicitly rejects: cobalt-blue developer-tool palettes, neon cyberpunk overlays, pure black backgrounds, decorative glassmorphism on chrome surfaces, identical icon-heading-text card grids, gradient text as default emphasis, side-stripe accent borders, and anything that reads as "AI-generated SaaS landing page".

**Key Characteristics:**
- Warm graphite (chroma 0.01–0.016, hue 50–60) underneath, never neutral grey, never blue-shifted.
- A single ember accent across every page; semantic-only sage/steel/alarm for state.
- Mono font carries the technical voice: counters, labels, status text, eyebrows.
- Cards are uniform, low-shadow, hover lifts 2px and warms by one chroma step.
- Section heads use a numeric eyebrow (`02 / `) plus a hairline rule, never a solid bar.

## 2. Colors

A warm graphite stack with a copper-ember single voice and three semantic-only colors that never appear outside of state.

### Primary
- **Ember** (`oklch(0.73 0.14 50)`): the only decorative accent. Used on hover-text, focused borders, eyebrow rules, section numerals, brand-mark gradient, pinned-state pills, hero-card icon wells, link hover. Never sits on >10% of any frame.
- **Ember Highlight** (`oklch(0.80 0.15 55)`): the lit version. Used for hover-text-on-card, brand-mark top-stop, the "you triggered something" feedback, search-scope-active label.
- **Ember Soft** (`oklch(0.73 0.14 50 / 0.14)`): the embedded version. Background tint for icon wells, focus halos, ::selection.

### Secondary (semantic only)
- **Sage** (`oklch(0.72 0.06 150)`): success-adjacent affordances that aren't loud enough to be `status-up`. Reserved.
- **Steel** (`oklch(0.70 0.07 230)`): informational accents in data viz only. The single permitted blue.
- **Alarm** (`oklch(0.68 0.18 28)`): a hotter red than `status-down`, for confirm-destructive prompts. Never used decoratively.

### Neutral — the Forge stack
- **bg** (`oklch(0.19 0.01 50)`): page background. Warm graphite, deeper than `bg-card`.
- **bg-raised** (`oklch(0.22 0.012 50)`): popovers, search results panel, modal surfaces.
- **bg-card** (`oklch(0.235 0.014 50)`): every resting card and chip surface.
- **bg-card-hi** (`oklch(0.275 0.016 50)`): the warmed-up hover state.
- **line** (`oklch(0.32 0.012 50)`): full-strength borders on hover, focus, scrollbar thumb.
- **line-soft** (`oklch(0.28 0.01 50 / 0.6)`): default card stroke. Always 1px, always full-perimeter.
- **ink** (`oklch(0.95 0.01 60)`): primary text. Off-white, warmed to match the surface.
- **ink-dim** (`oklch(0.72 0.01 55)`): secondary text and resting icon-button color.
- **ink-faint** (`oklch(0.55 0.01 55)`): tertiary, monospace meta, placeholder, footer.

### Status
- **status-up** (`oklch(0.74 0.15 145)`): live, healthy. Always paired with a 2.6s ease-out pulse halo.
- **status-warn** (`oklch(0.82 0.15 85)`): degraded, recoverable. No animation.
- **status-down** (`oklch(0.65 0.20 28)`): offline, failed. No animation.

### Named Rules

**The One Voice Rule.** Ember is the only decorative color. Sage, steel, and alarm are reserved for semantic state and data viz. Adding a fourth decorative hue is the single fastest way to break the system.

**The Warm Graphite Rule.** No background, border, or text color may have hue outside the 50–60 range. Hue 230 (steel) is permitted only inside a data-viz frame; hue 145 / 85 / 28 (status) only when bound to a live system state.

**The No-Pure-Black Rule.** `--bg` is `oklch(0.19 0.01 50)`, never `#000`. Even the deepest scrollbar track keeps a chroma of 0.01. Pure black breaks the photo-of-a-workshop reading.

## 3. Typography

**Display / Body Font:** Inter (ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial fallback).
**Mono / Label Font:** JetBrains Mono (Geist Mono, ui-monospace, Menlo, Consolas fallback).

**Character:** Inter at modest sizes for prose and headings (negative letterspacing throughout, never tracked open). JetBrains Mono everywhere a number, identifier, status, or label appears: this is the voice of the machine. The two fonts never blend, they alternate per role.

### Hierarchy
- **Display** (600, `clamp(32px, 4.6vw, 48px)`, line-height 1.05, letterspacing -0.03em): the greeting on Home only. `<em>` inside the greeting is set in ember, not italic.
- **Headline** (600, 17px, line-height 1.3, letterspacing -0.015em): section titles. Always preceded by a mono numeral eyebrow.
- **Title** (600, 13.5px, letterspacing -0.005em): card titles, list item headings.
- **Body** (400, 14px, line-height 1.5, letterspacing -0.003em): paragraphs, descriptions, controls. Lines cap around 60–65ch (search greeting-sub uses `max-width: 60ch`).
- **Label** (mono, 500, 10–11px, letterspacing 0.08–0.14em, often uppercase): every meta line, eyebrow, kbd, status timestamp, hero-card unit label.

### Named Rules

**The Two Voices Rule.** Inter for prose and chrome, JetBrains Mono for any value, identifier, label, status timestamp, or technical readout. A number set in Inter looks soft; a description set in mono looks hostile. Pick the right voice every time.

**The Tracked-Mono Rule.** Mono is always tracked open (`letter-spacing: 0.08–0.14em`) and usually uppercased. Tight or mixed-case mono in a label slot reads as a bug.

**The No-Italic Rule.** `<em>` is reserved for ember-colored emphasis at display scale; it is never rendered italic. Other italics are forbidden.

## 4. Elevation

Surfaces are flat at rest. Depth comes from a tight three-step warm-graphite ramp (`bg → bg-card → bg-card-hi`) plus one inset highlight and one ambient drop. Shadows are responses, not decoration.

### Shadow Vocabulary
- **shadow-card** (`box-shadow: 0 1px 0 oklch(1 0 0 / .04) inset, 0 8px 24px oklch(0 0 0 / .28)`): the resting card shadow. The inset highlight is 4% white at 1px from the top, the drop is 28% black at 24px blur. Always together.
- **shadow-card-hover** (`0 1px 0 oklch(1 0 0 / .06) inset, 0 14px 36px oklch(0 0 0 / .38), 0 0 0 1px var(--ember-soft)`): hover state. Inset rises to 6%, drop deepens, and a 1px ember-soft outer ring lights the perimeter.
- **shadow-popover** (`0 24px 60px oklch(0 0 0 / .45)`): search results dropdown. Single deep ambient drop, no inset.

### Named Rules

**The Lift-On-Touch Rule.** Cards rest flat-with-shadow, and they lift `translateY(-2px)` plus the ember-soft ring on hover. The transition is 180ms cubic-bezier(.2,.7,.2,1). No bounce, no scale, no glow without contact. Bento tiles on media pages are the exception: depth comes from the artwork backdrop behind them, so they warm the border on hover instead of lifting.

**The Media-Glass Carve-out.** Glass (`backdrop-filter: blur(...) saturate(...)`) is permitted only when a blurred ambient artwork backdrop sits at z-index -1 behind the surface. No artwork, no glass. Plex hero and Music bento qualify; infrastructure, Homey, Docker, NAS, settings, and Home tiles do not.

**The Inset Highlight Rule.** Every elevated surface includes the 1px inset white-04 stroke at the top edge. It's what reads the surface as "lit from above", not "stuck onto the page". Without it, cards look pasted on.

## 5. Components

Cards are uniform, calm, and many. Every interactive primitive shares the same warm-graphite base and the same 140–180ms ease-out transition.

### Buttons
- **Shape:** soft-square, 8–9px radius (`rounded.md`).
- **Icon button** (`.icon-btn`, 36×36): `bg-card` resting, `ink-dim` glyph, `line-soft` stroke. Hovers to `bg-card-hi`, ink-color glyph, `line` stroke. No fill change, no scale.
- **Nav pill** (`.nav-pill`, 36px tall, padding 0 10px): same chrome as icon-btn but ember-highlight on hover (the only chrome that warms to ember on plain hover; reserved for nav).
- **No primary "filled" button** exists in the system. Action emphasis comes from ember on hover plus the lift, not a permanently-filled ember pill.

### Status dot
- **Shape:** 7×7 circle.
- **States:** `up` pulses (2.6s ease-out, color-mix outer halo), `warn` static yellow, `down` static red, `off` faint-ink at 50% opacity.
- **Placement:** inline next to a card title, never standalone.

### Cards (`.qlinks-card`, `.hero-card`, `.panel`, `.page-tile`)
- **Corner Style:** 10px (`rounded.base`); 14px on raised panels (`rounded.lg`); 18px in playful variant; 8px in dense.
- **Background:** `bg-card` resting, `bg-card-hi` hover.
- **Border:** always 1px, always `line-soft` resting / `line` hover, full-perimeter only.
- **Shadow:** `shadow-card` resting, `shadow-card-hover` on hover (see Elevation).
- **Internal padding:** 13–14px standard, 9–11px dense, 22px playful.
- **Featured / pinned variants:** border shifts toward `color-mix(ember 35%, line-soft)`. Featured adds a pseudo-element radial gradient of `ember-soft` from the top-left corner to ~55% — the only gradient permitted on a card.

### Searchbar (`.searchbar`)
- **Shape:** 12px radius.
- **Style:** `bg-card` background, `line-soft` stroke, `shadow-card`.
- **Focus:** stroke shifts to ember, plus a 4px `ember-soft` outer ring (`box-shadow` halo). Input itself has no border.
- **Icon:** 16×16 magnifier in `ink-faint`, leading.
- **Trailing chip:** kbd-style hint (`⌘K` etc.), 10px mono, `bg` background, `line-soft` stroke, 5px radius.
- **Search results popover:** `bg-raised`, `line` border, `shadow-popover`. Active row gets `bg-card-hi`. Each row has a 13px name (Inter), 11px mono description, and a right-aligned uppercase mono category.

### Statusbar (`.statusbar`)
- A pill, not a banner. Mono 11px text, 8px gap, `status-dot` (with pulse if up), `bg-card` chrome.
- Variants `.warn` and `.down` swap the dot color and kill the pulse.

### Section heads
- Layout: `[numeral-eyebrow • title]` left, `[meta]` right, separated by a 1px `line-soft` rule beneath.
- Numeral is mono 11px in ember (`02 / `, with a trailing slash). Title is 17px Inter 600.
- Meta on the right is uppercase mono 11px in `ink-faint`, with optional ember link.

### Hero card (`.hero-card`)
- A row of small at-a-glance stat tiles next to the greeting. Mono 20px value, mono 10px uppercase label, 34×34 ember-soft icon well. Used only on the Home page.

### Bento tile (`.bento-tile`) — Music / Plex signature
- 18px radius (`rounded.xl`), 18px internal padding, background `color-mix(in oklch, var(--bg-card) 78%, transparent)`.
- `backdrop-filter: blur(14px) saturate(1.15)` over a page-level artwork backdrop (`.bento-bg`, absolutely positioned at `inset: -40px -20px`, z-index -1, blurred album-cover gradient via `--music-bg-grad`). The tile alone is not glass; the tile-plus-backdrop pair is.
- Border `line-soft` resting, warms to `color-mix(accent 35%, line-soft)` on hover. No `translateY` lift here; the warmth of the artwork carries the depth.
- Permitted only on media-driven pages (Plex, Music). Reusing this on infrastructure or settings is a doctrine violation.

### Media backdrop (`.bento-bg`, Plex hero bg)
- Absolutely positioned, inset negative (`inset: -40px -20px`), z-index -1, `pointer-events: none`.
- `filter: blur(20px) saturate(1.1)`, opacity ~0.85, ambient gradient sourced from current artwork.
- Transitions on `background` over 600–800ms ease so the room mood shifts smoothly when a new track or item lands.
- Never used as a hero treatment on non-media pages.

### Quicklinks card (`.qlinks-card`) — signature component
- 240×68 (200×54 dense), one row of icon + title-with-status-dot + mono description + corner arrow.
- Icon well is 38×38, white-04 background, `line-soft` stroke, 6px inset padding to fit dashboard-icons SVG/PNG sources without bleeding.
- Hover lifts the card, warms the title to ember-hi, and slides the corner arrow `(2px, -2px)` while fading from 0 → 1.
- Edit mode replaces the corner arrow with a pinnable pill in ember-soft.

## 6. Do's and Don'ts

### Do:
- **Do** keep every neutral inside hue 50–60 with chroma 0.01–0.016. Warm graphite, never blue-grey, never neutral.
- **Do** use ember as the single decorative voice. If a screen feels flat, lift one element with ember-hi text on hover, not a second accent color.
- **Do** set every number, label, identifier, status timestamp, and eyebrow in JetBrains Mono, tracked open at 0.08–0.14em.
- **Do** wrap status pills around `.status-dot` and let `up` pulse on a 2.6s ease-out cadence. The pulse is the system's heartbeat.
- **Do** use the inset white-04 + drop oklch(0/.28) shadow pair on every resting card, and add the ember-soft ring on hover.
- **Do** lift cards `translateY(-2px)` over 180ms `cubic-bezier(.2,.7,.2,1)` on hover. Same curve every time.
- **Do** preface section titles with a mono numeral eyebrow in ember (`01 / `, `02 / `).
- **Do** respect both `html[data-density="dense"]` and `body[data-variant="dense|playful"]` — both must keep working, and neither may re-theme.
- **Do** use OKLCH everywhere. The palette is computed in OKLCH; hex is a deliverable, not a source.

### Don't:
- **Don't** use `#000` or `#fff`. The bg floor is `oklch(0.19 0.01 50)`, the ink ceiling is `oklch(0.95 0.01 60)`.
- **Don't** introduce a second decorative accent. No teals, no purples, no second oranges. Sage / steel / alarm are state-only and data-viz-only.
- **Don't** use side-stripe borders (`border-left: 3px solid …`). Borders are full-perimeter, 1px, in `line-soft` or `line`.
- **Don't** apply gradient text by default. The only sanctioned gradient text is the playful-variant greeting `<em>`, and only there.
- **Don't** add glassmorphism on chrome surfaces. The Plex / Music media-backdrop pairing is the sole carve-out: `backdrop-filter` over an ambient blurred artwork backdrop, and only there. Translucent panels over the page bg or over a generic wallpaper are still forbidden.
- **Don't** ship hero-metric templates: big-gradient-number above small-label above supporting-stats. The Home hero already serves that role with smaller mono values.
- **Don't** italicize text. `<em>` is colored, never slanted.
- **Don't** use solid filled "primary" buttons. Action emphasis comes from hover-warming and lift, not a permanent ember fill.
- **Don't** nest cards. A panel inside a card inside the shell is always wrong; flatten or use `bg-raised` for the inner surface.
- **Don't** animate layout properties (width, padding, margin). Animate `transform`, `opacity`, `box-shadow`, `color`, `border-color`, `background`.
- **Don't** use bouncy or elastic easing. The system curve is `cubic-bezier(.2,.7,.2,1)` (ease-out-quart-ish). Nothing overshoots.
- **Don't** use em dashes in copy. Commas, colons, semicolons, periods, parentheses.
