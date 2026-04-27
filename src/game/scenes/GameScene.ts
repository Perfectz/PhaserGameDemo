import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { brawlerAssets } from '../data/assets';
import { destructibleProps } from '../data/destructibleProps';
import { DestructibleProp } from '../entities/DestructibleProp';
import { Pickup } from '../entities/Pickup';
import { Projectile } from '../entities/Projectile';
import { CameraSystem } from '../systems/CameraSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { EnemyAISystem } from '../systems/EnemyAISystem';
import { EncounterFlowSystem, EncounterBounds } from '../systems/EncounterFlowSystem';
import { GamepadControls } from '../systems/GamepadControls';
import { areAssetsLoaded, loadAssetsThenStart } from '../systems/AssetLoaderSystem';
import { formatRunTime, recordBestTime } from '../systems/DemoProgressSystem';
import { ParallaxBackgroundSystem } from '../systems/ParallaxBackgroundSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { StageRendererSystem } from '../systems/StageRendererSystem';
import { TouchControls } from '../systems/TouchControls';
import { playFullscreenVideoOverlay } from '../systems/VideoOverlaySystem';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  LEVEL_1_MUSIC_KEY,
  PLAYER_SHOT_COOLDOWN_MS,
  SFX_JUMP_KEY,
  SFX_PICKUP_KEY,
  STAGE_START_GRACE_MS,
  WALKABLE_BOTTOM,
  WALKABLE_LEFT,
  WALKABLE_RIGHT,
  WALKABLE_TOP,
} from '../utils/constants';
import { AttackInput, LevelDefinition, MovementInput, WaveDefinition } from '../utils/types';
import { playLoopingMusic, playSfx, stopMusic } from '../systems/SoundSystem';
import { HudState } from './UIScene';

