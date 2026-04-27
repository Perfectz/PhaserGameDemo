# Neon Brawler Prototype

A browser-playable, mobile-friendly Phaser prototype with a 2.5D brawler stage and a side-scrolling run-and-gun test stage. The project builds to static files in `dist/` and is ready to host on GitHub Pages or any static web host.

## Tech Stack

- Phaser 3
- TypeScript
- Vite
- HTML5 Canvas/WebGL
- Mobile-first responsive scaling
- Structured so Capacitor can be added later for Android/iOS packaging

## Run Locally

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Play Online

The production build is static. After `npm run build`, upload the contents of `dist/` to a static host.

This repo includes `.github/workflows/deploy-pages.yml`, which builds and deploys `dist/` to GitHub Pages on pushes to `main` or from a manual workflow run.

## Controls

- Move: `WASD` or arrow keys
- Punch: `J`
- Kick: `K`
- Jump: `Space` or `L`
- Special: `I`
- Shoot: `O`
- Pause and instructions: `P`, `Esc`, or the Pause button
- Restart after game over: `R` or the Restart button
- Touch: left-side virtual joystick, right-side Punch, Kick, Jump, and Special buttons
- Controller: left stick or D-pad move, `A` jump/start, `X` punch/shoot in run-gun, `B` kick/cancel, `Y` special/run-gun menu, `RB` or `RT` shoot, `LB` or `LT` run, `Start` pause, `Select` restart after defeat

## Folder Structure

```text
src/
  main.ts
  game/
    config.ts
    scenes/
    entities/
    systems/
    data/
    utils/
```

## Implemented

- Phaser 3 + TypeScript + Vite project scaffold
- Responsive 16:9 game canvas fitting desktop and mobile browsers
- Production loading screen for slower online connections
- Static-host friendly Vite build with relative asset URLs
- GitHub Pages deployment workflow
- Share metadata and preview image for posted links
- 2.5D street movement with lane constraints
- Y-based render depth for characters
- Player with health, facing, state tracking, movement, damage, and multiple attacks
- Keyboard controls for desktop testing
- Controller controls for desktop and mobile browser testing
- Touch control scaffolding with joystick and action buttons
- Enemies with health, chase AI, cooldown attacks, knockback, and defeat fade-out
- Combat system with visible short-lived debug hitboxes
- Punch, kick, jump, and special key/button actions
- Pause menu with current controls
- Game over screen with restart button
- Wave-based brawler stage with stage clear return to title
- Run-and-gun stage with exit clear return to title
- Camera follow in a wider scrolling world
- HUD with player health, enemy count, player state, level, wave, and stage clear text

## Next Recommended Tasks

- Tune movement speeds, hit timing, enemy range, and knockback until the core feel is solid.
- Split title/menu assets from gameplay assets if the first online load needs to get smaller.
- Add browser automation once a test dependency is accepted for the repo.
- Add Capacitor once the browser prototype has a stable control scheme.
- Keep tuning combat feel and level pacing before adding more final art.
