# Serix design system

Source of truth: `src/styles.css` (tokens on `:root`, dark tokens in the `prefers-color-scheme` block and `:root[data-theme="dark"]`). Direction contract: `.impeccable/surfaces/src-styles-css.md`. Machine-readable sidecar: `.impeccable/design.json`.

## Thesis

A quiet, precise neutral instrument. Only two things speak: the numbers you lift (big Archivo numerals) and one orange ribbon marking where you are. Everything else is neutral greys, 1px hairlines and system text. It refuses the category default of glowing dark cards with neon accents everywhere.

## Colour

Fills and text are separate tokens: base colours (`--accent`, `--green`, `--red`...) are for fills; `*-text` tokens are the AA-safe versions for text and icons (at least 4.5:1 on the background). Text on an orange or green fill uses `--on-accent` (dark).

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#f1f2f4` | `#08090b` | Page background (paper white / carbon) |
| `--card` | `#ffffff` | `#131417` | Cards, lists, tiles, hero, chips |
| `--card-2` | `#f6f7f8` | `#1b1d21` | Alternate tile (`.tile.alt`) |
| `--fill` | `rgba(14,16,19,.055)` | `rgba(255,255,255,.07)` | Plain buttons, tags, pressed rows |
| `--text` | `#0e1013` | `#f3f4f6` | Primary text |
| `--text-2` | `#50545c` | `#a3a7af` | Secondary text, labels, inactive tabs |
| `--text-3` | `rgba(14,16,19,.3)` | `rgba(255,255,255,.3)` | Chevrons, scrollbar thumb (decorative only) |
| `--separator` | `rgba(14,16,19,.09)` | `rgba(255,255,255,.085)` | Default 1px hairline |
| `--line-strong` | `rgba(14,16,19,.2)` | `rgba(255,255,255,.2)` | Stronger hairline: secondary button, accent tag |
| `--ink` | `#0e1013` | `#f3f4f6` | Selection states (active chip, ink button, active bar), focus ring |
| `--on-ink` | `#ffffff` | `#08090b` | Content on `--ink` |
| `--accent` | `#ff5a1f` | `#ff6a33` | Primary action and the ribbon only |
| `--accent-2` | `#ff7a45` | (inherits) | Secondary orange, light theme only definition |
| `--on-accent` | `#111114` | (inherits) | Text on orange / green fills |
| `--accent-text` | `#b4380a` | `#ff8a5c` | Orange text (AA) |
| `--green` / `--green-soft` | `#1fb655` / `rgba(31,182,85,.13)` | `#30d158` / `rgba(48,209,88,.15)` | Done state fill (`.set-row.done`) |
| `--green-text` | `#15803d` | `#30d158` | Green text (AA) |
| `--red` / `--red-text` | `#ff3b30` / `#c4001a` | (inherits) / `#ff453a` | Destructive |
| `--blue-text` | `#0062cc` | `#0a84ff` | Links / info text |
| `--amber-text` | `#b45f00` | `#f08c00` | Warnings (`.hero-warning` icon) |
| `--gold`, `--blue` | `#f5b400`, `#0a84ff` | (inherit) | Fills (badges, charts) |
| `--bar` | `#ffffff` | `#101114` | Tab bar background |
| `--shadow` | `0 10px 30px rgba(14,16,19,.12)` | `0 10px 30px rgba(0,0,0,.6)` | Floating layers only |

Theme: `color-scheme: light dark` follows the system; Profile can force `data-theme="light"` or `"dark"` on `:root`. The dark set is duplicated verbatim in both dark selectors; keep them in sync.

## Typography

- **Display**: Archivo variable (wdth 62–125%, wght 100–900), self-hosted at `src/assets/fonts/archivo-latin-wdth.woff2`, SIL OFL 1.1, `font-display: swap`. Used only through `--font-display` for large titles and numerals, always weight 800 with `font-stretch` between 100% and 112%:
  - `.large-title h1` 36px / 112% / -0.015em
  - `.hero h2` 30px / 108%; `.hero-fact strong` 22px / 110%
  - `.section-title` 21px / 108%; `.tile .value` 25px / 100%
  - Workout: `.workout-name` 23px / 100%, `.workout-clock` 19px / 110%, `.exercise-name` 18px / 104%
  - Rest timer `.rest-full-time` `min(22vw,15vh)` / 112% / -0.03em
