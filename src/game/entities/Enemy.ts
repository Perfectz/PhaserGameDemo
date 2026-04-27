import Phaser from 'phaser';
import {
  ENEMY_ATTACK_COOLDOWN,
  ENEMY_ATTACK_DAMAGE,
  ENEMY_ATTACK_RANGE_X,
  ENEMY_ATTACK_RANGE_Y,
  ENEMY_SPRITE_DISPLAY_HEIGHT,
  ENEMY_SPRITE_FRAME_HEIGHT,
  ENEMY_WALK_BOB_PIXELS,
  ENEMY_WALK_SHADOW_PULSE,
  ENEMY_SPRITE_Y_OFFSET,
  SFX_HIT_HEAVY_KEY,
  WALKABLE_BOTTOM,
  WALKABLE_LEFT,
  WALKABLE_RIGHT,
  WALKABLE_TOP,
} from '../utils/constants';
import { EnemyAnimationName, EnemyTypeDefinition, EnemyTypeId, enemyTypes } from '../data/enemyTypes';
import { getDepthScale, getDepthSort } from '../utils/depth';
import { FacingDirection, EnemyState } from '../utils/types';
import { playSfx } from '../systems/SoundSystem';
import { Player } from './Player';

let nextEnemyId = 1;

export class Enemy {
  readonly id = nextEnemyId++;
  readonly container: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly healthBarBack: Phaser.GameObjects.Rectangle;
  readonly healthBarFill: Phaser.GameObjects.Rectangle;
  readonly enemyType: EnemyTypeDefinition;

  health: number;
  maxHealth: number;
  speed: number;
  facing: FacingDirection = -1;
  state: EnemyState = 'idle';
  nextAttackAt = 0;

  private stateLockedUntil = 0;
  private downUntil = 0;
  private readonly healthBarWidth: number;
  private readonly baseBodyY: number;
  private readonly baseShadowAlpha = 0.28;
  private knockbackVelocity = new Phaser.Math.Vector2(0, 0);
  private moveCycleMs = 0;
  private isMovePresentationActive = false;

  constructor(private scene: Phaser.Scene, x: number, y: number, enemyTypeId: EnemyTypeId = 'razorPunk') {
    this.enemyType = enemyTypes[enemyTypeId];
    this.health = this.enemyType.maxHealth;
    this.maxHealth = this.enemyType.maxHealth;
    this.speed = this.enemyType.speed;
    this.ensureAnimations();

    const spriteScaleMultiplier = this.enemyType.spriteScaleMultiplier ?? 1;
    const healthBarY = this.enemyType.healthBarYOffset ?? -78;
    this.healthBarWidth = this.enemyType.healthBarWidth ?? 44;

    this.shadow = scene.add.ellipse(0, 4, 52 * spriteScaleMultiplier, 16 * Math.sqrt(spriteScaleMultiplier), 0x000000, 0.28);
    this.body = scene.add.sprite(0, ENEMY_SPRITE_Y_OFFSET, this.enemyType.spriteKey, 0);
    this.baseBodyY = this.body.y;
    this.body.setOrigin(0.5, 1);
    this.body.setScale((ENEMY_SPRITE_DISPLAY_HEIGHT / ENEMY_SPRITE_FRAME_HEIGHT) * spriteScaleMultiplier);
    this.body.play(this.animationKey('idle'));
    this.healthBarBack = scene.add.rectangle(0, healthBarY, this.healthBarWidth, 6, 0x1b1d23, 1).setOrigin(0.5);
    this.healthBarFill = scene.add.rectangle(-this.healthBarWidth / 2, healthBarY, this.healthBarWidth, 6, 0x73f080, 1).setOrigin(0, 0.5);

    this.container = scene.add.container(x, y, [
      this.shadow,
      this.body,
      this.healthBarBack,
      this.healthBarFill,
    ]);
    this.container.setSize(48 * spriteScaleMultiplier, ENEMY_SPRITE_DISPLAY_HEIGHT * spriteScaleMultiplier);
    this.applyDepthPresentation();
  }

