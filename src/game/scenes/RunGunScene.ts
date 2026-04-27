import Phaser from 'phaser';
import { shooterAssets } from '../data/assets';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  LEVEL_2_MUSIC_KEY,
  PLAYER_GUN_AIM_SPRITE_KEY,
  PLAYER_SHOT_DAMAGE,
  PLAYER_SHOT_SPEED,
  PLAYER_SIDE_SCROLL_GUN_RUN_FRAME_COUNT,
  PLAYER_SIDE_SCROLL_GUN_RUN_FRAME_RATE,
  PLAYER_SIDE_SCROLL_GUN_RUN_SPRITE_KEY,
  RUN_GUN_ENEMY_FRAME_COUNT,
  RUN_GUN_HEAVY_GUNNER_SPRITE_KEY,
  RUN_GUN_HOVER_DRONE_SPRITE_KEY,
  RUN_GUN_RIFLE_PUNK_SPRITE_KEY,
  SFX_HIT_LIGHT_KEY,
  SFX_JUMP_KEY,
  SFX_PUNCH_SWING_KEY,
  SFX_UI_SELECT_KEY,
} from '../utils/constants';
import { areAssetsLoaded, loadAssetsThenStart } from '../systems/AssetLoaderSystem';
import { GamepadControls } from '../systems/GamepadControls';
import { formatRunTime, recordBestTime } from '../systems/DemoProgressSystem';
import { RunGunEffectsSystem } from '../systems/RunGunEffectsSystem';
import { RunGunHudSystem } from '../systems/RunGunHudSystem';
import { RUN_GUN_CHECKPOINTS, RUN_GUN_GOAL_X, RUN_GUN_WORLD_WIDTH, RunGunLevelBuilder } from '../systems/RunGunLevelBuilder';
import { TouchControls } from '../systems/TouchControls';
import { playLoopingMusic, playSfx, stopMusic } from '../systems/SoundSystem';
import { playFullscreenVideoOverlay } from '../systems/VideoOverlaySystem';
import { MovementInput } from '../utils/types';

interface RunGunEnemy {
  sprite: Phaser.Physics.Arcade.Sprite;
  healthBack: Phaser.GameObjects.Rectangle;
  healthFill: Phaser.GameObjects.Rectangle;
  health: number;
  maxHealth: number;
  baseY: number;
  nextShotAt: number;
  fireDelayMs: number;
  bulletSpeed: number;
  damage: number;
  hover: boolean;
}

interface RunGunBullet {
  body: Phaser.GameObjects.Rectangle;
  velocity: Phaser.Math.Vector2;
  bornAt: number;
  damage: number;
}

const PLAYER_SCALE = 0.58;
const PLAYER_SPEED_X = 274;
const JUMP_SPEED = -548;
const RUN_GUN_STARTING_LIVES = 15;
const SHOT_COOLDOWN_MS = 112;
const SHOT_LIFESPAN_MS = 850;
const RUN_GUN_EVADE_SPEED_X = 690;
const RUN_GUN_EVADE_DURATION_MS = 190;
const RUN_GUN_EVADE_INVULNERABLE_MS = 310;
const RUN_GUN_EVADE_COOLDOWN_MS = 520;
const RUN_GUN_COYOTE_TIME_MS = 115;
const RUN_GUN_JUMP_BUFFER_MS = 120;
const RUN_GUN_JUMP_CUT_MULTIPLIER = 0.48;
const RUN_GUN_RESPAWN_INVULNERABLE_MS = 1400;
const RUN_GUN_ENEMY_ACTIVE_AHEAD = 760;
const RUN_GUN_ENEMY_ACTIVE_BEHIND = 180;
const RUN_GUN_ENEMY_SHOT_WARNING_MS = 220;
const RUN_GUN_ENEMY_BULLET_SPEED_MULTIPLIER = 0.88;
const RUN_GUN_READY_HOLD_MS = 950;
const deathVideoUrl = new URL('../../assets/video/death.mp4', import.meta.url).href;
const level2WinVideoUrl = new URL('../../assets/video/level2win.mp4', import.meta.url).href;