- **Text**: system UI stack (`-apple-system, 'SF Pro Text', 'Segoe UI', Roboto...`), 16px, line-height 1.35. Body, rows, buttons, labels.
- **Numerals**: `font-variant-numeric: tabular-nums` is set globally on `html, body` and restated on data tables, tiles and timers.
- **Section labels**: `.list-header` 12px, 700, uppercase, tracking 0.08em, `--text-2`. These label lists; they are not decorative eyebrows above titles.
- No external font is loaded at runtime (privacy is part of the positioning).

## Surfaces

- Radius: `--radius: 14px` for cards, lists, tiles, hero and active bar. Buttons 12px (small 10px), set rows 10px, chips and tags 999px, sheets `18px 18px 0 0`.
- Edges: 1px `--separator` hairlines instead of grey fills or shadows. List rows are separated by an inset hairline (`left: 16px`).
- Shadow: `--shadow` only on floating layers (active bar, toast, popovers). Resting surfaces are flat. Small exceptions: the segmented control's raised active pill and image previews (QR, share image).
- Backdrops: sheets and dialogs dim with `rgba(0,0,0,.35)`, no blur.

## Components

- **Buttons** (`.btn`, 17px / 700, padding 14x18, press = scale .98 + opacity .85):
  - `primary`: `--accent` fill, `--on-accent` text. The one primary action per view (e.g. Start on the hero).
  - `secondary`: transparent ghost with inset 1px `--line-strong`.
  - `plain`: `--fill` background.
  - `ink`: `--ink` fill, `--on-ink` text. Strong neutral actions.
  - `danger`: `rgba(255,59,48,.12)` fill, `--red-text`.
  - Modifiers: `block` (full width), `small`, `btn-sm`.
- **Chips** (`.chip`): pill, `--card` with inset `--separator` hairline; `active` = `--ink` / `--on-ink`. Selection is ink, never orange.
- **Tags** (`.tag`): `--fill` + `--text-2`; `.tag.accent` is a `--line-strong` outline in `--text` (not orange).
- **Stat band** (`StatBand` in `ui.tsx`, `.stat-band`): the default way to show 2–4 figures. One hairline card split by 1px rules, Archivo 800 values (30px, 26px in three columns), 12.5px `--text-2` labels, no icons. Long volumes use `volumeShort` («17,1 t»). Never show a discouraging zero: fall back to last week or hide the band until there is data.
- **Tiles** (`Tile` in `ui.tsx`): legacy single figure card; prefer the stat band.
- **Best lifts** (`BestLifts` in `Progress.tsx`): top three estimated 1RMs in Archivo under a 2px ink rule, with the 30-day gain.
- **Rep records** (`RepRecordsCard`): rows separated by hairlines; targets that share the same set merge («1–5RM»).
- **Charts** (`charts.tsx`): monochrome. Bars in `--text-2`, thin (42% of the slot); the current (last) bar or point in `--accent` as the "you are here" marker. Axes use round values.
- **Card titles**: text only, no icons.
- **Share images** (`cardStyle.ts`, `shareCard.ts`, `periodCard.ts`): the dark system on a flat `#08090b` ground, the orange ribbon hanging top-right, Archivo embedded as a data URL when converting to PNG, figures in a hairline band, volume always in tonnes. Workouts come as a post (1080×1350) and an Instagram story (1080×1920).
- **Volume**: `tons()` everywhere from 1000 kg («6 t», «17,1 t»).
- **RPE chips** show the reps left under each number («2 más», «fallo»).
- **Lists** (`.list`, `Row`): grouped card with hairline, rows min-height 48px, chevron in `--text-3`, `danger` and `accent` rows use the `*-text` tokens.
- **Hero card** (`NextCard` in `Home.tsx`, `.hero`): white card with hairline, `.hero-ribbon` hanging from the top-right edge, meta line, routine name in Archivo, `.hero-facts` (exercises / minutes / sets) above a hairline, full-width primary Start button.
- **Tab bar** (`TabBar` in `App.tsx`, `.tabbar`): fixed, 5 columns, `--bar` with top hairline, 10.5px labels in `--text-2`; active tab turns `--text` / 700 and gets a 12x10 ribbon dropping from the bar edge.
- **Active bar** (`.active-bar`): floating workout-in-progress pill above the tab bar, `--ink` background, `--shadow`, orange ribbon notch on its left edge.
- **Set rows** (`SetRow` in `Workout.tsx`, `.set-row`): grid row with 40px inputs and 20px Archivo figures; `.current` (first unfinished set) gets a `--fill` row and a 14x34 ribbon sliding in from the card's left edge; `.done` drops the input fills and shows an ink check (no green). «Previous» stays on one line («130×9 @7»).
- **RPE** (`RpeRow`): one row of eight 44px chips between hairlines, no nested box; closes itself on pick.
- **Rest bar**: «DESCANSO» label over a 30px Archivo countdown, −15 / +15 / Skip on the right, and a 3px orange line along the top edge that shrinks with the remaining time.
- **Week** (`WeekCard`): «0 / 3 entrenos» counter; days as loose numbers, today filled orange with a «HOY» label, trained days in ink.
- Also: sheets, action sheets, segmented control, stepper, toast, progress bar (all in `ui.tsx`).

