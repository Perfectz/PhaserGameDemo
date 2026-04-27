# AGENTS.md

## Project Goals

Build a clean, playable 2.5D beat 'em up prototype in Phaser 3, TypeScript, and Vite. The game should run in a browser now and remain easy to package later with Capacitor for Android and iOS.

Do not add final art until the core gameplay feels good. Placeholder rectangles, circles, generated debug shapes, and simple text are preferred at this stage.

## Architecture Rules

- Keep scenes focused on Phaser lifecycle, rendering, input collection, and scene transitions.
- Put reusable gameplay behavior in `src/game/systems`.
- Put character logic in `src/game/entities`.
- Put tunable values and level definitions in `src/game/data` and `src/game/utils/constants.ts`.
- Prefer small incremental changes over broad rewrites.
- Avoid hard-coding final art paths or production asset assumptions.
- Keep the project mobile-friendly and responsive.

## Coding Conventions

- Use TypeScript strict mode.
- Keep classes small enough to understand at a glance.
- Add comments only where they explain non-obvious gameplay intent or future extension points.
- Use explicit names for state, timing, damage, range, and movement constants.
- Keep combat numbers tunable through constants or data modules.
- Preserve keyboard controls while adding touch features.

## Run And Test

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Production build check:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Current Prototype Rules

- The player should move left, right, up, and down inside the walkable street area.
- Render depth should come from Y position.
- Punch hitboxes should be visible for debugging.
- Enemies should chase, stop in range, attack on cooldown, take damage, and be removed after defeat.
- Stage progression should remain wave-based and easy to tune.
- UI should remain readable on phone-sized screens.

## Future Work Guidance

- Improve feel before adding art.
- Add moves one at a time and keep each move data-driven.
- Add enemy types through `enemyTypes.ts` instead of branching throughout the AI.
- Add levels through `levels.ts`.
- Keep systems modular so future Codex sessions can safely change one gameplay area at a time.
