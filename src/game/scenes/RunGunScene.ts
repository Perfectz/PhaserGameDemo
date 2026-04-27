import Phaser from 'phaser';
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
  SFX_ENEMY_DEFEAT_KEY,
  SFX_HIT_LIGHT_KEY,
  SFX_JUMP_KEY,
  SFX_PUNCH_SWING_KEY,
  SFX_UI_SELECT_KEY,
} from '../utils/constants';
import { GamepadControls } from '../systems/GamepadControls';
import { TouchControls } from '../systems/TouchControls';
import { playLoopingMusic, playSfx, stopMusic } from '../systems/SoundSystem';
import { MovementInput } from '../utils/types';

interface RunGunEnemy {
  sprite: Phaser.Physics.Arcade.Sprite;
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

const WORLD_WIDTH = 3600;
const PLAYER_SCALE = 0.58;
const PLAYER_SPEED_X = 255;
const JUMP_SPEED = -530;
const GRAVITY_Y = 1250;
const RUN_GUN_STARTING_LIVES = 15;
const SHOT_COOLDOWN_MS = 135;
const SHOT_LIFESPAN_MS = 850;
const RUN_GUN_EVADE_SPEED_X = 690;
const RUN_GUN_EVADE_DURATION_MS = 190;
const RUN_GUN_EVADE_INVULNERABLE_MS = 310;
const RUN_GUN_EVADE_COOLDOWN_MS = 520;
const RUN_GUN_FAR_TEXTURE_KEY = 'run-gun-far-backdrop';
const RUN_GUN_MID_TEXTURE_KEY = 'run-gun-mid-backdrop';
const RUN_GUN_FLOOR_TEXTURE_KEY = 'run-gun-floor-tile';
const RUN_GUN_PLATFORM_TEXTURE_KEY = 'run-gun-platform-tile';
const RUN_GUN_GOAL_X = WORLD_WIDTH - 120;

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
  private statusText?: Phaser.GameObjects.Text;
  private clearText?: Phaser.GameObjects.Text;
  private touchControls?: TouchControls;
  private gamepadControls?: GamepadControls;
  private playerTextureKey = '';
  private playerInvulnerableUntil = 0;
  private evadingUntil = 0;
  private evadeCooldownUntil = 0;
  private evadeDirection: -1 | 1 = 1;
  private stageCleared = false;
  private levelMusic?: Phaser.Sound.BaseSound;

  constructor() {
    super('RunGunScene');
  }