const deathVideoUrl = new URL('../../assets/video/death.mp4', import.meta.url).href;
const level1WinVideoUrl = new URL('../../assets/video/level1win.mp4', import.meta.url).href;

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
  private isReturningToTitle = false;
  private levelStartedAt = 0;
  private stageIntro?: Phaser.GameObjects.Container;

  constructor() {
    super('GameScene');
  }

  create(): void {
    if (this.loadBrawlerAssets()) {
      return;
    }

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
    this.isReturningToTitle = false;
    this.levelStartedAt = this.time.now;
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }
    this.scene.get('UIScene').events.emit('pause:changed', false);
    this.scene.get('UIScene').events.emit('game-over:changed', false);
    playLoopingMusic(this, LEVEL_1_MUSIC_KEY, 0.34);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopLevelMusic());

    this.spawner = new SpawnSystem(this, this.enemies);
    this.encounterFlow = new EncounterFlowSystem(this.spawner.level);
    this.parallaxBackground = new StageRendererSystem(this).createWorld(this.spawner.level);
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
    this.events.off('title:requested');
    this.events.off('pickup:spawn');
    this.events.off('wave:started');
    this.events.off('stage:cleared');
    this.events.on('pause:set', (paused: boolean) => this.togglePause(paused));
    this.events.on('restart:requested', () => this.restartRun());
    this.events.on('title:requested', () => this.returnToTitle());
    this.events.on('pickup:spawn', (x: number, y: number) => this.spawnPickup(x, y));
    this.events.on('wave:started', (waveIndex: number, wave: WaveDefinition) => this.handleWaveStarted(waveIndex, wave));
    this.events.on('stage:cleared', () => this.handleStageCleared());
    this.spawner.start();
    this.updateEncounterFlow();
    this.showStageIntro();
    this.cameras.main.fadeIn(180, 7, 9, 13);

    this.scale.off('resize', this.handleResize, this);
    this.scale.on('resize', this.handleResize, this);
  }

  private loadBrawlerAssets(): boolean {
    if (areAssetsLoaded(this, brawlerAssets)) {
      return false;
    }

    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'LOADING BRAWLER 0%', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '18px',
      color: '#ffd166',
      stroke: '#07090d',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(30000);

    return loadAssetsThenStart(
      this,
      brawlerAssets,
      () => {
        this.load.off(Phaser.Loader.Events.PROGRESS);
        this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR);
        loadingText.destroy();
        this.scene.restart();
      },
      (progress) => loadingText.setText(`LOADING BRAWLER ${Math.round(progress * 100)}%`),
      () => loadingText.setText('LOADING BRAWLER... RETRY NEEDED'),
    );
  }

  update(_time: number, delta: number): void {
    if (!this.player || !this.combat || !this.ai || !this.spawner || !this.cameraSystem || !this.touchControls) {
      return;
    }

    if (this.isPaused || this.isGameOver) {
      if (this.isGameOver && !this.returnToTitleScheduled && this.justDown(this.keys?.R)) {
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
    const elapsedMs = this.time.now - this.levelStartedAt;
    const isBestTime = recordBestTime('brawler', elapsedMs);
    this.scene.get('UIScene').events.emit('pause:changed', false);
    this.scene.get('UIScene').events.emit('stage:cleared');
    this.showRunResult('NEON STREET CLEAR', `${formatRunTime(elapsedMs)}${isBestTime ? '  NEW BEST' : ''}`);
    this.stopLevelMusic();
    this.time.delayedCall(650, () => {
      playFullscreenVideoOverlay(this, {
        src: level1WinVideoUrl,
        onComplete: () => this.returnToTitle(),
      });
    });
  }

  private returnToTitle(): void {
    if (this.isReturningToTitle) {
      return;
    }

    this.isReturningToTitle = true;
    this.stopLevelMusic();
    this.cameras.main.fadeOut(180, 7, 9, 13);
    this.time.delayedCall(190, () => {
      this.scene.stop('UIScene');
      this.scene.start('MainMenuScene');
    });
  }

  private showStageIntro(): void {
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x07090d, 0.2)
      .setScrollFactor(0);
    const title = this.add.text(GAME_WIDTH / 2, 178, 'LEVEL 1', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '28px',
      color: '#8ecae6',
      stroke: '#07090d',
      strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0);
    const subtitle = this.add.text(GAME_WIDTH / 2, 222, 'NEON STREET', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '48px',
      color: '#ffd166',
      stroke: '#07090d',
      strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0);
    const objective = this.add.text(GAME_WIDTH / 2, 278, 'CLEAR THE WAVES', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '16px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0);

    this.stageIntro = this.add.container(0, 0, [shade, title, subtitle, objective])
      .setDepth(19000)
      .setAlpha(0);
    this.tweens.add({
      targets: this.stageIntro,
      alpha: 1,
      duration: 220,
      ease: 'Sine.easeOut',
      yoyo: true,
      hold: 980,
      onComplete: () => this.stageIntro?.destroy(),
    });
  }

  private showRunResult(titleText: string, subtitleText: string): void {
    const title = this.add.text(GAME_WIDTH / 2, 98, titleText, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '20px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(19020);
    const subtitle = this.add.text(GAME_WIDTH / 2, 128, subtitleText, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '15px',
      color: '#8ecae6',
      stroke: '#07090d',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(19020);

    this.tweens.add({
      targets: [title, subtitle],
      alpha: 0,
      y: '-=18',
      delay: 1600,
      duration: 420,
      ease: 'Sine.easeIn',
      onComplete: () => {
        title.destroy();
        subtitle.destroy();
      },
    });
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
    this.returnToTitleScheduled = true;
    this.isPaused = false;
    this.combat?.destroy();
    this.stopLevelMusic();
    this.scene.get('UIScene').events.emit('pause:changed', false);
    this.scene.get('UIScene').events.emit('game-over:changed', true);
    this.time.delayedCall(650, () => {
      playFullscreenVideoOverlay(this, {
        src: deathVideoUrl,
        onComplete: () => this.returnToTitle(),
      });
    });
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

  private createDestructibleProps(level: LevelDefinition): DestructibleProp[] {
    return level.destructibleProps.map((placement) => {
      const definition = destructibleProps[placement.typeId];
      return new DestructibleProp(this, definition, placement.x, placement.y);
    });
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