  update(deltaMs: number, player: Player, now: number, laneOffset = 0, spacingOffset = 0): void {
    const dt = deltaMs / 1000;

    if (this.state === 'defeated') {
      this.container.setAlpha(Math.max(0, this.container.alpha - deltaMs / 360));
      return;
    }

    if (this.state === 'knockedDown' || this.state === 'gettingUp') {
      this.container.x += this.knockbackVelocity.x * dt;
      this.container.y += this.knockbackVelocity.y * dt;
      this.knockbackVelocity.scale(0.82);
      this.container.x = Phaser.Math.Clamp(this.container.x, WALKABLE_LEFT, WALKABLE_RIGHT);
      this.container.y = Phaser.Math.Clamp(this.container.y, WALKABLE_TOP, WALKABLE_BOTTOM);

      if (this.state === 'knockedDown' && now >= this.downUntil) {
        this.state = 'gettingUp';
        this.stateLockedUntil = now + 420;
        this.shadow.setScale(1, 1);
        this.body.clearTint();
        this.playStateAnimation();
      } else if (this.state === 'gettingUp' && now >= this.stateLockedUntil) {
        this.state = 'idle';
        this.playStateAnimation();
      }

      this.applyDepthPresentation();
      this.updateMovementPresentation(deltaMs);
      return;
    }

    const toPlayer = new Phaser.Math.Vector2(
      player.container.x + spacingOffset - this.container.x,
      Phaser.Math.Clamp(player.container.y + laneOffset, WALKABLE_TOP + 26, WALKABLE_BOTTOM - 18) - this.container.y,
    );
    const attackScale = getDepthScale(this.container.y);
    const inAttackRange =
      Math.abs(toPlayer.x) <= (this.enemyType.attackRangeX ?? ENEMY_ATTACK_RANGE_X) * attackScale &&
      Math.abs(toPlayer.y) <= (this.enemyType.attackRangeY ?? ENEMY_ATTACK_RANGE_Y);

    if (Math.abs(toPlayer.x) > 4) {
      this.setFacingDirection(toPlayer.x > 0 ? 1 : -1);
    }

    if (now >= this.stateLockedUntil && !inAttackRange) {
      const chase = toPlayer.clone();
      if (chase.lengthSq() > 1) {
        chase.normalize();
      }

      this.container.x += chase.x * this.speed * dt;
      this.container.y += chase.y * this.speed * 0.68 * dt;
      this.state = 'chasing';
    } else if (now >= this.stateLockedUntil) {
      this.state = 'idle';
    }

    this.playStateAnimation();
    this.container.x += this.knockbackVelocity.x * dt;
    this.container.y += this.knockbackVelocity.y * dt;
    this.knockbackVelocity.scale(0.8);
    this.container.x = Phaser.Math.Clamp(this.container.x, WALKABLE_LEFT, WALKABLE_RIGHT);
    this.container.y = Phaser.Math.Clamp(this.container.y, WALKABLE_TOP, WALKABLE_BOTTOM);
    this.applyDepthPresentation();
    this.updateMovementPresentation(deltaMs);
  }

  canAttackPlayer(player: Player, now: number): boolean {
    const attackScale = getDepthScale(this.container.y);
    return (
      this.state !== 'defeated' &&
      this.state !== 'stunned' &&
      this.state !== 'knockedDown' &&
      this.state !== 'gettingUp' &&
      player.canBeHit() &&
      now >= this.nextAttackAt &&
      Math.abs(player.container.x - this.container.x) <= (this.enemyType.attackRangeX ?? ENEMY_ATTACK_RANGE_X) * attackScale &&
      Math.abs(player.container.y - this.container.y) <= (this.enemyType.attackRangeY ?? ENEMY_ATTACK_RANGE_Y)
    );
  }

  attackPlayer(player: Player, now: number): void {
    this.state = 'attacking';
    this.playStateAnimation();
    this.nextAttackAt = now + (this.enemyType.attackCooldownMs ?? ENEMY_ATTACK_COOLDOWN);
    this.stateLockedUntil = now + (this.enemyType.attackLockMs ?? 280);
    const attackKnockback = this.enemyType.attackKnockback ?? 135;
    const knockback = player.container.x >= this.container.x ? attackKnockback : -attackKnockback;
    player.takeDamage(this.enemyType.attackDamage ?? ENEMY_ATTACK_DAMAGE, knockback);
    playSfx(this.scene, SFX_HIT_HEAVY_KEY, { volume: 0.36, rate: 0.9 });
  }

  delayNextAttackUntil(time: number): void {
    this.nextAttackAt = Math.max(this.nextAttackAt, time);
  }

