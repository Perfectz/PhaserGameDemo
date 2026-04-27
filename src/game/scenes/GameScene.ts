import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { backgrounds } from '../data/backgrounds';
import { destructibleProps } from '../data/destructibleProps';
import { DestructibleProp } from '../entities/DestructibleProp';
import { Pickup } from '../entities/Pickup';
import { Projectile } from '../entities/Projectile';
import { CameraSystem } from '../systems/CameraSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { EnemyAISystem } from '../systems/EnemyAISystem';
import { EncounterFlowSystem, EncounterBounds } from '../systems/EncounterFlowSystem';
import { GamepadControls } from '../systems/GamepadControls';
import { ParallaxBackgroundSystem } from '../systems/ParallaxBackgroundSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { TouchControls } from '../systems/TouchControls';
import {
  CYBER_STAGE_SHEET_KEY,
  GAME_HEIGHT,
  GAME_WIDTH,
  LEVEL_1_MUSIC_KEY,
  PLAYER_SHOT_COOLDOWN_MS,
  SFX_JUMP_KEY,
  SETPIECE_NEON_GATE_KEY,
  SETPIECE_OVERPASS_SIGN_KEY,
  SETPIECE_RAISED_WALKWAY_KEY,
  SETPIECE_STAIRS_RAMP_KEY,
  SETPIECE_STREET_KIOSK_KEY,
  SETPIECE_SUBWAY_ENTRANCE_KEY,
  SFX_PICKUP_KEY,
  STAGE_START_GRACE_MS,
  WALKABLE_BOTTOM,
  WALKABLE_LEFT,
  WALKABLE_RIGHT,
  WALKABLE_TOP,
  WORLD_WIDTH,
} from '../utils/constants';
import { AttackInput, LevelDefinition, MovementInput, StageSetpiecePlacement, WaveDefinition } from '../utils/types';
import { playLoopingMusic, playSfx, stopMusic } from '../systems/SoundSystem';
import { HudState } from './UIScene';

export class GameScene extends Phaser.Scene {
  private player?: Player;
  private enemies: Enemy[] = [];
  private stageProps: DestructibleProp[] = [];
  private pickups: Pickup[] = [];
  private projectiles: Projectile[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private combat?: CombatSystem;
  private ai?: EnemyAISystem;
  private spawner?: SpawnSystem;
  private encounterFlow?: EncounterFlowSystem;
  private cameraSystem?: CameraSystem;
  private parallaxBackground?: ParallaxBackgroundSystem;
  private touchControls?: TouchControls;
  private gamepadControls?: GamepadControls;
  private isPaused = false;
  private isGameOver = false;
  private enemiesMayAttackAt = 0;
  private activeEncounterBounds?: EncounterBounds;
  private announcedBossWaveIndex = -1;
  private nextShotAt = 0;
  private propBreakCount = 0;
  private guaranteedPickupsSpawned = 0;
  private returnToTitleScheduled = false;
  private levelMusic?: Phaser.Sound.BaseSound;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.enemies = [];
    this.stageProps = [];
    this.pickups = [];
    this.projectiles = [];
    this.isPaused = false;
    this.isGameOver = false;
    this.enemiesMayAttackAt = this.time.now + STAGE_START_GRACE_MS;
    this.activeEncounterBounds = undefined;
    this.announcedBossWaveIndex = -1;
    this.propBreakCount = 0;
    this.guaranteedPickupsSpawned = 0;
    this.returnToTitleScheduled = false;
    this.scene.get('UIScene').events.emit('pause:changed', false);
    this.scene.get('UIScene').events.emit('game-over:changed', false);
    this.levelMusic = playLoopingMusic(this, LEVEL_1_MUSIC_KEY, 0.34);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopLevelMusic());

