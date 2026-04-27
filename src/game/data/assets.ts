import { enemyTypes } from './enemyTypes';
import {
  CYBER_STAGE_SHEET_KEY,
  DESTRUCTIBLE_FRAME_HEIGHT,
  DESTRUCTIBLE_FRAME_WIDTH,
  DESTRUCTIBLE_SPRITE_KEY,
  ENEMY_SPRITE_FRAME_HEIGHT,
  ENEMY_SPRITE_FRAME_WIDTH,
  LEVEL_1_MUSIC_KEY,
  LEVEL_2_MUSIC_KEY,
  PLAYER_ACTION_FRAME_HEIGHT,
  PLAYER_ACTION_FRAME_WIDTH,
  PLAYER_DEFEATED_SPRITE_KEY,
  PLAYER_EVADE_SPRITE_KEY,
  PLAYER_GUN_AIM_SPRITE_KEY,
  PLAYER_HURT_SPRITE_KEY,
  PLAYER_IDLE_FRAME_HEIGHT,
  PLAYER_IDLE_FRAME_WIDTH,
  PLAYER_IDLE_SPRITE_KEY,
  PLAYER_JUMP_SPRITE_KEY,
  PLAYER_KICK_SPRITE_KEY,
  PLAYER_PUNCH_SPRITE_KEY,
  PLAYER_RUN_SPRITE_KEY,
  PLAYER_SIDE_SCROLL_GUN_RUN_SPRITE_KEY,
  PLAYER_SPECIAL_SPRITE_KEY,
  PLAYER_WALK_FRAME_HEIGHT,
  PLAYER_WALK_FRAME_WIDTH,
  PLAYER_WALK_SPRITE_KEY,
  RUN_GUN_HEAVY_GUNNER_SPRITE_KEY,
  RUN_GUN_HOVER_DRONE_SPRITE_KEY,
  RUN_GUN_RIFLE_PUNK_SPRITE_KEY,
  SFX_ENEMY_DEFEAT_KEY,
  SFX_HIT_HEAVY_KEY,
  SFX_HIT_LIGHT_KEY,
  SFX_JUMP_KEY,
  SFX_KICK_SWING_KEY,
  SFX_PICKUP_KEY,
  SFX_PROP_BREAK_KEY,
  SFX_PROP_HIT_KEY,
  SFX_PUNCH_SWING_KEY,
  SFX_SPECIAL_KEY,
  SFX_UI_PAUSE_KEY,
  SFX_UI_SELECT_KEY,
  SETPIECE_NEON_GATE_KEY,
  SETPIECE_OVERPASS_SIGN_KEY,
  SETPIECE_RAISED_WALKWAY_KEY,
  SETPIECE_STAIRS_RAMP_KEY,
  SETPIECE_STREET_KIOSK_KEY,
  SETPIECE_SUBWAY_ENTRANCE_KEY,
  TITLE_SCREEN_IMAGE_KEY,
  TITLE_SCREEN_MUSIC_KEY,
  UI_ACTION_AMBER_KEY,
  UI_ACTION_TEAL_KEY,
  UI_HEALTH_FILL_KEY,
  UI_HEALTH_FRAME_KEY,
  UI_HUD_PLAYER_PANEL_KEY,
  UI_HUD_WAVE_PANEL_KEY,
  UI_JOYSTICK_KNOB_KEY,
  UI_JOYSTICK_RING_KEY,
  UI_MENU_BUTTON_SHELL_KEY,
  UI_METER_FRAME_KEY,
  UI_MODAL_PANEL_KEY,
  UI_PAUSE_BUTTON_SHELL_KEY,
} from '../utils/constants';

export type GameAsset =
  | { kind: 'image'; key: string; url: string }
  | { kind: 'audio'; key: string; url: string }
  | { kind: 'spritesheet'; key: string; url: string; frameWidth: number; frameHeight: number }
  | { kind: 'atlas'; key: string; textureUrl: string; atlasUrl: string };

const titleScreenUrl = new URL('../../assets/ui/title-screen-v3.png', import.meta.url).href;
const titleScreenMusicUrl = new URL('../../assets/music/title-screen.mp3', import.meta.url).href;
const level1MusicUrl = new URL('../../assets/music/level-1.mp3', import.meta.url).href;
const level2MusicUrl = new URL('../../assets/music/level-2.mp3', import.meta.url).href;
const playerIdleSpriteUrl = new URL('../../assets/player/idle-sprite.png', import.meta.url).href;
const playerWalkSpriteUrl = new URL('../../assets/player/walk-right-sprite.png', import.meta.url).href;
const destructiblesSpriteUrl = new URL('../../assets/environment/destructibles-sheet.png', import.meta.url).href;
const cyberStageSheetUrl = new URL('../../assets/environment/cyber-stage-sheet.png', import.meta.url).href;
const cyberStageSheetAtlasUrl = new URL('../../assets/environment/cyber-stage-sheet.json', import.meta.url).href;