  takeDamage(damage: number, knockbackX: number, stunMs = 240, knockdown = false): void {
    if (this.state === 'defeated') {
      return;
    }

    this.health = Math.max(0, this.health - damage);
    this.knockbackVelocity.set(knockbackX, 0);
    this.setFacingDirection(knockbackX > 0 ? -1 : 1);
    this.state = this.health <= 0 ? 'defeated' : knockdown ? 'knockedDown' : 'stunned';
    this.playStateAnimation();
    this.stateLockedUntil = this.scene.time.now + stunMs;
    this.downUntil = this.scene.time.now + stunMs + 460;
    this.body.setTint(this.health <= 0 ? 0x7a7a7a : 0xffef80);
    this.updateHealthBar();

    if (this.state === 'knockedDown') {
      this.shadow.setScale(1.2, 0.7);
    } else if (this.state !== 'defeated') {
      this.scene.time.delayedCall(130, () => {
        if (this.state !== 'defeated' && this.state !== 'knockedDown') {
          this.body.clearTint();
        }
      });
      this.scene.time.delayedCall(stunMs, () => {
        if (this.state === 'stunned') {
          this.state = 'idle';
          this.body.clearTint();
          this.playStateAnimation();
        }
      });
    }
  }

  setFacingDirection(direction: FacingDirection): void {
    this.facing = direction;
    this.applyDepthPresentation();
  }

  getHurtbox(): Phaser.Geom.Rectangle {
    const scale = getDepthScale(this.container.y);
    const width = this.enemyType.hurtboxWidth ?? 44;
    const height = this.enemyType.hurtboxHeight ?? 102;
    const yOffset = this.enemyType.hurtboxYOffset ?? 96;
    return new Phaser.Geom.Rectangle(
      this.container.x - (width / 2) * scale,
      this.container.y - yOffset * scale,
      width * scale,
      height * scale,
    );
  }

  destroy(): void {
    this.container.destroy();
  }

  private updateHealthBar(): void {
    this.healthBarFill.width = this.healthBarWidth * (this.health / this.maxHealth);
  }

  private applyDepthPresentation(): void {
    const scale = getDepthScale(this.container.y);
    const nativeFacing = this.enemyType.nativeFacing ?? -1;
    this.container.setScale(this.facing * nativeFacing * scale, scale);
    this.container.setDepth(getDepthSort(this.container.y));
  }

  private ensureAnimations(): void {
    (Object.keys(this.enemyType.animations) as EnemyAnimationName[]).forEach((name) => {
      this.createAnimation(name);
    });
  }

  private createAnimation(name: EnemyAnimationName): void {
    const key = this.animationKey(name);
    if (this.scene.anims.exists(key)) {
      return;
    }

    const animation = this.enemyType.animations[name];
    this.scene.anims.create({
      key,
      frames: this.scene.anims.generateFrameNumbers(animation.spriteKey, {
        frames: animation.frames,
      }),
      frameRate: animation.frameRate,
      repeat: animation.repeat,
    });
  }

  private playStateAnimation(): void {
    const key =
      this.state === 'chasing'
        ? this.animationKey('walk')
        : this.state === 'attacking'
          ? this.animationKey('attack')
          : this.state === 'stunned'
            ? this.animationKey('hurt')
            : this.state === 'knockedDown' || this.state === 'defeated'
              ? this.animationKey('defeated')
              : this.animationKey('idle');

    if (this.body.anims.currentAnim?.key !== key || !this.body.anims.isPlaying) {
      this.body.play(key);
    }
  }

  private updateMovementPresentation(deltaMs: number): void {
    const isMoving = this.state === 'chasing';

    if (!isMoving) {
      this.moveCycleMs = 0;
      this.body.setY(this.baseBodyY);
      if (this.isMovePresentationActive && this.state !== 'knockedDown' && this.state !== 'defeated') {
        this.shadow.setScale(1, 1);
        this.shadow.setAlpha(this.baseShadowAlpha);
      }
      this.isMovePresentationActive = false;
      return;
    }

    const typeScale = this.enemyType.spriteScaleMultiplier ?? 1;
    this.moveCycleMs += deltaMs * Phaser.Math.Clamp(this.speed / ENEMY_SPRITE_DISPLAY_HEIGHT, 0.7, 1.35);
    const phase = (this.moveCycleMs / 560) * Math.PI * 2;
    const footLift = (1 - Math.cos(phase * 2)) * 0.5;
    const plantedWeight = 1 - footLift;

    this.body.setY(this.baseBodyY - ENEMY_WALK_BOB_PIXELS * typeScale * footLift);
    this.shadow.setScale(
      1 + ENEMY_WALK_SHADOW_PULSE * plantedWeight,
      1 + ENEMY_WALK_SHADOW_PULSE * 0.25 * plantedWeight,
    );
    this.shadow.setAlpha(0.23 + 0.05 * plantedWeight);
    this.isMovePresentationActive = true;
  }

  private animationKey(name: string): string {
    return `${this.enemyType.spriteKey}-${name}`;
  }
}