    this.spawner = new SpawnSystem(this, this.enemies);
    this.encounterFlow = new EncounterFlowSystem(this.spawner.level);
    this.createWorld(this.spawner.level);
    this.stageProps = this.createDestructibleProps(this.spawner.level);
    this.player = new Player(this, 180, 390);
    this.combat = new CombatSystem(this);
    this.ai = new EnemyAISystem();
    this.cameraSystem = new CameraSystem(this, this.player);
    this.touchControls = new TouchControls(this);
    this.touchControls.updateLayout(GAME_WIDTH, GAME_HEIGHT);
    this.gamepadControls = new GamepadControls(this, true);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,E,J,K,L,I,O,R,P,ESC,SPACE,SHIFT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.events.off('pause:set');
    this.events.off('restart:requested');
    this.events.off('pickup:spawn');
    this.events.off('wave:started');
    this.events.off('stage:cleared');
    this.events.on('pause:set', (paused: boolean) => this.togglePause(paused));
    this.events.on('restart:requested', () => this.restartRun());
    this.events.on('pickup:spawn', (x: number, y: number) => this.spawnPickup(x, y));
    this.events.on('wave:started', (waveIndex: number, wave: WaveDefinition) => this.handleWaveStarted(waveIndex, wave));
    this.events.on('stage:cleared', () => this.handleStageCleared());
    this.spawner.start();
    this.updateEncounterFlow();

