---
version: 1
slug: "src-styles-css"
primary_target: "src/styles.css"
related_targets: ["src/App.tsx"]
---

# Serix app shell (all screens)

Scope: the whole installable app (Home, Workout, Routines, Exercises, Progress, Profile and sheets). Mode: Operate.
Audience and job: gym-goers, mostly beginners and intermediates, logging sets between sets with one hand under harsh gym light; reviewing progress at home.
Chosen direction: «Producto monocromo» (challenger, won a 5-agent vote 3–2 over «Cuaderno de entrenamiento»), raised with two traits voters asked for from the runner-up: the orange ribbon that marks where you are, and big tabular numerals with character.
Memorable moment: the orange ribbon hanging from the card you are on (next workout, current set, active tab) and the big engraved-feeling numbers.

## Direction contract

THESIS: A quiet, precise neutral instrument where only two things speak: the numbers you lift and one orange ribbon marking where you are. Refuses the category default of glowing dark cards with neon accents everywhere.

OWN-WORLD: Fine neutral scale (paper white and graphite in light; carbon and smoke in dark), 1px hairlines instead of gray fills and shadows, generous radius-14 surfaces, one orange accent used for the primary action and the ribbon only. Archivo (self-hosted, OFL) expanded and heavy for numerals and large titles, system UI text for everything else; tabular figures everywhere data lives; section labels in small tracked capitals.

STORY: The user opens Serix, sees at once what is next (ribbon on it) and how the week goes in big numbers, taps one orange button and trains; afterwards numbers tell progress without noise.

FIRST VIEWPORT: Home on a phone: date small, greeting as large Archivo title; the next-workout card full width in white with hairline, the orange ribbon hanging from its top-right edge, routine name in Archivo, exercises as a quiet list, and the full-width orange Start button at the bottom of the card; below, the week strip and three big-number tiles.

FORM: «Producto monocromo» (challenger digital-design-canon-monochrome-product-marketing) adopted after the vote, not on my own ranked list; seed key daff820c. Signature interaction: the ribbon slides to the item you are on (next set during a workout, active tab) with a short ease-out; numbers count with tabular digits.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
