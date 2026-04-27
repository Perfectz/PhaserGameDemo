import Phaser from 'phaser';
import { enemyTypes } from '../data/enemyTypes';
import {
  DESTRUCTIBLE_FRAME_HEIGHT,
  DESTRUCTIBLE_FRAME_WIDTH,
  DESTRUCTIBLE_SPRITE_KEY,
  CYBER_STAGE_SHEET_KEY,
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
  TITLE_SCREEN_IMAGE_KEY,
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
  SFX_ENEMY_DEFEAT_KEY,
  SFX_HIT_HEAVY_KEY,
  SFX_HIT_LIGHT_KEY,
  SFX_JUMP_KEY,
  SFX_KICK_SWING_KEY,
  SFX_PICKUP_KEY,
  SFX_PROP_BREAK_KEY,
  SFX_PROP_HIT_KEY,
  SFX_PUNCH_SWING_KEY,
  SETPIECE_NEON_GATE_KEY,
  SETPIECE_OVERPASS_SIGN_KEY,
  SETPIECE_RAISED_WALKWAY_KEY,
  SETPIECE_STAIRS_RAMP_KEY,
  SETPIECE_STREET_KIOSK_KEY,
  SETPIECE_SUBWAY_ENTRANCE_KEY,
  SFX_SPECIAL_KEY,
  SFX_UI_PAUSE_KEY,
  SFX_UI_SELECT_KEY,
  TITLE_SCREEN_MUSIC_KEY,
} from '../utils/constants';

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

export class PreloadScene extends Phaser.Scene {
  private progressFill?: Phaser.GameObjects.Rectangle;
  private progressText?: Phaser.GameObjects.Text;
  private failedAssetCount = 0;

  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.createLoadingDisplay();
    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => this.updateLoadingDisplay(progress));
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => this.handleLoadError());

    this.load.image(TITLE_SCREEN_IMAGE_KEY, titleScreenUrl);
    this.load.audio(TITLE_SCREEN_MUSIC_KEY, titleScreenMusicUrl);
    this.load.audio(LEVEL_1_MUSIC_KEY, level1MusicUrl);
    this.load.audio(LEVEL_2_MUSIC_KEY, level2MusicUrl);
    this.load.spritesheet(PLAYER_IDLE_SPRITE_KEY, playerIdleSpriteUrl, {
      frameWidth: PLAYER_IDLE_FRAME_WIDTH,
      frameHeight: PLAYER_IDLE_FRAME_HEIGHT,
    });
    this.load.spritesheet(PLAYER_WALK_SPRITE_KEY, playerWalkSpriteUrl, {
      frameWidth: PLAYER_WALK_FRAME_WIDTH,
      frameHeight: PLAYER_WALK_FRAME_HEIGHT,
    });
    playerActionSprites.forEach(([key, url]) => {
      this.load.spritesheet(key, url, {
        frameWidth: PLAYER_ACTION_FRAME_WIDTH,
        frameHeight: PLAYER_ACTION_FRAME_HEIGHT,
      });
    });
    const enemySpriteKeys = new Set(
      Object.values(enemyTypes).flatMap((enemyType) =>
        Object.values(enemyType.animations).map((animation) => animation.spriteKey),
      ),
    );
    enemySpriteKeys.forEach((spriteKey) => {
      this.load.spritesheet(spriteKey, enemySpriteUrls[spriteKey as keyof typeof enemySpriteUrls], {
        frameWidth: ENEMY_SPRITE_FRAME_WIDTH,
        frameHeight: ENEMY_SPRITE_FRAME_HEIGHT,
      });
    });
    runGunEnemySprites.forEach(([key, url]) => {
      this.load.spritesheet(key, url, {
        frameWidth: ENEMY_SPRITE_FRAME_WIDTH,
        frameHeight: ENEMY_SPRITE_FRAME_HEIGHT,
      });
    });
    this.load.spritesheet(DESTRUCTIBLE_SPRITE_KEY, destructiblesSpriteUrl, {
      frameWidth: DESTRUCTIBLE_FRAME_WIDTH,
      frameHeight: DESTRUCTIBLE_FRAME_HEIGHT,
    });
    this.load.atlas(CYBER_STAGE_SHEET_KEY, cyberStageSheetUrl, cyberStageSheetAtlasUrl);
    backgroundImages.forEach(([key, url]) => {
      this.load.image(key, url);
    });
    setpieceImages.forEach(([key, url]) => {
      this.load.image(key, url);
    });
    uiImages.forEach(([key, url]) => {
      this.load.image(key, url);
    });
    sfxAudio.forEach(([key, url]) => {
      this.load.audio(key, url);
    });
  }

  create(): void {
    this.load.off(Phaser.Loader.Events.PROGRESS);
    this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR);
    this.scene.start('MainMenuScene');
  }

  private createLoadingDisplay(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x07090d, 1).setOrigin(0);
    this.add.text(centerX, centerY - 58, 'NEON BRAWLER', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '32px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.rectangle(centerX, centerY, 420, 18, 0x101823, 1)
      .setStrokeStyle(2, 0x8ecae6, 0.72);
    this.progressFill = this.add.rectangle(centerX - 206, centerY, 412, 10, 0xffd166, 1)
      .setOrigin(0, 0.5)
      .setScale(0, 1);
    this.progressText = this.add.text(centerX, centerY + 36, 'LOADING 0%', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '14px',
      color: '#9fd3ff',
    }).setOrigin(0.5);
  }

  private updateLoadingDisplay(progress: number): void {
    this.progressFill?.setScale(Phaser.Math.Clamp(progress, 0, 1), 1);
    this.progressText?.setText(`LOADING ${Math.round(progress * 100)}%`);
  }

  private handleLoadError(): void {
    this.failedAssetCount += 1;
    this.progressText?.setText(`LOADING... ${this.failedAssetCount} ASSET RETRY NEEDED`);
    this.progressText?.setColor('#ffd166');
  }
}
