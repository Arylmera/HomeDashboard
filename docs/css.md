# CSS

Plain CSS, no preprocessor, no utility framework. One stylesheet per page in `src/styles/`.

## Rules

- **One file per page** (`home.css`, `nas.css`, `plex.css`, `homey.css`, `quicklinks.css`). Shared cosmetics in `forge.css` / `space-bg.css`.
- **Import from the page entry** (`main.jsx`): `import '../../styles/home.css';`. Vite handles bundling and scoping at the page level.
- **CSS custom properties for theme tokens** (colors, radii, spacing). Define on `:root` in the shared file, override per-page if needed.
- **Use `rem`/`em` for typography**, `px` for borders and 1px hairlines.
- **Mobile-first media queries**: base styles target small screens; `@media (min-width: …)` adds desktop layout.
- **Avoid `!important`.** If you need it, the selector specificity is wrong.
- **Don't style by tag** alone (`div { … }`) — use a class. Tag selectors leak across the page.

## Naming

- Lowercase-kebab class names: `.service-card`, `.tile-grid`.
- BEM-ish when components grow: `.tile`, `.tile__title`, `.tile--inactive`.

## Pitfalls

- Vite inlines small CSS but emits a separate file for larger stylesheets — both work, no action needed.
- `:has()` and `@container` are fine in modern browsers but check support if targeting older clients.
