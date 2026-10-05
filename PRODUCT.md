# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who train in a gym, mainly beginners and intermediates: the owner and his friends, in Spain (Spanish first, English also supported). They use it between sets, phone in one hand, with little attention to spare and often in a noisy gym with harsh lighting. Outside the gym they review progress, plan routines and compare with friends.

## Product Purpose

Serix is a free gym log and coach in the pocket: routines generated for the user's goal and equipment, fast set logging, automatic weight progression, rest timer, and progress statistics. Success is training more consistently and progressing, with the app getting out of the way during the workout.

## Positioning

Free, with no accounts and no servers: all data stays on the phone (installable PWA that works offline). Features that usually sit behind paid apps (automatic progression, blocks with deloads, 5/3/1, muscle maps, challenges with friends via links, progress photos) are free and private.

## Operating Context

- During a workout: full-screen workout view, tick sets, rest countdown (also on the lock screen on Android), voice cues, interval timers.
- Between workouts: Home (next routine, week, streak), Routines (programs, library, blocks), Exercises (catalogue of ~900 with own muscle maps and animated figures), Progress (summary, muscles, history, records, badges), Profile (settings, data, friends, photos).
- Sharing happens through links, QR codes and generated images (WhatsApp, Instagram).

## Capabilities and Constraints

- React 19 + TypeScript + Vite, hand-written CSS in `src/styles.css` (tokens on `:root`, light and dark themes, manual theme override), hash router, IndexedDB storage, GitHub Pages hosting.
- Must keep: every existing feature, text and flow; Spanish and English; light and dark themes; offline use; Lighthouse accessibility 100 on every screen (contrast, labels, focus); phone-first layout with safe areas.
- No paid APIs, no external fonts or trackers loaded at runtime (privacy is part of the positioning); any font must be self-hosted and licensed for redistribution.
- Licence: PolyForm Noncommercial 1.0.0.

## Brand Commitments

- Name «Serix».
- The user prefers to keep the current app icon and the orange as brand colour, but nothing is strictly binding: changes are allowed if they clearly improve the result (user answer, 2026-10-05).
- Feedback from several users: the current design feels poor or too simple; the goal is a more premium finish (full redesign approved, 2026-10-05).

## Evidence on Hand

- Own muscle-map artwork (`src/components/muscleShapes`, `MuscleMap.tsx`) and animated exercise figures (`MoveFigure.tsx`).
- Exercise catalogue with own Spanish and English texts (`public/exercises_es.json`).
- No testimonials, user numbers, press or reviews exist; none may be invented.

## Product Principles

1. The workout comes first: in the gym, every screen must be readable at a glance and operable with one thumb.
2. Private by design: nothing leaves the phone unless the user shares it.
3. Free and complete: no upsell, no locked features.
4. Coach, do not nag: suggestions are proposals the user accepts, never silent changes.
5. Beginners first, depth on demand (simple mode).

## Accessibility & Inclusion

Lighthouse accessibility 100 in light and dark, Spanish and English, on all screens; respects reduced motion; usable with large text and in bright gym lighting.