## The ribbon

The single brand motif: an orange (`--accent`) shape cut with `clip-path` that marks "you are here".

| Where | Shape | Motion |
|---|---|---|
| `.hero-ribbon` | 22x44, hangs from top edge, notched bottom | `ribbon-drop 0.6s var(--ease-out)` |
| `.tabbar button.active::before` | 12x10 from the bar's top edge | `ribbon-drop 0.42s var(--ease-out)` |
| `.set-row.current::before` | 9x22, notched right side | `ribbon-slide 0.42s var(--ease-out)` |
| `.set-row.current::before` (size) | 14x34 | (as above) |
| `.active-bar::before` | 9x22, notched right side | static |
| `.rest-line` | 3px line on the rest bar's top edge | shrinks with the countdown |
| Today in the week, last bar/point in charts | orange fill | static |

- `ribbon-drop`: `translateY(-110%)` to `0`. `ribbon-slide`: `translateX(-110%)` to `0`.
- `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`.
- This is the only signature motion. Other motion is functional (sheet `slide-up`, `fade`, button press, rest-done pulse).
- Reduced motion: `prefers-reduced-motion: reduce` collapses every animation and transition to 0.01ms, so ribbons appear in place.
- Related "current" markers in orange: `.guide li.current .guide-mark`, `.block-dots span.current`.

## Browser surfaces

- Selection: `color-mix(in srgb, var(--accent) 28%, transparent)` with `--text`.
- Caret: `caret-color: var(--accent)`.
- Focus: `:focus-visible` 2px solid `--ink`, offset 2px (black in light, near-white in dark).
- Scrollbar: `scrollbar-color: var(--text-3) transparent`; horizontal chip rails hide it.
- Tap highlight disabled; `overscroll-behavior` contained on sheets and full-screen layers.

## Accessibility commitments

- Lighthouse accessibility 100 on every screen, light and dark, Spanish and English.
- Text contrast at least 4.5:1: coloured text always uses a `*-text` token, never the fill colour; text on orange uses `--on-accent`.
- Visible focus ring in ink on every interactive element.
- Minimum touch rows 48px; respects reduced motion; decorative ribbons are `aria-hidden`.

## Do / Don't

Do
- Keep orange for the primary action and the ribbon ("where you are") only.
- Use `--ink` / `--on-ink` for selection states (chips, segmented control, RPE, done checks).
- Use 1px hairlines and `--radius` for surfaces; shadow only when something floats.
- Set numbers in Archivo 800 with tabular figures.

Don't
- No kickers or eyebrows above titles.
- No coloured `border-left` thicker than 1px (the superset `.group-box` uses 1px `--accent`, the maximum).
- No gradients, except the muscle-map illustration (`--mm-bg-*` panels and `.mm-key-*` legend swatches).
- Muscles in the map, thumbnails and movement figures use a muted orange (`--mm-p*`, `--mm-s*`, `--mm-l*`, `--mm-fs*`), never the vivid `--accent`: the vivid orange stays for the primary action and the ribbon. Share images keep their own vivid palette.
- No glass or `backdrop-filter` blur.
- No orange for non-primary things (tags, chips, selected states, decorative icons, action rows).
- No green or blue for "good" deltas: positive changes are ink and bold; only losses use `--red-text`.
- No runtime-loaded fonts, trackers or invented tokens.

## Provenance

No raster images were generated in this redesign. The only third-party asset is the Archivo font (SIL OFL 1.1), file `src/assets/fonts/archivo-latin-wdth.woff2` taken unmodified from `@fontsource-variable/archivo` 5.3.0, credited in `public/licenses.txt`, `README.md` and the Legal screen (`src/screens/Legal.tsx`).