  create(): void {
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.facing = 1;
    this.nextShotAt = 0;
    this.lives = RUN_GUN_STARTING_LIVES;
    this.playerTextureKey = '';
    this.playerInvulnerableUntil = 0;
    this.evadingUntil = 0;
    this.evadeCooldownUntil = 0;
    this.evadeDirection = 1;
    this.stageCleared = false;
    this.levelMusic = playLoopingMusic(this, LEVEL_2_MUSIC_KEY, 0.34);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopLevelMusic();
      this.scale.off('resize', this.handleResize, this);
    });
    this.physics.world.gravity.y = GRAVITY_Y;
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);

    this.createAnimations();
    this.createLevelTextures();
    this.createBackground();
    this.createPlatforms();
    this.createEnemies();
    this.createPlayer();
    this.createHud();

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,E,O,SPACE,ENTER,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    this.touchControls = new TouchControls(this);
    this.touchControls.updateLayout(GAME_WIDTH, GAME_HEIGHT);
    this.gamepadControls = new GamepadControls(this);
    this.scale.off('resize', this.handleResize, this);
    this.scale.on('resize', this.handleResize, this);
  }

  update(_time: number, deltaMs: number): void {
    if (!this.player || !this.platforms) {
      return;
    }

    this.updatePlayer();
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

  private createLevelTextures(): void {
    if (!this.textures.exists(RUN_GUN_FAR_TEXTURE_KEY)) {
      const far = this.textures.createCanvas(RUN_GUN_FAR_TEXTURE_KEY, 960, 260)!;
      const context = far.context;
      const sky = context.createLinearGradient(0, 0, 0, 260);
      sky.addColorStop(0, '#08131f');
      sky.addColorStop(0.58, '#102636');
      sky.addColorStop(1, '#18222f');
      context.fillStyle = sky;
      context.fillRect(0, 0, 960, 260);

      context.fillStyle = 'rgba(71, 197, 255, 0.18)';
      context.beginPath();
      context.arc(790, 58, 72, 0, Math.PI * 2);
      context.fill();

      for (let index = 0; index < 30; index += 1) {
        const x = index * 34 + (index % 3) * 8;
        const width = 32 + (index % 5) * 10;
        const height = 68 + (index % 7) * 18;
        context.fillStyle = index % 2 === 0 ? '#101b27' : '#132130';
        context.fillRect(x, 220 - height, width, height);
        context.fillStyle = index % 3 === 0 ? 'rgba(255, 209, 102, 0.62)' : 'rgba(70, 210, 255, 0.42)';
        for (let row = 0; row < Math.floor(height / 18); row += 1) {
          for (let column = 0; column < Math.floor(width / 16); column += 1) {
            if ((row + column + index) % 3 !== 0) {
              context.fillRect(x + 7 + column * 15, 220 - height + 12 + row * 17, 5, 3);
            }
          }
        }
      }

      context.fillStyle = 'rgba(20, 44, 58, 0.75)';
      context.fillRect(0, 224, 960, 36);
      context.strokeStyle = 'rgba(82, 220, 255, 0.24)';
      context.lineWidth = 2;
      for (let x = 0; x < 960; x += 96) {
        context.beginPath();
        context.moveTo(x, 224);
        context.lineTo(x + 68, 260);
        context.stroke();
      }
      far.refresh();
    }

    if (!this.textures.exists(RUN_GUN_MID_TEXTURE_KEY)) {
      const mid = this.textures.createCanvas(RUN_GUN_MID_TEXTURE_KEY, 960, 340)!;
      const context = mid.context;
      context.clearRect(0, 0, 960, 340);

      const wall = context.createLinearGradient(0, 0, 0, 340);
      wall.addColorStop(0, '#182734');
      wall.addColorStop(1, '#202a34');
      context.fillStyle = wall;
      context.fillRect(0, 46, 960, 294);

      for (let x = 0; x < 960; x += 160) {
        context.fillStyle = x % 320 === 0 ? '#263746' : '#22303d';
        context.fillRect(x + 12, 72, 116, 206);
        context.strokeStyle = 'rgba(132, 239, 255, 0.22)';
        context.lineWidth = 3;
        context.strokeRect(x + 12, 72, 116, 206);
        context.fillStyle = 'rgba(5, 10, 15, 0.48)';
        context.fillRect(x + 28, 96, 84, 42);
        context.fillRect(x + 28, 158, 84, 42);
        context.fillStyle = 'rgba(255, 82, 49, 0.66)';
        context.fillRect(x + 32, 144, 74, 4);
        context.fillStyle = 'rgba(75, 222, 255, 0.5)';
        context.fillRect(x + 34, 208, 70, 5);
      }

      context.strokeStyle = '#324657';
      context.lineWidth = 16;
      context.beginPath();
      context.moveTo(0, 286);
      context.lineTo(960, 286);
      context.stroke();
      context.strokeStyle = 'rgba(255, 209, 102, 0.5)';
      context.lineWidth = 3;
      for (let x = -80; x < 960; x += 80) {
        context.beginPath();
        context.moveTo(x, 302);
        context.lineTo(x + 42, 272);
        context.stroke();
      }

      context.strokeStyle = 'rgba(78, 224, 255, 0.38)';
      context.lineWidth = 7;
      context.beginPath();
      context.moveTo(0, 54);
      context.lineTo(960, 54);
      context.stroke();
      mid.refresh();
    }

    if (!this.textures.exists(RUN_GUN_FLOOR_TEXTURE_KEY)) {
      const floor = this.textures.createCanvas(RUN_GUN_FLOOR_TEXTURE_KEY, 512, 96)!;
      const context = floor.context;
      const metal = context.createLinearGradient(0, 0, 0, 96);
      metal.addColorStop(0, '#3a414a');
      metal.addColorStop(0.55, '#242a32');
      metal.addColorStop(1, '#151a20');
      context.fillStyle = metal;
      context.fillRect(0, 0, 512, 96);

      for (let x = 0; x < 512; x += 128) {
        context.strokeStyle = 'rgba(151, 177, 190, 0.28)';
        context.lineWidth = 2;
        context.strokeRect(x + 4, 8, 120, 76);
        context.fillStyle = 'rgba(10, 14, 18, 0.28)';
        context.fillRect(x + 10, 16, 108, 20);
        context.fillStyle = x % 256 === 0 ? 'rgba(255, 209, 102, 0.74)' : 'rgba(48, 220, 255, 0.58)';
        context.fillRect(x + 16, 74, 94, 4);
        context.fillStyle = '#12161b';
        context.beginPath();
        context.arc(x + 18, 18, 3, 0, Math.PI * 2);
        context.arc(x + 110, 18, 3, 0, Math.PI * 2);
        context.arc(x + 18, 76, 3, 0, Math.PI * 2);
        context.arc(x + 110, 76, 3, 0, Math.PI * 2);
        context.fill();
      }

      context.fillStyle = 'rgba(255, 183, 64, 0.9)';
      for (let x = -20; x < 512; x += 42) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + 22, 0);
        context.lineTo(x + 4, 14);
        context.lineTo(x - 18, 14);
        context.closePath();
        context.fill();
      }
      floor.refresh();
    }

    if (!this.textures.exists(RUN_GUN_PLATFORM_TEXTURE_KEY)) {
      const platform = this.textures.createCanvas(RUN_GUN_PLATFORM_TEXTURE_KEY, 256, 36)!;
      const context = platform.context;
      const metal = context.createLinearGradient(0, 0, 0, 36);
      metal.addColorStop(0, '#4a5b66');
      metal.addColorStop(0.38, '#2d3842');
      metal.addColorStop(1, '#161d24');
      context.fillStyle = metal;
      context.fillRect(0, 0, 256, 36);
      context.strokeStyle = 'rgba(142, 234, 255, 0.52)';
      context.lineWidth = 2;
      context.strokeRect(1, 1, 254, 34);
      context.fillStyle = 'rgba(255, 209, 102, 0.72)';
      for (let x = 8; x < 256; x += 46) {
        context.fillRect(x, 7, 22, 3);
      }
      context.strokeStyle = 'rgba(7, 10, 14, 0.55)';
      context.lineWidth = 3;
      for (let x = 0; x < 256; x += 64) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + 38, 36);
        context.stroke();
      }
      platform.refresh();
    }
  }

  private createBackground(): void {
    this.add.rectangle(0, 0, WORLD_WIDTH, GAME_HEIGHT, 0x071019).setOrigin(0).setDepth(-40);
    this.add.tileSprite(0, 0, WORLD_WIDTH, 260, RUN_GUN_FAR_TEXTURE_KEY).setOrigin(0, 0).setDepth(-35);
    this.add.tileSprite(0, 78, WORLD_WIDTH, 340, RUN_GUN_MID_TEXTURE_KEY).setOrigin(0, 0).setDepth(-26);

    for (let x = 0; x < WORLD_WIDTH; x += 420) {
      this.add.rectangle(x + 124, 88, 18, 340, 0x102130, 0.92).setOrigin(0.5, 0).setDepth(-18);
      this.add.rectangle(x + 132, 90, 4, 334, 0x49dcff, 0.32).setOrigin(0.5, 0).setDepth(-17);
      this.add.rectangle(x + 300, 246, 230, 16, 0x293541, 0.86).setOrigin(0.5, 0).setDepth(-16);
      this.add.rectangle(x + 300, 252, 228, 3, 0xffd166, 0.45).setOrigin(0.5, 0).setDepth(-15);
    }

    for (let x = 80; x < WORLD_WIDTH; x += 520) {
      this.add.rectangle(x, 428, 260, 18, 0x111923, 0.86).setOrigin(0.5, 0).setDepth(-8);
      this.add.rectangle(x, 432, 260, 3, 0x38d9ff, 0.45).setOrigin(0.5, 0).setDepth(-7);
    }

    this.add.rectangle(RUN_GUN_GOAL_X, 286, 18, 350, 0xffd166, 0.82).setOrigin(0.5, 0).setDepth(-4);
    this.add.rectangle(RUN_GUN_GOAL_X, 286, 72, 34, 0x101923, 0.95).setDepth(-3).setStrokeStyle(2, 0xffd166, 0.9);
    this.add.text(RUN_GUN_GOAL_X, 286, 'EXIT', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '16px',
      color: '#fff4a3',
      stroke: '#05080c',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(-2);
  }

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();
    this.addPlatform(0, 492, WORLD_WIDTH, 96, 0x252b34);
    this.addPlatform(430, 392, 280, 28, 0x34414d);
    this.addPlatform(820, 318, 250, 28, 0x34414d);
    this.addPlatform(1190, 430, 320, 28, 0x34414d);
    this.addPlatform(1620, 350, 260, 28, 0x34414d);
    this.addPlatform(2010, 276, 230, 28, 0x34414d);
    this.addPlatform(2370, 420, 360, 28, 0x34414d);
    this.addPlatform(2890, 338, 300, 28, 0x34414d);
    this.addPlatform(3260, 455, 310, 28, 0x34414d);
  }

  private addPlatform(x: number, y: number, width: number, height: number, color: number): void {
    const textureKey = height > 60 ? RUN_GUN_FLOOR_TEXTURE_KEY : RUN_GUN_PLATFORM_TEXTURE_KEY;
    const platform = this.add.tileSprite(x + width / 2, y + height / 2, width, height, textureKey);
    platform.setTint(color);
    this.platforms?.add(platform);
    (platform.body as Phaser.Physics.Arcade.StaticBody | undefined)?.updateFromGameObject();

    const topLight = this.add.rectangle(x + width / 2, y + 3, width, 3, height > 60 ? 0xffd166 : 0x8ecae6, 0.42).setDepth(25);
    const lowerShadow = this.add.rectangle(x + width / 2, y + height - 3, width, 4, 0x05080c, 0.34).setDepth(24);
    topLight.setOrigin(0.5, 0.5);
    lowerShadow.setOrigin(0.5, 0.5);
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
      this.enemies.push({
        sprite,
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

  private createHud(): void {
    this.statusText = this.add.text(18, 16, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '14px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 4,
    }).setScrollFactor(0).setDepth(5000);

    this.add.text(18, 492, 'Run-Gun Test: A/D move, Space jump, E/LB/LT evade, O shoot, direction keys aim, Esc menu', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#9fd3ff',
      stroke: '#07090d',
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(5000);

    this.clearText = this.add.text(GAME_WIDTH / 2, 190, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '34px',
      color: '#fff4a3',
      align: 'center',
      stroke: '#080b10',
      strokeThickness: 7,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5200).setVisible(false);
  }

  private updatePlayer(): void {
    if (!this.player) {
      return;
    }

    if (this.justDown(this.keys?.ESC)) {
      this.returnToTitle();
      return;
    }

    const gamepadInput = this.gamepadControls?.getInput();
    const touchInput = this.touchControls?.getInput();
    if (gamepadInput?.pause || gamepadInput?.cancel) {
      this.returnToTitle();
      return;
    }

    const left = Boolean(this.cursors?.left.isDown || this.keys?.A?.isDown);
    const right = Boolean(this.cursors?.right.isDown || this.keys?.D?.isDown);
    const up = Boolean(this.cursors?.up.isDown || this.keys?.W?.isDown);
    const down = Boolean(this.cursors?.down.isDown || this.keys?.S?.isDown);
    const shoot = Boolean(this.keys?.O?.isDown || touchInput?.actions.shoot || gamepadInput?.shootHeld);

    const moveX = Phaser.Math.Clamp((right ? 1 : 0) - (left ? 1 : 0) + (touchInput?.movement.x ?? 0) + (gamepadInput?.movement.x ?? 0), -1, 1);
    if (moveX !== 0) {
      this.facing = moveX > 0 ? 1 : -1;
    }

    const onFloor = this.player.body?.blocked.down || this.player.body?.touching.down;
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
    this.player.setAlpha(1);

    this.player.setVelocityX(moveX * PLAYER_SPEED_X);

    if ((this.justDown(this.keys?.SPACE) || this.justDown(this.cursors?.space) || touchInput?.actions.jump || gamepadInput?.actions.jump) && onFloor) {
      this.player.setVelocityY(JUMP_SPEED);
      playSfx(this, SFX_JUMP_KEY, { volume: 0.34 });
    }

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
          this.spawnSpark(bullet.body.x, bullet.body.y);
          bullet.body.destroy();
          return false;
        }
      }

      if (bullet.body.x < -80 || bullet.body.x > WORLD_WIDTH + 80 || bullet.body.y < -120 || bullet.body.y > GAME_HEIGHT + 120) {
        bullet.body.destroy();
        return false;
      }

      bullet.body.alpha = Phaser.Math.Clamp(bullet.body.alpha - dt * 0.08, 0.5, 1);
      return true;
    });
  }

  private updateEnemyBullets(deltaMs: number): void {
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

      if (bullet.body.x < -80 || bullet.body.x > WORLD_WIDTH + 80 || bullet.body.y < -120 || bullet.body.y > GAME_HEIGHT + 120) {
        bullet.body.destroy();
        return false;
      }

      return true;
    });
  }

  private updateEnemies(deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.enemies = this.enemies.filter((enemy) => {
      if (!enemy.sprite.active) {
        return false;
      }

      enemy.sprite.setVelocity(0, 0);
      enemy.sprite.y = enemy.hover
        ? enemy.baseY + Math.sin(this.time.now / 260 + enemy.sprite.x * 0.02) * 10
        : enemy.baseY;

      if (enemy.health <= 0) {
        this.spawnExplosion(enemy.sprite.x, enemy.sprite.y - (enemy.hover ? 32 : 86), enemy.hover ? 0.85 : enemy.maxHealth > 40 ? 1.24 : 1);
        enemy.sprite.destroy();
        return false;
      }

      if (this.player) {
        const toPlayer = new Phaser.Math.Vector2(this.player.x - enemy.sprite.x, this.player.y - 76 - enemy.sprite.y);
        enemy.sprite.setScale(Math.abs(enemy.sprite.scaleX) * (toPlayer.x > 0 ? -1 : 1), enemy.sprite.scaleY);
        if (this.time.now >= enemy.nextShotAt && Math.abs(toPlayer.x) < 780) {
          this.fireEnemyBullet(enemy, toPlayer);
          enemy.nextShotAt = this.time.now + enemy.fireDelayMs + Phaser.Math.Between(-160, 180);
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
    this.enemyBullets.forEach((bullet) => bullet.body.destroy());
    this.enemyBullets = [];
    this.clearText?.setText('STAGE CLEAR\nEXIT REACHED').setVisible(true).setAlpha(0);
    playSfx(this, SFX_UI_SELECT_KEY, { volume: 0.42, rate: 0.72 });
    this.tweens.add({
      targets: this.clearText,
      alpha: 1,
      y: 178,
      duration: 360,
      ease: 'Back.easeOut',
    });
    this.time.delayedCall(2600, () => this.returnToTitle());
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
    arcadeBody.setVelocity(direction.x * enemy.bulletSpeed, direction.y * enemy.bulletSpeed);
    arcadeBody.setSize(18, 18);
    this.enemyBullets.push({ body, velocity: direction.clone(), bornAt: this.time.now, damage: enemy.damage });
    playSfx(this, SFX_PUNCH_SWING_KEY, { volume: 0.12, rate: 0.82 });
  }

  private damagePlayer(damage: number): void {
    if (!this.player || this.stageCleared || this.time.now < this.playerInvulnerableUntil) {
      return;
    }

    this.lives -= damage;
    this.playerInvulnerableUntil = this.time.now + 900;
    this.player.setTint(0xffef80);
    this.cameras.main.shake(110, 0.003);
    playSfx(this, SFX_HIT_LIGHT_KEY, { volume: 0.36, rate: 0.82 });
    this.time.delayedCall(130, () => this.player?.clearTint());
    if (this.lives <= 0) {
      this.returnToTitle();
    }
  }

  private checkRespawn(): void {
    if (!this.player) {
      return;
    }

    if (this.player.y < GAME_HEIGHT + 140) {
      return;
    }

    this.lives -= 1;
    this.player.setPosition(Math.max(120, this.cameras.main.scrollX + 120), 260);
    this.player.setVelocity(0, 0);
    this.cameras.main.shake(130, 0.003);
    if (this.lives <= 0) {
      this.returnToTitle();
    }
  }

  private updateHud(): void {
    const metersToExit = Math.max(0, Math.ceil((RUN_GUN_GOAL_X - (this.player?.x ?? 0)) / 100));
    this.statusText?.setText(
      this.stageCleared ? `STAGE CLEAR   LIVES ${this.lives}` : `ENEMIES ${this.enemies.length}   EXIT ${metersToExit}   LIVES ${this.lives}`,
    );
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.touchControls?.updateLayout(gameSize.width, gameSize.height);
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

  private spawnSpark(x: number, y: number): void {
    playSfx(this, SFX_HIT_LIGHT_KEY, { volume: 0.26, rate: 1.3 });
    const spark = this.add.ellipse(x, y, 28, 18, 0xffd166, 0.92).setDepth(2300);
    spark.setStrokeStyle(2, 0xffffff, 0.88);
    this.tweens.add({
      targets: spark,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 130,
      ease: 'Sine.easeOut',
      onComplete: () => spark.destroy(),
    });
  }

  private spawnExplosion(x: number, y: number, scale = 1): void {
    playSfx(this, SFX_ENEMY_DEFEAT_KEY, { volume: 0.34, rate: Phaser.Math.FloatBetween(1.05, 1.18) });

    const flash = this.add.circle(x, y, 34 * scale, 0xfff4a3, 0.95).setDepth(2350);
    const core = this.add.circle(x, y, 18 * scale, 0xff4d1f, 0.9).setDepth(2360);
    const ring = this.add.circle(x, y, 28 * scale, 0xffd166, 0).setDepth(2340);
    ring.setStrokeStyle(5 * scale, 0xfff4a3, 0.9);

    this.tweens.add({
      targets: flash,
      scale: 2.45,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
    this.tweens.add({
      targets: core,
      scale: 1.75,
      alpha: 0,
      duration: 230,
      ease: 'Sine.easeOut',
      onComplete: () => core.destroy(),
    });
    this.tweens.add({
      targets: ring,
      scale: 3.1,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10 + Phaser.Math.FloatBetween(-0.22, 0.22);
      const distance = Phaser.Math.Between(36, 94) * scale;
      const smoke = this.add.circle(x, y, Phaser.Math.Between(9, 18) * scale, 0x485160, 0.58).setDepth(2220);
      this.tweens.add({
        targets: smoke,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance * 0.58,
        scale: Phaser.Math.FloatBetween(1.4, 2.2),
        alpha: 0,
        duration: Phaser.Math.Between(430, 620),
        ease: 'Sine.easeOut',
        onComplete: () => smoke.destroy(),
      });
    }

    for (let index = 0; index < 16; index += 1) {
      const shard = this.add.rectangle(x, y, Phaser.Math.Between(5, 13) * scale, Phaser.Math.Between(3, 8) * scale, 0xffd166, 1).setDepth(2320);
      const angle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
      const distance = Phaser.Math.Between(46, 136) * scale;
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance * 0.68,
        alpha: 0,
        angle: Phaser.Math.Between(-260, 260),
        duration: Phaser.Math.Between(300, 520),
        ease: 'Sine.easeOut',
        onComplete: () => shard.destroy(),
      });
    }

    this.cameras.main.shake(120, 0.0032 * scale);
  }

  private stopLevelMusic(): void {
    stopMusic(this, LEVEL_2_MUSIC_KEY);
  }

  private returnToTitle(): void {
    this.scene.stop('UIScene');
    this.scene.start('MainMenuScene');
  }
}