const playerActionSprites = [
  [PLAYER_RUN_SPRITE_KEY, new URL('../../assets/player/run-right-sprite.png', import.meta.url).href],
  [PLAYER_SIDE_SCROLL_GUN_RUN_SPRITE_KEY, new URL('../../assets/player/side-scroll-gun-run-sprite.png', import.meta.url).href],
  [PLAYER_PUNCH_SPRITE_KEY, new URL('../../assets/player/punch-sprite.png', import.meta.url).href],
  [PLAYER_KICK_SPRITE_KEY, new URL('../../assets/player/kick-sprite.png', import.meta.url).href],
  [PLAYER_SPECIAL_SPRITE_KEY, new URL('../../assets/player/special-sprite.png', import.meta.url).href],
  [PLAYER_JUMP_SPRITE_KEY, new URL('../../assets/player/jump-sprite.png', import.meta.url).href],
  [PLAYER_EVADE_SPRITE_KEY, new URL('../../assets/player/evade-sprite.png', import.meta.url).href],
  [PLAYER_HURT_SPRITE_KEY, new URL('../../assets/player/hurt-sprite.png', import.meta.url).href],
  [PLAYER_DEFEATED_SPRITE_KEY, new URL('../../assets/player/defeated-sprite.png', import.meta.url).href],
  [PLAYER_GUN_AIM_SPRITE_KEY, new URL('../../assets/player/gun-aim-8-sprite.png', import.meta.url).href],
] as const;

const enemySpriteUrls = {
  'enemy-razor-punk-idle': new URL('../../assets/enemies/razor-punk-idle-sprite.png', import.meta.url).href,
  'enemy-razor-punk-walk': new URL('../../assets/enemies/razor-punk-walk-sprite.png', import.meta.url).href,
  'enemy-razor-punk-attack': new URL('../../assets/enemies/razor-punk-attack-sprite.png', import.meta.url).href,
  'enemy-razor-punk-hurt': new URL('../../assets/enemies/razor-punk-hurt-sprite.png', import.meta.url).href,
  'enemy-razor-punk-defeated': new URL('../../assets/enemies/razor-punk-defeated-sprite.png', import.meta.url).href,
  'enemy-iron-bouncer-idle': new URL('../../assets/enemies/iron-bouncer-idle-sprite.png', import.meta.url).href,
  'enemy-iron-bouncer-walk': new URL('../../assets/enemies/iron-bouncer-walk-sprite.png', import.meta.url).href,
  'enemy-iron-bouncer-attack': new URL('../../assets/enemies/iron-bouncer-attack-sprite.png', import.meta.url).href,
  'enemy-iron-bouncer-hurt': new URL('../../assets/enemies/iron-bouncer-hurt-sprite.png', import.meta.url).href,
  'enemy-iron-bouncer-defeated': new URL('../../assets/enemies/iron-bouncer-defeated-sprite.png', import.meta.url).href,
  'enemy-volt-striker-idle': new URL('../../assets/enemies/volt-striker-idle-sprite.png', import.meta.url).href,
  'enemy-volt-striker-walk': new URL('../../assets/enemies/volt-striker-walk-sprite.png', import.meta.url).href,
  'enemy-volt-striker-attack': new URL('../../assets/enemies/volt-striker-attack-sprite.png', import.meta.url).href,
  'enemy-volt-striker-hurt': new URL('../../assets/enemies/volt-striker-hurt-sprite.png', import.meta.url).href,
  'enemy-volt-striker-defeated': new URL('../../assets/enemies/volt-striker-defeated-sprite.png', import.meta.url).href,
  'enemy-neon-warden-idle': new URL('../../assets/enemies/neon-warden-idle-sprite.png', import.meta.url).href,
  'enemy-neon-warden-walk': new URL('../../assets/enemies/neon-warden-walk-sprite.png', import.meta.url).href,
  'enemy-neon-warden-attack': new URL('../../assets/enemies/neon-warden-attack-sprite.png', import.meta.url).href,
  'enemy-neon-warden-hurt': new URL('../../assets/enemies/neon-warden-hurt-sprite.png', import.meta.url).href,
  'enemy-neon-warden-defeated': new URL('../../assets/enemies/neon-warden-defeated-sprite.png', import.meta.url).href,
} as const;