export class RunGunScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private platforms?: Phaser.Physics.Arcade.StaticGroup;
  private bullets: RunGunBullet[] = [];
  private enemyBullets: RunGunBullet[] = [];
  private enemies: RunGunEnemy[] = [];
  private facing: -1 | 1 = 1;
  private nextShotAt = 0;
  private lives = 3;
  private touchControls?: TouchControls;
  private gamepadControls?: GamepadControls;
  private playerTextureKey = '';
  private playerInvulnerableUntil = 0;
  private lastGroundedAt = 0;
  private jumpBufferedUntil = 0;
  private jumpWasHeld = false;
  private checkpointX = 120;
  private evadingUntil = 0;
  private evadeCooldownUntil = 0;
  private evadeDirection: -1 | 1 = 1;
  private stageCleared = false;
  private endingSequenceActive = false;
  private isPaused = false;
  private isReturningToTitle = false;
  private levelStartedAt = 0;
  private effects?: RunGunEffectsSystem;
  private hud?: RunGunHudSystem;

  constructor() {
    super('RunGunScene');
  }

  create(): void {
    if (this.loadShooterAssets()) {
      return;
    }

    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.facing = 1;
    this.nextShotAt = 0;
    this.lives = RUN_GUN_STARTING_LIVES;
    this.playerTextureKey = '';
    this.playerInvulnerableUntil = 0;
    this.lastGroundedAt = 0;
    this.jumpBufferedUntil = 0;
    this.jumpWasHeld = false;
    this.checkpointX = 120;
    this.evadingUntil = 0;
    this.evadeCooldownUntil = 0;
    this.evadeDirection = 1;
    this.stageCleared = false;
    this.endingSequenceActive = false;
    this.isPaused = false;
    this.isReturningToTitle = false;
    this.levelStartedAt = this.time.now;
    this.effects = new RunGunEffectsSystem(this);
    this.hud = new RunGunHudSystem(this, () => this.setRunGunPause(false), () => this.returnToTitle());
    playLoopingMusic(this, LEVEL_2_MUSIC_KEY, 0.34);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopLevelMusic();
      this.scale.off('resize', this.handleResize, this);
    });
    this.createAnimations();
    this.platforms = new RunGunLevelBuilder(this).create();
    this.createEnemies();
    this.createPlayer();
    this.hud.create();
    this.hud.showReadyPrompt(RUN_GUN_READY_HOLD_MS);
    this.cameras.main.fadeIn(180, 7, 9, 13);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,E,O,P,SPACE,ENTER,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    this.touchControls = new TouchControls(this);
    this.touchControls.updateLayout(GAME_WIDTH, GAME_HEIGHT);
    this.gamepadControls = new GamepadControls(this);
    this.scale.off('resize', this.handleResize, this);
    this.scale.on('resize', this.handleResize, this);
  }

  private loadShooterAssets(): boolean {
    if (areAssetsLoaded(this, shooterAssets)) {
      return false;
    }

    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'LOADING SHOOTER 0%', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '18px',
      color: '#ffd166',
      stroke: '#07090d',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(30000);

    return loadAssetsThenStart(
      this,
      shooterAssets,
      () => {
        this.load.off(Phaser.Loader.Events.PROGRESS);
        this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR);
        loadingText.destroy();
        this.scene.restart();
      },
      (progress) => loadingText.setText(`LOADING SHOOTER ${Math.round(progress * 100)}%`),
      () => loadingText.setText('LOADING SHOOTER... RETRY NEEDED'),
    );
  }

  update(_time: number, deltaMs: number): void {
    if (!this.player || !this.platforms) {
      return;
    }

    if (this.isPaused) {
      this.handlePauseInput();
      this.updateHud();
      return;
    }

    if (this.endingSequenceActive) {
      this.updateHud();
      return;
    }

    this.updatePlayer();
    this.updateCheckpointProgress();
    this.checkStageClear();
    if (this.stageCleared) {
      this.updateHud();
      return;
    }

    this.updateBullets(deltaMs);
    this.updateEnemyBullets(deltaMs);
    this.updateEnemies(deltaMs);
    this.checkRespawn();
    this.updateHud();
  }

  private createAnimations(): void {
    if (!this.anims.exists('run-gun-player-run')) {
      this.anims.create({
        key: 'run-gun-player-run',
        frames: this.anims.generateFrameNumbers(PLAYER_SIDE_SCROLL_GUN_RUN_SPRITE_KEY, {
          start: 0,
          end: PLAYER_SIDE_SCROLL_GUN_RUN_FRAME_COUNT - 1,
        }),
        frameRate: PLAYER_SIDE_SCROLL_GUN_RUN_FRAME_RATE,
        repeat: -1,
      });
    }
    this.createEnemyAnimation('run-gun-rifle-punk-fire', RUN_GUN_RIFLE_PUNK_SPRITE_KEY, 7);
    this.createEnemyAnimation('run-gun-hover-drone-fire', RUN_GUN_HOVER_DRONE_SPRITE_KEY, 8);
    this.createEnemyAnimation('run-gun-heavy-gunner-fire', RUN_GUN_HEAVY_GUNNER_SPRITE_KEY, 6);
  }

  private createEnemyAnimation(key: string, textureKey: string, frameRate: number): void {
    if (this.anims.exists(key)) {
      return;
    }

    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers(textureKey, {
        start: 0,
        end: RUN_GUN_ENEMY_FRAME_COUNT - 1,
      }),
      frameRate,
      repeat: -1,
    });
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(120, 360, PLAYER_GUN_AIM_SPRITE_KEY, 0);
    this.player.setOrigin(0.5, 1);
    this.player.setScale(PLAYER_SCALE);
    this.player.setSize(66, 168);
    this.player.setOffset(95, 72);
    this.player.setCollideWorldBounds(false);
    this.physics.add.collider(this.player, this.platforms!);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1, -180, 96);
  }

  private createEnemies(): void {
    [
      {
        x: 540,
        y: 492,
        textureKey: RUN_GUN_RIFLE_PUNK_SPRITE_KEY,
        animationKey: 'run-gun-rifle-punk-fire',
        health: 30,
        scale: 0.54,
        fireDelayMs: 1350,
        bulletSpeed: 300,
        damage: 1,
        hover: false,
      },
      {
        x: 820,
        y: 318,
        textureKey: RUN_GUN_RIFLE_PUNK_SPRITE_KEY,
        animationKey: 'run-gun-rifle-punk-fire',
        health: 30,
        scale: 0.54,
        fireDelayMs: 1500,
        bulletSpeed: 305,
        damage: 1,
        hover: false,
      },
      {
        x: 1160,
        y: 360,
        textureKey: RUN_GUN_HOVER_DRONE_SPRITE_KEY,
        animationKey: 'run-gun-hover-drone-fire',
        health: 24,
        scale: 0.48,
        fireDelayMs: 1120,
        bulletSpeed: 355,
        damage: 1,
        hover: true,
      },
      {
        x: 1320,
        y: 430,
        textureKey: RUN_GUN_RIFLE_PUNK_SPRITE_KEY,
        animationKey: 'run-gun-rifle-punk-fire',
        health: 30,
        scale: 0.54,
        fireDelayMs: 1480,
        bulletSpeed: 305,
        damage: 1,
        hover: false,
      },
      {
        x: 1660,
        y: 258,
        textureKey: RUN_GUN_HOVER_DRONE_SPRITE_KEY,
        animationKey: 'run-gun-hover-drone-fire',
        health: 24,
        scale: 0.48,
        fireDelayMs: 1050,
        bulletSpeed: 360,
        damage: 1,
        hover: true,
      },
      {
        x: 2050,
        y: 276,
        textureKey: RUN_GUN_HEAVY_GUNNER_SPRITE_KEY,
        animationKey: 'run-gun-heavy-gunner-fire',
        health: 52,
        scale: 0.62,
        fireDelayMs: 1800,
        bulletSpeed: 275,
        damage: 2,
        hover: false,
      },
      {
        x: 2360,
        y: 420,
        textureKey: RUN_GUN_RIFLE_PUNK_SPRITE_KEY,
        animationKey: 'run-gun-rifle-punk-fire',
        health: 30,
        scale: 0.54,
        fireDelayMs: 1380,
        bulletSpeed: 315,
        damage: 1,
        hover: false,
      },
      {
        x: 2660,
        y: 492,
        textureKey: RUN_GUN_HEAVY_GUNNER_SPRITE_KEY,
        animationKey: 'run-gun-heavy-gunner-fire',
        health: 60,
        scale: 0.64,
        fireDelayMs: 1750,
        bulletSpeed: 280,
        damage: 2,
        hover: false,
      },
      {
        x: 2940,
        y: 338,
        textureKey: RUN_GUN_HOVER_DRONE_SPRITE_KEY,
        animationKey: 'run-gun-hover-drone-fire',
        health: 24,
        scale: 0.48,
        fireDelayMs: 1020,
        bulletSpeed: 365,
        damage: 1,
        hover: true,
      },
      {
        x: 3260,
        y: 455,
        textureKey: RUN_GUN_RIFLE_PUNK_SPRITE_KEY,
        animationKey: 'run-gun-rifle-punk-fire',
        health: 30,
        scale: 0.54,
        fireDelayMs: 1320,
        bulletSpeed: 320,
        damage: 1,
        hover: false,
      },
    ].forEach((definition, index) => {
      const sprite = this.physics.add.sprite(definition.x, definition.y, definition.textureKey, 0);
      sprite.setOrigin(0.5, 1);
      sprite.setScale(definition.scale);
      sprite.setSize(98, definition.hover ? 82 : 150);
      sprite.setOffset(78, definition.hover ? 90 : 76);
      sprite.setImmovable(true);
      sprite.setVelocity(0, 0);
      sprite.body.allowGravity = false;
      sprite.play(definition.animationKey);
      const healthBack = this.add.rectangle(definition.x, definition.y - (definition.hover ? 70 : 156), 54, 6, 0x07090d, 0.78)
        .setDepth(2260)
        .setVisible(false);
      const healthFill = this.add.rectangle(definition.x - 25, definition.y - (definition.hover ? 70 : 156), 50, 3, 0x8ecae6, 0.92)
        .setOrigin(0, 0.5)
        .setDepth(2261)
        .setVisible(false);
      this.enemies.push({
        sprite,
        healthBack,
        healthFill,
        health: definition.health,
        maxHealth: definition.health,
        baseY: definition.y,
        nextShotAt: this.time.now + 700 + index * 380,
        fireDelayMs: definition.fireDelayMs,
        bulletSpeed: definition.bulletSpeed,
        damage: definition.damage,
        hover: definition.hover,
      });
    });
  }

  private updatePlayer(): void {
    if (!this.player) {
      return;
    }

    if (this.justDown(this.keys?.ESC) || this.justDown(this.keys?.P)) {
      this.setRunGunPause(true);
      return;
    }

    const gamepadInput = this.gamepadControls?.getInput();
    const touchInput = this.touchControls?.getInput();
    if (gamepadInput?.pause || gamepadInput?.cancel) {
      this.setRunGunPause(true);
      return;
    }

    const left = Boolean(this.cursors?.left.isDown || this.keys?.A?.isDown);
    const right = Boolean(this.cursors?.right.isDown || this.keys?.D?.isDown);
    const up = Boolean(this.cursors?.up.isDown || this.keys?.W?.isDown);
    const down = Boolean(this.cursors?.down.isDown || this.keys?.S?.isDown);
    const shoot = Boolean(this.keys?.O?.isDown || touchInput?.actions.shoot || gamepadInput?.shootHeld);
    const jumpPressed = Boolean(this.justDown(this.keys?.SPACE) || this.justDown(this.cursors?.space) || touchInput?.actions.jump || gamepadInput?.actions.jump);
    const jumpHeld = Boolean(this.keys?.SPACE?.isDown || this.cursors?.space?.isDown || touchInput?.actions.jump || gamepadInput?.actions.jump);

    const moveX = Phaser.Math.Clamp((right ? 1 : 0) - (left ? 1 : 0) + (touchInput?.movement.x ?? 0) + (gamepadInput?.movement.x ?? 0), -1, 1);
    if (moveX !== 0) {
      this.facing = moveX > 0 ? 1 : -1;
    }

    const onFloor = Boolean(this.player.body?.blocked.down || this.player.body?.touching.down);
    if (onFloor) {
      this.lastGroundedAt = this.time.now;
    }
    if (jumpPressed) {
      this.jumpBufferedUntil = this.time.now + RUN_GUN_JUMP_BUFFER_MS;
    }
    const keyboardAim = this.getAimDirection(left, right, up, down);
    const gamepadAim = gamepadInput?.aim ?? { x: 0, y: 0 };
    const touchAim = touchInput?.movement ?? { x: 0, y: 0 };
    const aim = this.hasDirection(gamepadAim)
      ? new Phaser.Math.Vector2(gamepadAim.x, gamepadAim.y).normalize()
      : this.hasDirection(touchAim)
        ? new Phaser.Math.Vector2(touchAim.x, touchAim.y).normalize()
        : keyboardAim;

    if (this.justDown(this.keys?.E) || touchInput?.actions.evade || gamepadInput?.actions.evade) {
      this.tryEvade(moveX, aim);
    }

    if (this.time.now < this.evadingUntil) {
      this.player.setVelocityX(this.evadeDirection * RUN_GUN_EVADE_SPEED_X);
      this.showEvadePose();
      return;
    }
    this.player.setAlpha(this.time.now < this.playerInvulnerableUntil ? 0.66 + Math.sin(this.time.now / 42) * 0.18 : 1);

    this.player.setVelocityX(moveX * PLAYER_SPEED_X);

    if (this.jumpBufferedUntil >= this.time.now && this.time.now - this.lastGroundedAt <= RUN_GUN_COYOTE_TIME_MS) {
      this.player.setVelocityY(JUMP_SPEED);
      this.jumpBufferedUntil = 0;
      this.lastGroundedAt = 0;
      playSfx(this, SFX_JUMP_KEY, { volume: 0.34 });
    }
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    if (!jumpHeld && this.jumpWasHeld && playerBody.velocity.y < 0) {
      this.player.setVelocityY(playerBody.velocity.y * RUN_GUN_JUMP_CUT_MULTIPLIER);
    }
    this.jumpWasHeld = jumpHeld;

    if (shoot) {
      this.tryShoot(aim);
      if (moveX !== 0 && onFloor && Math.abs(aim.y) < 0.45) {
        this.showRunPose();
        return;
      }

      this.showAimPose(aim);
      return;
    }

    if (moveX !== 0 && onFloor) {
      this.showRunPose();
    } else {
      this.showIdleGunPose();
    }
  }

  private getAimDirection(left: boolean, right: boolean, up: boolean, down: boolean): Phaser.Math.Vector2 {
    const aim = new Phaser.Math.Vector2((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
    if (aim.lengthSq() <= 0.01) {
      aim.set(this.facing, 0);
    }
    return aim.normalize();
  }

  private hasDirection(movement: MovementInput): boolean {
    return movement.x * movement.x + movement.y * movement.y > 0.01;
  }

  private tryEvade(moveX: number, aim: Phaser.Math.Vector2): boolean {
    if (!this.player || this.time.now < this.evadeCooldownUntil) {
      return false;
    }

    const direction = Math.abs(moveX) > 0.1 ? moveX : Math.abs(aim.x) > 0.1 ? aim.x : this.facing;
    this.evadeDirection = direction >= 0 ? 1 : -1;
    this.facing = this.evadeDirection;
    this.evadingUntil = this.time.now + RUN_GUN_EVADE_DURATION_MS;
    this.evadeCooldownUntil = this.time.now + RUN_GUN_EVADE_COOLDOWN_MS;
    this.playerInvulnerableUntil = Math.max(this.playerInvulnerableUntil, this.time.now + RUN_GUN_EVADE_INVULNERABLE_MS);
    this.player.setVelocityX(this.evadeDirection * RUN_GUN_EVADE_SPEED_X);
    this.player.setAlpha(0.72);
    this.player.setTint(0x8ecae6);
    this.cameras.main.shake(55, 0.0016);
    playSfx(this, SFX_JUMP_KEY, { volume: 0.24, rate: 1.45 });
    this.time.delayedCall(RUN_GUN_EVADE_DURATION_MS, () => {
      this.player?.setAlpha(1);
      if (this.time.now >= this.playerInvulnerableUntil - 20) {
        this.player?.clearTint();
      }
    });
    return true;
  }

  private justDown(key?: Phaser.Input.Keyboard.Key): boolean {
    return key ? Phaser.Input.Keyboard.JustDown(key) : false;
  }

  private showAimPose(aim: Phaser.Math.Vector2): void {
    if (!this.player) {
      return;
    }

    this.player.stop();
    this.setPlayerTexture(PLAYER_GUN_AIM_SPRITE_KEY);
    this.player.setFrame(this.getAimFrame(aim));
    this.player.setScale(PLAYER_SCALE, PLAYER_SCALE);
    if (Math.abs(aim.x) > 0.05) {
      this.facing = aim.x > 0 ? 1 : -1;
    }
  }

  private showRunPose(): void {
    if (!this.player) {
      return;
    }

    this.setPlayerTexture(PLAYER_SIDE_SCROLL_GUN_RUN_SPRITE_KEY);
    this.player.setScale(PLAYER_SCALE * this.facing, PLAYER_SCALE);
    this.player.play('run-gun-player-run', true);
  }

  private showEvadePose(): void {
    if (!this.player) {
      return;
    }

    this.setPlayerTexture(PLAYER_SIDE_SCROLL_GUN_RUN_SPRITE_KEY);
    this.player.setScale(PLAYER_SCALE * this.evadeDirection, PLAYER_SCALE);
    this.player.play('run-gun-player-run', true);
  }

  private showIdleGunPose(): void {
    if (!this.player) {
      return;
    }

    this.player.stop();
    this.setPlayerTexture(PLAYER_GUN_AIM_SPRITE_KEY);
    this.player.setFrame(this.facing > 0 ? 0 : 4);
    this.player.setScale(PLAYER_SCALE, PLAYER_SCALE);
  }

  private setPlayerTexture(textureKey: string): void {
    if (!this.player || this.playerTextureKey === textureKey) {
      return;
    }

    this.player.setTexture(textureKey);
    this.playerTextureKey = textureKey;
  }

  private tryShoot(aim: Phaser.Math.Vector2): void {
    if (!this.player || this.time.now < this.nextShotAt) {
      return;
    }

    const x = this.player.x + aim.x * 48;
    const y = this.player.y - 82 + aim.y * 34;
    this.effects?.spawnPlayerMuzzleFlash(x, y, Math.atan2(aim.y, aim.x));
    const body = this.add.rectangle(x, y, 24, 5, 0xfff35c, 1);
    body.setStrokeStyle(2, 0xffffff, 0.85);
    body.setRotation(Math.atan2(aim.y, aim.x));
    body.setDepth(2000);
    this.physics.add.existing(body);
    const arcadeBody = body.body as Phaser.Physics.Arcade.Body;
    arcadeBody.setAllowGravity(false);
    arcadeBody.setVelocity(aim.x * PLAYER_SHOT_SPEED, aim.y * PLAYER_SHOT_SPEED);
    arcadeBody.setSize(20, 20);
    this.bullets.push({ body, velocity: aim.clone(), bornAt: this.time.now, damage: PLAYER_SHOT_DAMAGE });
    this.nextShotAt = this.time.now + SHOT_COOLDOWN_MS;
    playSfx(this, SFX_PUNCH_SWING_KEY, { volume: 0.18, rate: 1.7 });
  }

  private updateBullets(deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.bullets = this.bullets.filter((bullet) => {
      bullet.body.rotation = Math.atan2(bullet.velocity.y, bullet.velocity.x);

      if (this.time.now - bullet.bornAt > SHOT_LIFESPAN_MS) {
        bullet.body.destroy();
        return false;
      }

      for (const enemy of this.enemies) {
        if (!enemy.sprite.active) {
          continue;
        }

        if (Phaser.Geom.Intersects.RectangleToRectangle(bullet.body.getBounds(), enemy.sprite.getBounds())) {
          enemy.health -= bullet.damage;
          enemy.sprite.setTint(0xffef80);
          this.time.delayedCall(80, () => enemy.sprite.clearTint());
          this.effects?.spawnSpark(bullet.body.x, bullet.body.y);
          bullet.body.destroy();
          return false;
        }
      }

      if (bullet.body.x < -80 || bullet.body.x > RUN_GUN_WORLD_WIDTH + 80 || bullet.body.y < -120 || bullet.body.y > GAME_HEIGHT + 120) {
        bullet.body.destroy();
        return false;
      }

      bullet.body.alpha = Phaser.Math.Clamp(bullet.body.alpha - dt * 0.08, 0.5, 1);
      return true;
    });
  }

  private updateEnemyBullets(_deltaMs: number): void {
    if (!this.player) {
      return;
    }

    const playerBounds = this.player.getBounds();
    this.enemyBullets = this.enemyBullets.filter((bullet) => {
      bullet.body.rotation = Math.atan2(bullet.velocity.y, bullet.velocity.x);

      if (this.time.now - bullet.bornAt > SHOT_LIFESPAN_MS + 650) {
        bullet.body.destroy();
        return false;
      }

      if (Phaser.Geom.Intersects.RectangleToRectangle(bullet.body.getBounds(), playerBounds)) {
        bullet.body.destroy();
        this.damagePlayer(bullet.damage);
        return false;
      }

      if (bullet.body.x < -80 || bullet.body.x > RUN_GUN_WORLD_WIDTH + 80 || bullet.body.y < -120 || bullet.body.y > GAME_HEIGHT + 120) {
        bullet.body.destroy();
        return false;
      }

      return true;
    });
  }

  private updateEnemies(_deltaMs: number): void {
    this.enemies = this.enemies.filter((enemy) => {
      if (!enemy.sprite.active) {
        enemy.healthBack.destroy();
        enemy.healthFill.destroy();
        return false;
      }

      enemy.sprite.setVelocity(0, 0);
      enemy.sprite.y = enemy.hover
        ? enemy.baseY + Math.sin(this.time.now / 260 + enemy.sprite.x * 0.02) * 10
        : enemy.baseY;

      if (enemy.health <= 0) {
        this.effects?.spawnExplosion(enemy.sprite.x, enemy.sprite.y - (enemy.hover ? 32 : 86), enemy.hover ? 0.85 : enemy.maxHealth > 40 ? 1.24 : 1);
        if (enemy.maxHealth > 40 && this.lives < RUN_GUN_STARTING_LIVES) {
          this.lives += 1;
          this.effects?.spawnLifeRecovery(enemy.sprite.x, enemy.sprite.y - 94);
        }
        enemy.healthBack.destroy();
        enemy.healthFill.destroy();
        enemy.sprite.destroy();
        return false;
      }

      if (this.player) {
        const toPlayer = new Phaser.Math.Vector2(this.player.x - enemy.sprite.x, this.player.y - 76 - enemy.sprite.y);
        enemy.sprite.setScale(Math.abs(enemy.sprite.scaleX) * (toPlayer.x > 0 ? -1 : 1), enemy.sprite.scaleY);
        const engaging = this.canEnemyEngage(enemy);
        this.updateEnemyHealthBar(enemy, engaging || enemy.health < enemy.maxHealth);
        if (engaging && this.time.now >= enemy.nextShotAt) {
          this.telegraphEnemyShot(enemy);
          enemy.nextShotAt = this.time.now + enemy.fireDelayMs + Phaser.Math.Between(-160, 180);
        } else if (!engaging && enemy.nextShotAt < this.time.now + 320) {
          enemy.nextShotAt = this.time.now + 320;
        }
      }

      return true;
    });
  }

  private checkStageClear(): void {
    if (this.stageCleared || !this.player || this.player.x < RUN_GUN_GOAL_X) {
      return;
    }

    this.stageCleared = true;
    const elapsedMs = this.time.now - this.levelStartedAt;
    const isBestTime = recordBestTime('shooter', elapsedMs);
    this.enemyBullets.forEach((bullet) => bullet.body.destroy());
    this.enemyBullets = [];
    this.hud?.showClear(`STAGE CLEAR\n${formatRunTime(elapsedMs)}${isBestTime ? '  NEW BEST' : ''}`);
    playSfx(this, SFX_UI_SELECT_KEY, { volume: 0.42, rate: 0.72 });
    this.stopLevelMusic();
    this.time.delayedCall(650, () => this.playEndVideo(level2WinVideoUrl));
  }

  private canEnemyEngage(enemy: RunGunEnemy): boolean {
    if (!this.player || this.stageCleared || this.endingSequenceActive) {
      return false;
    }

    const distanceAhead = enemy.sprite.x - this.player.x;
    return distanceAhead < RUN_GUN_ENEMY_ACTIVE_AHEAD && distanceAhead > -RUN_GUN_ENEMY_ACTIVE_BEHIND;
  }

  private updateEnemyHealthBar(enemy: RunGunEnemy, visible: boolean): void {
    const barY = enemy.sprite.y - (enemy.hover ? 70 : 156);
    const healthPercent = Phaser.Math.Clamp(enemy.health / enemy.maxHealth, 0, 1);
    enemy.healthBack.setPosition(enemy.sprite.x, barY).setVisible(visible);
    enemy.healthFill
      .setPosition(enemy.sprite.x - 25, barY)
      .setScale(healthPercent, 1)
      .setFillStyle(healthPercent < 0.32 ? 0xef476f : healthPercent < 0.62 ? 0xffd166 : 0x8ecae6, 0.92)
      .setVisible(visible);
  }

  private telegraphEnemyShot(enemy: RunGunEnemy): void {
    if (!this.player) {
      return;
    }

    const muzzleX = enemy.sprite.x + (this.player.x > enemy.sprite.x ? 42 : -42);
    const muzzleY = enemy.sprite.y - (enemy.hover ? 34 : 92);
    const toPlayer = new Phaser.Math.Vector2(this.player.x - enemy.sprite.x, this.player.y - 76 - enemy.sprite.y);
    const angle = Math.atan2(toPlayer.y, toPlayer.x);
    const warning = this.add.rectangle(muzzleX, muzzleY, 38, 5, 0xffd166, 0.86)
      .setRotation(angle)
      .setDepth(2120);
    warning.setStrokeStyle(2, 0xffffff, 0.72);
    this.tweens.add({
      targets: warning,
      scaleX: 1.35,
      alpha: 0.2,
      yoyo: true,
      duration: RUN_GUN_ENEMY_SHOT_WARNING_MS / 2,
      ease: 'Sine.easeInOut',
      onComplete: () => warning.destroy(),
    });

    this.time.delayedCall(RUN_GUN_ENEMY_SHOT_WARNING_MS, () => {
      if (!this.player || !enemy.sprite.active || !this.canEnemyEngage(enemy)) {
        return;
      }

      const updatedToPlayer = new Phaser.Math.Vector2(this.player.x - enemy.sprite.x, this.player.y - 76 - enemy.sprite.y);
      this.fireEnemyBullet(enemy, updatedToPlayer);
    });
  }

  private fireEnemyBullet(enemy: RunGunEnemy, toPlayer: Phaser.Math.Vector2): void {
    const direction = toPlayer.lengthSq() > 0.01 ? toPlayer.normalize() : new Phaser.Math.Vector2(-1, 0);
    const body = this.add.rectangle(enemy.sprite.x + direction.x * 42, enemy.sprite.y - (enemy.hover ? 34 : 92), 22, 5, 0xff4d6d, 1);
    body.setStrokeStyle(2, 0xffd166, 0.8);
    body.setRotation(Math.atan2(direction.y, direction.x));
    body.setDepth(2100);
    this.physics.add.existing(body);
    const arcadeBody = body.body as Phaser.Physics.Arcade.Body;
    arcadeBody.setAllowGravity(false);
    arcadeBody.setVelocity(
      direction.x * enemy.bulletSpeed * RUN_GUN_ENEMY_BULLET_SPEED_MULTIPLIER,
      direction.y * enemy.bulletSpeed * RUN_GUN_ENEMY_BULLET_SPEED_MULTIPLIER,
    );
    arcadeBody.setSize(18, 18);
    this.enemyBullets.push({ body, velocity: direction.clone(), bornAt: this.time.now, damage: enemy.damage });
    playSfx(this, SFX_PUNCH_SWING_KEY, { volume: 0.12, rate: 0.82 });
  }

  private damagePlayer(damage: number): void {
    if (!this.player || this.stageCleared || this.endingSequenceActive || this.time.now < this.playerInvulnerableUntil) {
      return;
    }

    this.lives -= damage;
    this.playerInvulnerableUntil = this.time.now + RUN_GUN_RESPAWN_INVULNERABLE_MS;
    this.player.setTint(0xffef80);
    this.player.setVelocityX(-this.facing * 130);
    this.cameras.main.shake(110, 0.003);
    playSfx(this, SFX_HIT_LIGHT_KEY, { volume: 0.36, rate: 0.82 });
    this.time.delayedCall(130, () => this.player?.clearTint());
    if (this.lives <= 0) {
      this.playDeathSequence();
    }
  }

  private checkRespawn(): void {
    if (!this.player || this.endingSequenceActive) {
      return;
    }

    if (this.player.y < GAME_HEIGHT + 140) {
      return;
    }

    this.lives -= 1;
    if (this.lives <= 0) {
      this.playDeathSequence();
      return;
    }

    this.respawnPlayerAtCheckpoint();
    this.cameras.main.shake(130, 0.003);
  }

  private updateCheckpointProgress(): void {
    if (!this.player) {
      return;
    }

    for (const checkpointX of RUN_GUN_CHECKPOINTS) {
      if (this.player.x >= checkpointX && checkpointX > this.checkpointX) {
        this.checkpointX = checkpointX;
        this.announceCheckpoint(checkpointX);
      }
    }
  }

  private announceCheckpoint(checkpointX: number): void {
    const checkpointNumber = RUN_GUN_CHECKPOINTS.indexOf(checkpointX as typeof RUN_GUN_CHECKPOINTS[number]) + 1;
    this.hud?.showCheckpoint(checkpointNumber);
    playSfx(this, SFX_UI_SELECT_KEY, { volume: 0.26, rate: 1.28 });
  }

  private respawnPlayerAtCheckpoint(): void {
    if (!this.player) {
      return;
    }

    this.enemyBullets.forEach((bullet) => bullet.body.destroy());
    this.enemyBullets = [];
    this.player.setPosition(this.checkpointX, 260);
    this.player.setVelocity(0, 0);
    this.playerInvulnerableUntil = this.time.now + RUN_GUN_RESPAWN_INVULNERABLE_MS;
    this.jumpBufferedUntil = 0;
    this.lastGroundedAt = 0;
    this.cameras.main.centerOn(Math.max(GAME_WIDTH / 2, this.checkpointX + 190), GAME_HEIGHT / 2);
  }

  private updateHud(): void {
    this.hud?.update({
      playerX: this.player?.x ?? 0,
      enemyCount: this.enemies.length,
      lives: this.lives,
      checkpointNumber: this.getCheckpointNumber(),
      stageCleared: this.stageCleared,
      isPaused: this.isPaused,
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.touchControls?.updateLayout(gameSize.width, gameSize.height);
  }

  private handlePauseInput(): void {
    const gamepadInput = this.gamepadControls?.getInput();
    if (this.justDown(this.keys?.ESC) || this.justDown(this.keys?.P) || gamepadInput?.pause || gamepadInput?.confirm || gamepadInput?.cancel) {
      this.setRunGunPause(false);
    }
  }

  private setRunGunPause(paused: boolean): void {
    if (this.endingSequenceActive || this.stageCleared || this.isPaused === paused) {
      return;
    }

    this.isPaused = paused;
    this.hud?.setPauseVisible(paused);
    if (paused) {
      this.player?.setVelocity(0, 0);
      this.physics.world.pause();
    } else {
      this.physics.world.resume();
    }
    playSfx(this, SFX_UI_SELECT_KEY, { volume: 0.24, rate: paused ? 0.9 : 1.18 });
  }

  private getCheckpointNumber(): number {
    const checkpointIndex = RUN_GUN_CHECKPOINTS.findIndex((checkpointX) => checkpointX === this.checkpointX);
    return checkpointIndex >= 0 ? checkpointIndex + 1 : 0;
  }

  private getAimFrame(direction: Phaser.Math.Vector2): number {
    const snapped = Phaser.Math.Angle.Wrap(Math.round(Math.atan2(direction.y, direction.x) / (Math.PI / 4)) * (Math.PI / 4));
    const epsilon = 0.001;
    if (Math.abs(snapped) < epsilon) return 0;
    if (Math.abs(snapped + Math.PI / 4) < epsilon) return 1;
    if (Math.abs(snapped + Math.PI / 2) < epsilon) return 2;
    if (Math.abs(snapped + 3 * Math.PI / 4) < epsilon) return 3;
    if (Math.abs(Math.abs(snapped) - Math.PI) < epsilon) return 4;
    if (Math.abs(snapped - 3 * Math.PI / 4) < epsilon) return 5;
    if (Math.abs(snapped - Math.PI / 2) < epsilon) return 6;
    return 7;
  }

  private playDeathSequence(): void {
    if (this.endingSequenceActive) {
      return;
    }

    this.endingSequenceActive = true;
    this.stopLevelMusic();
    this.player?.setVelocity(0, 0);
    this.player?.setTint(0xffef80);
    playFullscreenVideoOverlay(this, {
      src: deathVideoUrl,
      onComplete: () => this.returnToTitle(),
    });
  }

  private playEndVideo(src: string): void {
    if (this.endingSequenceActive) {
      return;
    }

    this.endingSequenceActive = true;
    this.player?.setVelocity(0, 0);
    playFullscreenVideoOverlay(this, {
      src,
      onComplete: () => this.returnToTitle(),
    });
  }

  private stopLevelMusic(): void {
    stopMusic(this, LEVEL_2_MUSIC_KEY);
  }

  private returnToTitle(): void {
    if (this.isReturningToTitle) {
      return;
    }

    this.isReturningToTitle = true;
    this.isPaused = false;
    this.physics.world.resume();
    this.stopLevelMusic();
    this.cameras.main.fadeOut(180, 7, 9, 13);
    this.time.delayedCall(190, () => {
      this.scene.stop('UIScene');
      this.scene.start('MainMenuScene');
    });
  }
}
