# Neon Brawler Prototype

A first playable browser prototype for a mobile-friendly 2.5D beat 'em up inspired by classic arcade brawlers. This version uses placeholder shapes only so the movement, combat feel, wave flow, and architecture can be improved before final art is added.

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
- 2.5D street movement with lane constraints
- Y-based render depth for characters
- Placeholder player with health, facing, state tracking, movement, damage, and punch
- Keyboard controls for desktop testing
- Controller controls for desktop and mobile browser testing
- Touch control scaffolding with joystick and action buttons
- Placeholder enemy with health, chase AI, cooldown attacks, knockback, and defeat fade-out
- Combat system with visible short-lived debug hitboxes
- Punch, kick, jump, and special key/button actions
- Pause menu with current controls
- Game over screen with restart button
- One simple street level with two waves
- Camera follow in a wider scrolling world
- HUD with player health, enemy count, player state, level, wave, and stage clear text

## Next Recommended Tasks

- Tune movement speeds, hit timing, enemy range, and knockback until the core feel is solid.
- Add proper kick, jump, and special move implementations.
- Add hit-stop, impact flashes, and screen feedback once readability is stable.
- Add collision between enemies and player so bodies do not overlap too much.
- Add a simple pause menu and restart flow.
- Add Capacitor once the browser prototype has a stable control scheme.
- Keep using placeholder art until core combat and level pacing feel good.