    this.scale.off('resize', this.handleResize, this);
    this.scale.on('resize', this.handleResize, this);
  }

  update(_time: number, delta: number): void {
    if (!this.player || !this.combat || !this.ai || !this.spawner || !this.cameraSystem || !this.touchControls) {
      return;
    }

    if (this.isPaused || this.isGameOver) {
      if (this.isGameOver && this.justDown(this.keys?.R)) {
        this.restartRun();
      }
      return;
    }

    if (this.combat.isHitStopActive(this.time.now)) {
      this.emitHudState();
      return;
    }

    const keyboardMovement = this.getKeyboardMovement();
    const keyboardActions = this.getKeyboardActions();
    const touchInput = this.touchControls.getInput();
    const gamepadInput = this.gamepadControls?.getInput();
    const movement = {
      x: Phaser.Math.Clamp(keyboardMovement.x + touchInput.movement.x + (gamepadInput?.movement.x ?? 0), -1, 1),
      y: Phaser.Math.Clamp(keyboardMovement.y + touchInput.movement.y + (gamepadInput?.movement.y ?? 0), -1, 1),
      run: Boolean(this.keys?.SHIFT?.isDown || touchInput.run || gamepadInput?.run),
    };
    const aimInput = {
      x: Phaser.Math.Clamp(keyboardMovement.x + touchInput.movement.x + (gamepadInput?.aim.x ?? 0), -1, 1),
      y: Phaser.Math.Clamp(keyboardMovement.y + touchInput.movement.y + (gamepadInput?.aim.y ?? 0), -1, 1),
    };

    this.player.update(delta, movement, this.time.now);
    this.handleActions({
      punch: keyboardActions.punch || touchInput.actions.punch || Boolean(gamepadInput?.actions.punch),
      kick: keyboardActions.kick || touchInput.actions.kick || Boolean(gamepadInput?.actions.kick),
      jump: keyboardActions.jump || touchInput.actions.jump || Boolean(gamepadInput?.actions.jump),
      special: keyboardActions.special || touchInput.actions.special || Boolean(gamepadInput?.actions.special),
      shoot: keyboardActions.shoot || touchInput.actions.shoot || Boolean(gamepadInput?.actions.shoot),
      evade: keyboardActions.evade || touchInput.actions.evade || Boolean(gamepadInput?.actions.evade),
    }, aimInput);
    this.ai.update(delta, this.enemies, this.player, this.time.now, this.enemiesMayAttackAt);
    this.updateDefeatedEnemies(delta);
    this.separateBodies(delta);
    this.combat.update(this.player, this.enemies, this.stageProps);
    this.updateProjectiles(delta);
    this.collectPickups();
    this.checkGameOver();
    this.spawner.update(this.player.container.x);
    this.updateEncounterFlow();
    this.cameraSystem.update();
    this.parallaxBackground?.update();
    this.cleanupDefeatedEnemies();
    this.emitHudState();
  }

  private updateEncounterFlow(): void {
    if (!this.player || !this.spawner || !this.encounterFlow || !this.cameraSystem) {
      return;
    }

    this.activeEncounterBounds = this.spawner.hasActiveEncounter()
      ? this.encounterFlow.getBoundsForWave(this.spawner.currentWaveIndex)
      : undefined;
    this.cameraSystem.setHorizontalLock(this.activeEncounterBounds);

    if (this.activeEncounterBounds) {
      this.player.container.x = Phaser.Math.Clamp(
        this.player.container.x,
        this.activeEncounterBounds.left + 34,
        this.activeEncounterBounds.right - 34,
      );
    }
  }

  private handleWaveStarted(waveIndex: number, wave: WaveDefinition): void {
    this.enemiesMayAttackAt = this.time.now + STAGE_START_GRACE_MS;
    if (waveIndex === 2 && this.guaranteedPickupsSpawned === 0 && this.player) {
      this.spawnPickup(this.player.container.x + 86, this.player.container.y - 6, true);
    }
    if (wave.enemyTypes?.includes('neonWarden') && this.announcedBossWaveIndex !== waveIndex) {
      this.announcedBossWaveIndex = waveIndex;
      this.scene.get('UIScene').events.emit('boss:intro', 'NEON WARDEN');
      this.cameras.main.flash(260, 52, 232, 255, false);
      this.cameras.main.shake(220, 0.004);
    }
  }

  private handleStageCleared(): void {
    if (this.returnToTitleScheduled) {
      return;
    }

    this.returnToTitleScheduled = true;
    this.isPaused = true;
    this.scene.get('UIScene').events.emit('pause:changed', false);
    this.scene.get('UIScene').events.emit('stage:cleared');
    this.time.delayedCall(2600, () => {
      this.returnToTitle();
    });
  }

  private returnToTitle(): void {
    this.scene.stop('UIScene');
    this.scene.start('MainMenuScene');
  }

  private getKeyboardMovement(): MovementInput {
    const left = this.cursors?.left?.isDown || this.keys?.A?.isDown;
    const right = this.cursors?.right?.isDown || this.keys?.D?.isDown;
    const up = this.cursors?.up?.isDown || this.keys?.W?.isDown;
    const down = this.cursors?.down?.isDown || this.keys?.S?.isDown;

    return {
      x: (right ? 1 : 0) - (left ? 1 : 0),
      y: (down ? 1 : 0) - (up ? 1 : 0),
    };
  }

  private getKeyboardActions(): AttackInput {
    return {
      punch: this.justDown(this.keys?.J),
      kick: this.justDown(this.keys?.K),
      jump: Boolean(
        this.justDown(this.keys?.SPACE) || this.justDown(this.keys?.L),
      ),
      special: this.justDown(this.keys?.I),
      shoot: this.justDown(this.keys?.O),
      evade: this.justDown(this.keys?.E),
    };
  }

  private justDown(key?: Phaser.Input.Keyboard.Key): boolean {
    return key ? Phaser.Input.Keyboard.JustDown(key) : false;
  }

  private handleActions(actions: AttackInput, aimInput: MovementInput): void {
    if (!this.player || !this.combat) {
      return;
    }

    if (actions.evade) {
      if (this.player.evade(this.time.now, aimInput)) {
        playSfx(this, SFX_JUMP_KEY, { volume: 0.28, rate: 1.34 });
      }
      return;
    }

    if (actions.shoot) {
      this.tryShoot(aimInput);
    }

    if (actions.punch) {
      this.combat.tryPlayerAction('punch', this.player, this.enemies, this.stageProps);
    } else if (actions.kick) {
      this.combat.tryPlayerAction('kick', this.player, this.enemies, this.stageProps);
    } else if (actions.special) {
      this.combat.tryPlayerAction('special', this.player, this.enemies, this.stageProps);
    } else if (actions.jump) {
      this.combat.tryPlayerAction('jump', this.player, this.enemies, this.stageProps);
    }
  }

  private tryShoot(aimInput: MovementInput): void {
    if (!this.player || this.time.now < this.nextShotAt) {
      return;
    }

    const direction = this.getSnappedAimDirection(aimInput);
    if (!this.player.showShootingPose(direction, this.time.now)) {
      return;
    }

    const scale = this.player.getDepthScale();
    const muzzleX = this.player.container.x + direction.x * 48 * scale;
    const muzzleY = this.player.container.y - 62 * scale + direction.y * 28 * scale;
    this.projectiles.push(new Projectile(this, muzzleX, muzzleY, direction));
    this.nextShotAt = this.time.now + PLAYER_SHOT_COOLDOWN_MS;
  }

  private getSnappedAimDirection(aimInput: MovementInput): Phaser.Math.Vector2 {
    const raw = new Phaser.Math.Vector2(aimInput.x, aimInput.y);
    if (raw.lengthSq() < 0.04) {
      return new Phaser.Math.Vector2(this.player?.facing ?? 1, 0);
    }

    const angle = Math.round(Math.atan2(raw.y, raw.x) / (Math.PI / 4)) * (Math.PI / 4);
    const snapped = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
    if (Math.abs(snapped.x) < 0.01) {
      snapped.x = 0;
    }
    if (Math.abs(snapped.y) < 0.01) {
      snapped.y = 0;
    }
    return snapped.normalize();
  }

  private updateProjectiles(deltaMs: number): void {
    this.projectiles = this.projectiles.filter((projectile) => projectile.update(deltaMs, this.enemies, this.stageProps));
  }

  private updateDefeatedEnemies(deltaMs: number): void {
    if (!this.player) {
      return;
    }

    this.enemies
      .filter((enemy) => enemy.state === 'defeated')
      .forEach((enemy) => enemy.update(deltaMs, this.player as Player, this.time.now));
  }

  private cleanupDefeatedEnemies(): void {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      if (enemy.state === 'defeated' && enemy.container.alpha <= 0) {
        enemy.destroy();
        this.enemies.splice(index, 1);
      }
    }
  }

  private separateBodies(deltaMs: number): void {
    if (!this.player) {
      return;
    }

    const dt = deltaMs / 1000;
    const bodies = [this.player, ...this.enemies.filter((enemy) => enemy.state !== 'defeated')];

    for (let a = 0; a < bodies.length; a += 1) {
      for (let b = a + 1; b < bodies.length; b += 1) {
        const first = bodies[a].container;
        const second = bodies[b].container;
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const overlapX = 42 - Math.abs(dx);
        const overlapY = 22 - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          const pushX = Math.sign(dx || 1) * overlapX * 0.5 * dt * 8;
          const pushY = Math.sign(dy || 1) * overlapY * 0.5 * dt * 5;
          first.x -= pushX;
          first.y -= pushY;
          second.x += pushX;
          second.y += pushY;
          first.x = Phaser.Math.Clamp(first.x, WALKABLE_LEFT, WALKABLE_RIGHT);
          first.y = Phaser.Math.Clamp(first.y, WALKABLE_TOP, WALKABLE_BOTTOM);
          second.x = Phaser.Math.Clamp(second.x, WALKABLE_LEFT, WALKABLE_RIGHT);
          second.y = Phaser.Math.Clamp(second.y, WALKABLE_TOP, WALKABLE_BOTTOM);
        }
      }
    }
  }

  private togglePause(forcePaused?: boolean): void {
    if (this.isGameOver) {
      return;
    }

    this.isPaused = forcePaused ?? !this.isPaused;
    this.scene.get('UIScene').events.emit('pause:changed', this.isPaused);
  }

  private checkGameOver(): void {
    if (!this.player || this.player.state !== 'defeated' || this.isGameOver) {
      return;
    }

    this.isGameOver = true;
    this.isPaused = false;
    this.combat?.destroy();
    this.scene.get('UIScene').events.emit('pause:changed', false);
    this.scene.get('UIScene').events.emit('game-over:changed', true);
  }

  private restartRun(): void {
    this.combat?.destroy();
    this.enemies.forEach((enemy) => enemy.destroy());
    this.stageProps.forEach((prop) => prop.destroy());
    this.pickups.forEach((pickup) => pickup.destroy());
    this.projectiles.forEach((projectile) => projectile.destroy());
    this.enemies = [];
    this.stageProps = [];
    this.pickups = [];
    this.projectiles = [];
    this.scene.get('UIScene').events.emit('pause:changed', false);
    this.scene.get('UIScene').events.emit('game-over:changed', false);
    this.scene.restart();
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.touchControls?.updateLayout(gameSize.width, gameSize.height);
    this.parallaxBackground?.updateLayout(gameSize.width, gameSize.height);
  }

  private emitHudState(): void {
    if (!this.player || !this.spawner) {
      return;
    }

    const hudState: HudState = {
      playerHealth: this.player.health,
      playerState: this.player.state,
      enemyCount: this.enemies.filter((enemy) => enemy.state !== 'defeated').length,
      levelName: this.spawner.level.displayName,
      wave: this.spawner.currentWaveNumber,
      stageClear: this.spawner.isStageClear(),
      specialReadyPercent: this.combat?.getSpecialReadyPercent(this.time.now) ?? 1,
      advancePrompt: this.encounterFlow?.shouldShowAdvancePrompt(
        this.spawner.currentWaveIndex,
        this.spawner.hasActiveEncounter(),
        this.spawner.isStageClear(),
      ) ?? false,
      bossName: this.getActiveBoss()?.enemyType.displayName,
      bossHealthPercent: this.getBossHealthPercent(),
    };

    this.scene.get('UIScene').events.emit('hud:update', hudState);
  }

  private getActiveBoss(): Enemy | undefined {
    return this.enemies.find((enemy) => enemy.enemyType.id === 'neonWarden' && enemy.state !== 'defeated');
  }

  private getBossHealthPercent(): number | undefined {
    const boss = this.getActiveBoss();
    return boss ? boss.health / boss.maxHealth : undefined;
  }

  private createWorld(level: LevelDefinition): void {
    this.cameras.main.setBackgroundColor('#111318');
    const background = backgrounds[level.backgroundId];
    this.parallaxBackground = background ? new ParallaxBackgroundSystem(this, background) : undefined;

    this.add.rectangle(0, 0, WORLD_WIDTH, GAME_HEIGHT, 0x121620).setOrigin(0).setDepth(-45);
    this.renderCityBackdrops();

    const street = this.add.graphics();
    street.setDepth(-10);
    const laneHeight = (WALKABLE_BOTTOM - WALKABLE_TOP) / 5;
    const laneColors = [0x272c35, 0x2b303a, 0x303540, 0x353a45, 0x3a404b];
    laneColors.forEach((color, index) => {
      street.fillStyle(color, 1);
      street.fillRect(0, WALKABLE_TOP + laneHeight * index, WORLD_WIDTH, laneHeight + 1);
    });

    street.lineStyle(5, 0x6d788b, 0.95);
    street.lineBetween(0, WALKABLE_TOP, WORLD_WIDTH, WALKABLE_TOP);
    street.lineStyle(8, 0x1d222c, 1);
    street.lineBetween(0, WALKABLE_BOTTOM, WORLD_WIDTH, WALKABLE_BOTTOM);

    // Long diagonal seams and lane stripes make the flat canvas read as a 3/4 street.
    street.lineStyle(2, 0x151923, 0.42);
    for (let x = -260; x < WORLD_WIDTH + 260; x += 220) {
      street.lineBetween(x, WALKABLE_TOP, x + 120, WALKABLE_BOTTOM);
    }

    street.lineStyle(2, 0x8ecae6, 0.28);
    for (let y = WALKABLE_TOP + laneHeight; y < WALKABLE_BOTTOM; y += laneHeight) {
      street.lineBetween(0, y, WORLD_WIDTH, y);
    }

    for (let x = 0; x < WORLD_WIDTH; x += 180) {
      const stripeY = WALKABLE_TOP + laneHeight * 2.6;
      const stripe = this.add.rectangle(x + 32, stripeY, 92, 5, 0xf4d35e, 0.5).setOrigin(0);
      stripe.setDepth(-5);
      stripe.setAngle(1.5);
    }

    this.renderRoadTexture();
    this.renderStageSetpieces(level);

    this.add.rectangle(WALKABLE_LEFT, WALKABLE_TOP, 4, WALKABLE_BOTTOM - WALKABLE_TOP, 0x8ecae6, 0.42).setOrigin(0).setDepth(-4);
    this.add.rectangle(WALKABLE_RIGHT, WALKABLE_TOP, 4, WALKABLE_BOTTOM - WALKABLE_TOP, 0x8ecae6, 0.42).setOrigin(0).setDepth(-4);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
  }

  private createDestructibleProps(level: LevelDefinition): DestructibleProp[] {
    return level.destructibleProps.map((placement) => {
      const definition = destructibleProps[placement.typeId];
      return new DestructibleProp(this, definition, placement.x, placement.y);
    });
  }

  private renderCityBackdrops(): void {
    const facades = [
      { frame: 'building-shop-left', x: 20, y: WALKABLE_TOP + 8, height: 210 },
      { frame: 'building-shop-wide', x: 360, y: WALKABLE_TOP + 10, height: 226 },
      { frame: 'building-shop-left', x: 930, y: WALKABLE_TOP + 8, height: 202 },
      { frame: 'building-shop-wide', x: 1420, y: WALKABLE_TOP + 12, height: 232 },
      { frame: 'building-shop-left', x: 2050, y: WALKABLE_TOP + 8, height: 208 },
      { frame: 'building-shop-wide', x: 2540, y: WALKABLE_TOP + 12, height: 226 },
    ];

    facades.forEach(({ frame, x, y, height }, index) => {
      const image = this.addStageAsset(frame, x, y, undefined, height, -26, index % 2 === 0 ? 0.92 : 0.84);
      image.setTint(index % 2 === 0 ? 0xffffff : 0xdde8ff);
    });

    [
      { x: 315, y: WALKABLE_TOP + 18, height: 158 },
      { x: 1265, y: WALKABLE_TOP + 6, height: 168 },
      { x: 2375, y: WALKABLE_TOP + 18, height: 150 },
      { x: 2925, y: WALKABLE_TOP + 8, height: 170 },
    ].forEach((placement) => {
      this.addStageAsset('neon-column', placement.x, placement.y, undefined, placement.height, -22, 0.94);
    });
  }

  private renderRoadTexture(): void {
    this.addStageAsset('road-start', 0, WALKABLE_BOTTOM + 4, 360, 74, -8, 0.72);
    for (let x = 330; x < WORLD_WIDTH - 280; x += 700) {
      this.addStageAsset('road-long', x, WALKABLE_BOTTOM + 4, 720, 70, -8, 0.62);
    }
    this.addStageAsset('road-end', WORLD_WIDTH - 150, WALKABLE_BOTTOM + 4, 140, 72, -8, 0.72);
  }

  private renderStageSetpieces(level: LevelDefinition): void {
    level.stageSetpieces.forEach((setpiece) => {
      switch (setpiece.type) {
        case 'raisedWalkway':
          this.drawRaisedWalkway(setpiece);
          break;
        case 'ramp':
          this.drawRamp(setpiece);
          break;
        case 'stairs':
          this.drawStairs(setpiece);
          break;
        case 'ladder':
          this.drawLadder(setpiece);
          break;
        case 'overpass':
          this.drawOverpass(setpiece);
          break;
        case 'neonGate':
          this.drawNeonGate(setpiece);
          break;
        case 'streetKiosk':
          this.drawStreetKiosk(setpiece);
          break;
        case 'subwayEntrance':
          this.drawSubwayEntrance(setpiece);
          break;
        default:
          break;
      }
    });
  }

  private drawRaisedWalkway(setpiece: StageSetpiecePlacement): void {
    const width = setpiece.width ?? 420;
    const height = setpiece.height ?? 138;
    this.addStageShadow(setpiece.x + 28, setpiece.y + 2, width - 56, 26, -9);
    this.addSetpieceImage(SETPIECE_RAISED_WALKWAY_KEY, setpiece.x, setpiece.y, width, height, -7, 0.98);
    this.addStageSign(setpiece, setpiece.x + width * 0.5, setpiece.y - height + 30);
  }

  private drawRamp(setpiece: StageSetpiecePlacement): void {
    const width = setpiece.width ?? 280;
    const height = setpiece.height ?? 164;
    this.addStageShadow(setpiece.x + 14, setpiece.y + 2, width - 28, 26, -9);
    this.addSetpieceImage(SETPIECE_STAIRS_RAMP_KEY, setpiece.x, setpiece.y, width, height, -6, 0.98);
  }

  private drawStairs(setpiece: StageSetpiecePlacement): void {
    const width = setpiece.width ?? 300;
    const height = setpiece.height ?? 170;
    this.addStageShadow(setpiece.x + 18, setpiece.y + 2, width - 36, 28, -9);
    this.addSetpieceImage(SETPIECE_STAIRS_RAMP_KEY, setpiece.x, setpiece.y, width, height, -6, 0.98);
  }

  private drawLadder(setpiece: StageSetpiecePlacement): void {
    const width = setpiece.width ?? 48;
    const height = setpiece.height ?? 136;
    const frame = height > 150 ? 'ladder-caged' : 'ladder-straight';
    this.addStageAsset(frame, setpiece.x, setpiece.y + height, width, height, -3, 1);
    this.addStageSign(setpiece, setpiece.x + width * 0.5, setpiece.y - 12);
  }

  private drawOverpass(setpiece: StageSetpiecePlacement): void {
    const width = setpiece.width ?? 430;
    const height = setpiece.height ?? 190;
    this.addStageShadow(setpiece.x + 28, setpiece.y + 2, width - 56, 34, -10);
    this.addSetpieceImage(SETPIECE_OVERPASS_SIGN_KEY, setpiece.x, setpiece.y, width, height, -5, 0.98);
    this.addStageSign(setpiece, setpiece.x + width * 0.5, setpiece.y - height + 36);
  }

  private drawNeonGate(setpiece: StageSetpiecePlacement): void {
    const height = setpiece.height ?? 176;
    const width = setpiece.width ?? 246;
    this.addStageShadow(setpiece.x + 12, setpiece.y + 2, width - 24, 30, -9);
    this.addSetpieceImage(SETPIECE_NEON_GATE_KEY, setpiece.x, setpiece.y, width, height, -4, 0.98);
    this.addStageSign(setpiece, setpiece.x + width * 0.5, setpiece.y - height + 42);
  }

  private drawStreetKiosk(setpiece: StageSetpiecePlacement): void {
    const height = setpiece.height ?? 188;
    const width = setpiece.width ?? 292;
    this.addStageShadow(setpiece.x + 24, setpiece.y + 3, width - 48, 30, -8);
    this.addSetpieceImage(SETPIECE_STREET_KIOSK_KEY, setpiece.x, setpiece.y, width, height, -5, 0.98);
  }

  private drawSubwayEntrance(setpiece: StageSetpiecePlacement): void {
    const height = setpiece.height ?? 170;
    const width = setpiece.width ?? 250;
    this.addStageShadow(setpiece.x + 18, setpiece.y + 3, width - 36, 28, -8);
    this.addSetpieceImage(SETPIECE_SUBWAY_ENTRANCE_KEY, setpiece.x, setpiece.y, width, height, -5, 0.98);
  }

  private addStageAsset(
    frame: string,
    x: number,
    y: number,
    width?: number,
    height?: number,
    depth = -6,
    alpha = 1,
  ): Phaser.GameObjects.Image {
    const image = this.add.image(x, y, CYBER_STAGE_SHEET_KEY, frame)
      .setOrigin(0, 1)
      .setDepth(depth)
      .setAlpha(alpha);

    if (width && height) {
      image.setDisplaySize(width, height);
    } else if (height) {
      const source = this.textures.get(CYBER_STAGE_SHEET_KEY).get(frame);
      image.setDisplaySize(source.width * (height / source.height), height);
    }

    return image;
  }

  private addSetpieceImage(
    textureKey: string,
    x: number,
    y: number,
    width?: number,
    height?: number,
    depth = -6,
    alpha = 1,
  ): Phaser.GameObjects.Image {
    const image = this.add.image(x, y, textureKey)
      .setOrigin(0, 1)
      .setDepth(depth)
      .setAlpha(alpha);

    if (width && height) {
      image.setDisplaySize(width, height);
    } else if (height) {
      const source = this.textures.get(textureKey).getSourceImage() as HTMLImageElement;
      image.setDisplaySize(source.width * (height / source.height), height);
    }

    return image;
  }

  private addStageShadow(x: number, y: number, width: number, height: number, depth: number): void {
    this.add.ellipse(x + width * 0.5, y, width, height, 0x05070b, 0.34)
      .setDepth(depth);
  }

  private addStageSign(setpiece: StageSetpiecePlacement, x: number, y: number): void {
    if (!setpiece.label) {
      return;
    }

    this.add.text(x, y, setpiece.label, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '11px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(-1);
  }

  private spawnPickup(x: number, y: number, force = false): void {
    this.propBreakCount += force ? 0 : 1;
    const shouldGuarantee = this.guaranteedPickupsSpawned === 0 && this.propBreakCount >= 1;

    if (this.pickups.length > 5 || (!force && !shouldGuarantee && Math.random() > 0.72)) {
      return;
    }

    if (force || shouldGuarantee) {
      this.guaranteedPickupsSpawned += 1;
    }
    this.pickups.push(new Pickup(this, x, y));
  }

  private collectPickups(): void {
    if (!this.player) {
      return;
    }

    const playerBounds = this.player.getHurtbox();
    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];
      if (pickup.overlaps(playerBounds)) {
        this.player.heal(pickup.amount);
        playSfx(this, SFX_PICKUP_KEY, { volume: 0.42 });
        pickup.destroy();
        this.pickups.splice(index, 1);
      }
    }
  }

  private stopLevelMusic(): void {
    stopMusic(this, LEVEL_1_MUSIC_KEY);
  }
}