const runGunEnemySprites = [
  [RUN_GUN_RIFLE_PUNK_SPRITE_KEY, new URL('../../assets/enemies/chrome-rifle-punk-sprite.png', import.meta.url).href],
  [RUN_GUN_HOVER_DRONE_SPRITE_KEY, new URL('../../assets/enemies/neon-hover-drone-sprite.png', import.meta.url).href],
  [RUN_GUN_HEAVY_GUNNER_SPRITE_KEY, new URL('../../assets/enemies/iron-arc-heavy-gunner-sprite.png', import.meta.url).href],
] as const;

const backgroundImages = [
  ['training-street-far-skyline', new URL('../../assets/environment/training-street-v2-far-skyline.png', import.meta.url).href],
  ['training-street-mid-buildings', new URL('../../assets/environment/training-street-v2-mid-buildings.png', import.meta.url).href],
  ['training-street-foreground-rail', new URL('../../assets/environment/training-street-v2-foreground-rail.png', import.meta.url).href],
] as const;

const setpieceImages = [
  [SETPIECE_NEON_GATE_KEY, new URL('../../assets/environment/setpieces/setpiece-neon-gate.png', import.meta.url).href],
  [SETPIECE_RAISED_WALKWAY_KEY, new URL('../../assets/environment/setpieces/setpiece-raised-walkway.png', import.meta.url).href],
  [SETPIECE_OVERPASS_SIGN_KEY, new URL('../../assets/environment/setpieces/setpiece-overpass-sign.png', import.meta.url).href],
  [SETPIECE_STAIRS_RAMP_KEY, new URL('../../assets/environment/setpieces/setpiece-stairs-ramp.png', import.meta.url).href],
  [SETPIECE_STREET_KIOSK_KEY, new URL('../../assets/environment/setpieces/setpiece-street-kiosk.png', import.meta.url).href],
  [SETPIECE_SUBWAY_ENTRANCE_KEY, new URL('../../assets/environment/setpieces/setpiece-subway-entrance.png', import.meta.url).href],
] as const;

const uiImages = [
  [UI_HUD_PLAYER_PANEL_KEY, new URL('../../assets/ui/ui-hud-player-panel.png', import.meta.url).href],
  [UI_HUD_WAVE_PANEL_KEY, new URL('../../assets/ui/ui-hud-wave-panel.png', import.meta.url).href],
  [UI_PAUSE_BUTTON_SHELL_KEY, new URL('../../assets/ui/ui-pause-button-shell.png', import.meta.url).href],
  [UI_MODAL_PANEL_KEY, new URL('../../assets/ui/ui-modal-panel.png', import.meta.url).href],
  [UI_HEALTH_FRAME_KEY, new URL('../../assets/ui/ui-health-frame.png', import.meta.url).href],
  [UI_HEALTH_FILL_KEY, new URL('../../assets/ui/ui-health-fill.png', import.meta.url).href],
  [UI_METER_FRAME_KEY, new URL('../../assets/ui/ui-meter-frame.png', import.meta.url).href],
  [UI_MENU_BUTTON_SHELL_KEY, new URL('../../assets/ui/ui-menu-button-shell.png', import.meta.url).href],
  [UI_JOYSTICK_RING_KEY, new URL('../../assets/ui/ui-joystick-ring.png', import.meta.url).href],
  [UI_JOYSTICK_KNOB_KEY, new URL('../../assets/ui/ui-joystick-knob.png', import.meta.url).href],
  [UI_ACTION_AMBER_KEY, new URL('../../assets/ui/ui-action-amber.png', import.meta.url).href],
  [UI_ACTION_TEAL_KEY, new URL('../../assets/ui/ui-action-teal.png', import.meta.url).href],
] as const;

const sfxAudio = [
  [SFX_PUNCH_SWING_KEY, new URL('../../assets/audio/punch-swing.wav', import.meta.url).href],
  [SFX_KICK_SWING_KEY, new URL('../../assets/audio/kick-swing.wav', import.meta.url).href],
  [SFX_SPECIAL_KEY, new URL('../../assets/audio/special.wav', import.meta.url).href],
  [SFX_JUMP_KEY, new URL('../../assets/audio/jump.wav', import.meta.url).href],
  [SFX_HIT_LIGHT_KEY, new URL('../../assets/audio/hit-light.wav', import.meta.url).href],
  [SFX_HIT_HEAVY_KEY, new URL('../../assets/audio/hit-heavy.wav', import.meta.url).href],
  [SFX_ENEMY_DEFEAT_KEY, new URL('../../assets/audio/enemy-defeat.wav', import.meta.url).href],
  [SFX_PROP_HIT_KEY, new URL('../../assets/audio/prop-hit.wav', import.meta.url).href],
  [SFX_PROP_BREAK_KEY, new URL('../../assets/audio/prop-break.wav', import.meta.url).href],
  [SFX_PICKUP_KEY, new URL('../../assets/audio/pickup.wav', import.meta.url).href],
  [SFX_UI_SELECT_KEY, new URL('../../assets/audio/ui-select.wav', import.meta.url).href],
  [SFX_UI_PAUSE_KEY, new URL('../../assets/audio/ui-pause.wav', import.meta.url).href],
] as const;

const commonSfxKeys = new Set([SFX_UI_SELECT_KEY, SFX_UI_PAUSE_KEY]);
const commonSfx = sfxAudio.filter(([key]) => commonSfxKeys.has(key));
const combatSfx = sfxAudio.filter(([key]) => !commonSfxKeys.has(key));

const enemySpriteAssets: GameAsset[] = Array.from(
  new Set(
    Object.values(enemyTypes).flatMap((enemyType) =>
      Object.values(enemyType.animations).map((animation) => animation.spriteKey),
    ),
  ),
).map((spriteKey) => ({
  kind: 'spritesheet',
  key: spriteKey,
  url: enemySpriteUrls[spriteKey as keyof typeof enemySpriteUrls],
  frameWidth: ENEMY_SPRITE_FRAME_WIDTH,
  frameHeight: ENEMY_SPRITE_FRAME_HEIGHT,
}));

export const commonAssets: GameAsset[] = [
  { kind: 'image', key: TITLE_SCREEN_IMAGE_KEY, url: titleScreenUrl },
  { kind: 'audio', key: TITLE_SCREEN_MUSIC_KEY, url: titleScreenMusicUrl },
  ...commonSfx.map(([key, url]): GameAsset => ({ kind: 'audio', key, url })),
];

export const uiAssets: GameAsset[] = uiImages.map(([key, url]) => ({ kind: 'image', key, url }));

export const brawlerAssets: GameAsset[] = [
  ...uiAssets,
  { kind: 'audio', key: LEVEL_1_MUSIC_KEY, url: level1MusicUrl },
  ...combatSfx.map(([key, url]): GameAsset => ({ kind: 'audio', key, url })),
  { kind: 'spritesheet', key: PLAYER_IDLE_SPRITE_KEY, url: playerIdleSpriteUrl, frameWidth: PLAYER_IDLE_FRAME_WIDTH, frameHeight: PLAYER_IDLE_FRAME_HEIGHT },
  { kind: 'spritesheet', key: PLAYER_WALK_SPRITE_KEY, url: playerWalkSpriteUrl, frameWidth: PLAYER_WALK_FRAME_WIDTH, frameHeight: PLAYER_WALK_FRAME_HEIGHT },
  ...playerActionSprites.map(([key, url]): GameAsset => ({ kind: 'spritesheet', key, url, frameWidth: PLAYER_ACTION_FRAME_WIDTH, frameHeight: PLAYER_ACTION_FRAME_HEIGHT })),
  ...enemySpriteAssets,
  { kind: 'spritesheet', key: DESTRUCTIBLE_SPRITE_KEY, url: destructiblesSpriteUrl, frameWidth: DESTRUCTIBLE_FRAME_WIDTH, frameHeight: DESTRUCTIBLE_FRAME_HEIGHT },
  { kind: 'atlas', key: CYBER_STAGE_SHEET_KEY, textureUrl: cyberStageSheetUrl, atlasUrl: cyberStageSheetAtlasUrl },
  ...backgroundImages.map(([key, url]): GameAsset => ({ kind: 'image', key, url })),
  ...setpieceImages.map(([key, url]): GameAsset => ({ kind: 'image', key, url })),
];

export const shooterAssets: GameAsset[] = [
  ...uiAssets,
  { kind: 'audio', key: LEVEL_2_MUSIC_KEY, url: level2MusicUrl },
  ...combatSfx.map(([key, url]): GameAsset => ({ kind: 'audio', key, url })),
  ...playerActionSprites.map(([key, url]): GameAsset => ({ kind: 'spritesheet', key, url, frameWidth: PLAYER_ACTION_FRAME_WIDTH, frameHeight: PLAYER_ACTION_FRAME_HEIGHT })),
  ...runGunEnemySprites.map(([key, url]): GameAsset => ({ kind: 'spritesheet', key, url, frameWidth: ENEMY_SPRITE_FRAME_WIDTH, frameHeight: ENEMY_SPRITE_FRAME_HEIGHT })),
];

