import Phaser from 'phaser';
import {
  PLAYER_ACTION_FRAME_HEIGHT,
  PLAYER_ACTION_SPRITE_DISPLAY_HEIGHT,
  PLAYER_ACTION_SPRITE_Y_OFFSET,
  PLAYER_DEFEATED_FRAME_COUNT,
  PLAYER_DEFEATED_FRAME_RATE,
  PLAYER_DEFEATED_SPRITE_KEY,
  PLAYER_EVADE_DISTANCE,
  PLAYER_EVADE_DURATION_MS,
  PLAYER_EVADE_FRAME_COUNT,
  PLAYER_EVADE_FRAME_RATE,
  PLAYER_EVADE_INVULNERABLE_MS,
  PLAYER_EVADE_SPRITE_KEY,
  PLAYER_GUN_AIM_SPRITE_KEY,
  PLAYER_HURT_FRAME_COUNT,
  PLAYER_HURT_FRAME_RATE,
  PLAYER_HURT_SPRITE_KEY,
  PLAYER_IDLE_FRAME_COUNT,
  PLAYER_IDLE_FRAME_HEIGHT,
  PLAYER_IDLE_FRAME_RATE,
  PLAYER_IDLE_SPRITE_DISPLAY_HEIGHT,
  PLAYER_IDLE_SPRITE_FOOT_ORIGIN_Y,
  PLAYER_IDLE_SPRITE_KEY,
  PLAYER_JUMP_FRAME_COUNT,
  PLAYER_JUMP_FRAME_RATE,
  PLAYER_JUMP_SPRITE_KEY,
  PLAYER_KICK_FRAME_COUNT,
  PLAYER_KICK_FRAME_RATE,
  PLAYER_KICK_SPRITE_KEY,
  PLAYER_WALK_FRAME_COUNT,
  PLAYER_WALK_FRAME_HEIGHT,
  PLAYER_WALK_FRAME_RATE,
  PLAYER_WALK_SPRITE_DISPLAY_HEIGHT,
  PLAYER_WALK_SPRITE_KEY,
  PLAYER_WALK_SPRITE_Y_OFFSET,
  PLAYER_MAX_HEALTH,
  PLAYER_PUNCH_FRAME_COUNT,
  PLAYER_PUNCH_FRAME_RATE,
  PLAYER_PUNCH_SPRITE_KEY,
  PLAYER_RUN_FRAME_COUNT,
  PLAYER_RUN_FRAME_RATE,
  PLAYER_RUN_SPEED_MULTIPLIER,
  PLAYER_RUN_SPRITE_KEY,
  PLAYER_SHOOT_POSE_MS,
  PLAYER_SPECIAL_FRAME_COUNT,
  PLAYER_SPECIAL_FRAME_RATE,
  PLAYER_SPECIAL_SPRITE_KEY,
  PLAYER_SPEED,
  WALKABLE_BOTTOM,
  WALKABLE_LEFT,
  WALKABLE_RIGHT,
  WALKABLE_TOP,
} from '../utils/constants';
import { getDepthScale, getDepthSort } from '../utils/depth';
import { FacingDirection, MovementInput, PlayerState } from '../utils/types';

export class Player {
  readonly id = 0;
  readonly container: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Ellipse;

  health = PLAYER_MAX_HEALTH;
  maxHealth = PLAYER_MAX_HEALTH;
  speed = PLAYER_SPEED;
  facing: FacingDirection = 1;
  state: PlayerState = 'idle';

  private stateLockedUntil = 0;
  private invulnerableUntil = 0;
  private knockbackVelocity = new Phaser.Math.Vector2(0, 0);
  private moveLockedUntil = 0;
  private shootingUntil = 0;
  private gunAimFrameIndex = 0;
  private readonly gunAimSprite: Phaser.GameObjects.Sprite;
  private readonly gunAimSpriteScale = PLAYER_ACTION_SPRITE_DISPLAY_HEIGHT / PLAYER_ACTION_FRAME_HEIGHT;
  private readonly avatarSprites: Phaser.GameObjects.Sprite[];
  private readonly stateSprites: Record<string, Phaser.GameObjects.Sprite>;
  private activeAnimationKey = '';

  constructor(private scene: Phaser.Scene, x: number, y: number) {
    this.ensureAnimations();

    this.shadow = scene.add.ellipse(0, 4, 54, 18, 0x000000, 0.28);
    this.body = scene.add.sprite(0, PLAYER_ACTION_SPRITE_Y_OFFSET, PLAYER_IDLE_SPRITE_KEY, 0);
    this.body.setOrigin(0.5, PLAYER_IDLE_SPRITE_FOOT_ORIGIN_Y);
    this.body.setScale(PLAYER_IDLE_SPRITE_DISPLAY_HEIGHT / PLAYER_IDLE_FRAME_HEIGHT);
    this.body.play('player-idle-loop');
    this.gunAimSprite = this.createActionSprite(PLAYER_GUN_AIM_SPRITE_KEY);
    this.stateSprites = {
      idle: this.body,
      walking: this.createActionSprite(PLAYER_WALK_SPRITE_KEY, PLAYER_WALK_SPRITE_Y_OFFSET, PLAYER_WALK_SPRITE_DISPLAY_HEIGHT / PLAYER_WALK_FRAME_HEIGHT),
      running: this.createActionSprite(PLAYER_RUN_SPRITE_KEY),
      attacking: this.createActionSprite(PLAYER_PUNCH_SPRITE_KEY),
      combo: this.createActionSprite(PLAYER_PUNCH_SPRITE_KEY),
      kicking: this.createActionSprite(PLAYER_KICK_SPRITE_KEY),
      special: this.createActionSprite(PLAYER_SPECIAL_SPRITE_KEY),
      shooting: this.gunAimSprite,
      jumping: this.createActionSprite(PLAYER_JUMP_SPRITE_KEY),
      evading: this.createActionSprite(PLAYER_EVADE_SPRITE_KEY),
      hurt: this.createActionSprite(PLAYER_HURT_SPRITE_KEY),
      defeated: this.createActionSprite(PLAYER_DEFEATED_SPRITE_KEY),
      recovering: this.body,
    };
    this.avatarSprites = Array.from(new Set(Object.values(this.stateSprites)));

    this.container = scene.add.container(x, y, [this.shadow, ...this.avatarSprites]);
    this.container.setSize(62, PLAYER_IDLE_SPRITE_DISPLAY_HEIGHT);
    this.syncAnimationState();
    this.applyDepthPresentation();
  }

  update(deltaMs: number, movement: MovementInput, now: number): void {
    if (this.state === 'defeated') {
      return;
    }

    const dt = deltaMs / 1000;
    const locked = now < this.stateLockedUntil;
    const canMove = !locked || this.state === 'hurt';

    if (canMove) {
      const normalized = new Phaser.Math.Vector2(movement.x, movement.y);
      if (normalized.lengthSq() > 1) {
        normalized.normalize();
      }

      if (Math.abs(normalized.x) > 0.05) {
        this.setFacingDirection(normalized.x > 0 ? 1 : -1);
      }

      const speedMultiplier = movement.run ? PLAYER_RUN_SPEED_MULTIPLIER : 1;
      this.container.x += normalized.x * this.speed * speedMultiplier * dt;
      this.container.y += normalized.y * this.speed * speedMultiplier * 0.72 * dt;
    }

    this.container.x += this.knockbackVelocity.x * dt;
    this.container.y += this.knockbackVelocity.y * dt;
    this.knockbackVelocity.scale(0.82);

    this.container.x = Phaser.Math.Clamp(this.container.x, WALKABLE_LEFT, WALKABLE_RIGHT);
    this.container.y = Phaser.Math.Clamp(this.container.y, WALKABLE_TOP, WALKABLE_BOTTOM);
    this.applyDepthPresentation();

    if (now >= this.stateLockedUntil && now >= this.moveLockedUntil) {
      const isMoving = Math.abs(movement.x) > 0.05 || Math.abs(movement.y) > 0.05;
      this.state = now < this.shootingUntil ? 'shooting' : isMoving ? (movement.run ? 'running' : 'walking') : 'idle';
    }
    this.syncAnimationState();
  }

  beginAttack(now: number, lockMs: number, state: PlayerState = 'attacking', allowInterrupt = false): boolean {
    if (this.state === 'defeated' || (!allowInterrupt && now < this.moveLockedUntil)) {
      return false;
    }

    this.state = state;
    this.syncAnimationState();
    this.moveLockedUntil = now + lockMs;
    this.lockStateUntil(now + lockMs);
    return true;
  }

  attack(now: number): boolean {
    return this.beginAttack(now, 1, 'attacking');
  }

  jump(now: number): boolean {
    if (this.state === 'defeated' || now < this.stateLockedUntil) {
      return false;
    }

    this.state = 'jumping';
    this.syncAnimationState();
    this.invulnerableUntil = now + 430;
    this.lockStateUntil(now + 520);
    this.scene.tweens.add({
      targets: this.avatarSprites,
      y: '-=42',
      yoyo: true,
      ease: 'Sine.easeOut',
      duration: 260,
    });
    this.scene.tweens.add({
      targets: this.shadow,
      scaleX: 0.72,
      scaleY: 0.72,
      alpha: 0.16,
      yoyo: true,
      ease: 'Sine.easeOut',
      duration: 260,
      onComplete: () => {
        if (this.state === 'jumping') {
          this.state = 'idle';
          this.syncAnimationState();
        }
      },
    });
    return true;
  }

  evade(now: number, movement: MovementInput): boolean {
    if (this.state === 'defeated' || now < this.stateLockedUntil) {
      return false;
    }

    const direction = new Phaser.Math.Vector2(movement.x, movement.y);
    if (direction.lengthSq() < 0.04) {
      direction.set(this.facing, 0);
    } else {
      direction.normalize();
    }

    if (Math.abs(direction.x) > 0.05) {
      this.setFacingDirection(direction.x > 0 ? 1 : -1);
    }

    const targetX = Phaser.Math.Clamp(this.container.x + direction.x * PLAYER_EVADE_DISTANCE, WALKABLE_LEFT, WALKABLE_RIGHT);
    const targetY = Phaser.Math.Clamp(this.container.y + direction.y * PLAYER_EVADE_DISTANCE * 0.56, WALKABLE_TOP, WALKABLE_BOTTOM);
    this.state = 'evading';
    this.invulnerableUntil = now + PLAYER_EVADE_INVULNERABLE_MS;
    this.moveLockedUntil = now + PLAYER_EVADE_DURATION_MS;
    this.lockStateUntil(now + PLAYER_EVADE_DURATION_MS);
    this.syncAnimationState();
    this.scene.tweens.add({
      targets: this.container,
      x: targetX,
      y: targetY,
      duration: PLAYER_EVADE_DURATION_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (this.state === 'evading') {
          this.state = 'idle';
          this.syncAnimationState();
        }
      },
    });
    this.scene.tweens.add({
      targets: this.shadow,
      scaleX: 0.84,
      scaleY: 0.78,
      alpha: 0.18,
      yoyo: true,
      ease: 'Sine.easeOut',
      duration: PLAYER_EVADE_DURATION_MS / 2,
    });
    return true;
  }

  showShootingPose(direction: Phaser.Math.Vector2, now: number): boolean {
    if (this.state === 'defeated' || now < this.moveLockedUntil || now < this.stateLockedUntil) {
      return false;
    }

    const aim = direction.clone();
    if (aim.lengthSq() < 0.01) {
      aim.set(this.facing, 0);
    } else {
      aim.normalize();
    }

    if (Math.abs(aim.x) > 0.05) {
      this.facing = aim.x > 0 ? 1 : -1;
    }

    this.gunAimFrameIndex = this.getGunAimFrameIndex(aim);
    this.shootingUntil = now + PLAYER_SHOOT_POSE_MS;
    this.state = 'shooting';
    this.syncAnimationState();
    this.applyDepthPresentation();
    return true;
  }

  lockStateUntil(time: number): void {
    this.stateLockedUntil = Math.max(this.stateLockedUntil, time);
  }

  setRecovering(until: number): void {
    if (this.state !== 'defeated') {
      this.state = 'recovering';
      this.syncAnimationState();
      this.lockStateUntil(until);
    }
  }

  spendHealth(cost: number): boolean {
    if (this.health <= cost || this.state === 'defeated') {
      return false;
    }

    this.health -= cost;
    return true;
  }

  heal(amount: number): void {
    if (this.state === 'defeated') {
      return;
    }

    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  takeDamage(damage: number, knockbackX: number): void {
    if (this.state === 'defeated' || !this.canBeHit()) {
      return;
    }

    this.health = Math.max(0, this.health - damage);
    this.knockbackVelocity.set(knockbackX, 0);
    this.state = this.health <= 0 ? 'defeated' : 'hurt';
    this.syncAnimationState();
    this.lockStateUntil(this.scene.time.now + 260);
    this.avatarSprites.forEach((sprite) => sprite.setTint(this.health <= 0 ? 0x555a66 : 0xffdf75));
    this.scene.time.delayedCall(140, () => {
      if (this.state !== 'defeated') {
        this.avatarSprites.forEach((sprite) => sprite.clearTint());
      }
    });
  }

  setFacingDirection(direction: FacingDirection): void {
    this.facing = direction;
    this.applyDepthPresentation();
  }

  getHurtbox(): Phaser.Geom.Rectangle {
    const scale = getDepthScale(this.container.y);
    return new Phaser.Geom.Rectangle(
      this.container.x - 20 * scale,
      this.container.y - 62 * scale,
      40 * scale,
      70 * scale,
    );
  }

  getDepthScale(): number {
    return getDepthScale(this.container.y);
  }

  canBeHit(): boolean {
    return this.scene.time.now >= this.invulnerableUntil;
  }

  private applyDepthPresentation(): void {
    const scale = getDepthScale(this.container.y);
    this.container.setScale(this.facing * scale, scale);
    this.gunAimSprite.setScale(this.gunAimSpriteScale / this.facing, this.gunAimSpriteScale);
    this.container.setDepth(getDepthSort(this.container.y));
  }

  private createActionSprite(
    textureKey: string,
    yOffset = PLAYER_ACTION_SPRITE_Y_OFFSET,
    scale = PLAYER_ACTION_SPRITE_DISPLAY_HEIGHT / PLAYER_ACTION_FRAME_HEIGHT,
  ): Phaser.GameObjects.Sprite {
    const sprite = this.scene.add.sprite(0, yOffset, textureKey, 0);
    sprite.setOrigin(0.5, 1);
    sprite.setScale(scale);
    sprite.setVisible(false);
    return sprite;
  }

  private ensureAnimations(): void {
    this.createAnimation('player-idle-loop', PLAYER_IDLE_SPRITE_KEY, PLAYER_IDLE_FRAME_COUNT, PLAYER_IDLE_FRAME_RATE, -1);
    this.createAnimation('player-walk-right-loop', PLAYER_WALK_SPRITE_KEY, PLAYER_WALK_FRAME_COUNT, PLAYER_WALK_FRAME_RATE, -1);
    this.createAnimation('player-run-right-loop', PLAYER_RUN_SPRITE_KEY, PLAYER_RUN_FRAME_COUNT, PLAYER_RUN_FRAME_RATE, -1);
    this.createAnimation('player-punch-once', PLAYER_PUNCH_SPRITE_KEY, PLAYER_PUNCH_FRAME_COUNT, PLAYER_PUNCH_FRAME_RATE, 0);
    this.createAnimation('player-kick-once', PLAYER_KICK_SPRITE_KEY, PLAYER_KICK_FRAME_COUNT, PLAYER_KICK_FRAME_RATE, 0);
    this.createAnimation('player-special-once', PLAYER_SPECIAL_SPRITE_KEY, PLAYER_SPECIAL_FRAME_COUNT, PLAYER_SPECIAL_FRAME_RATE, 0);
    this.createAnimation('player-jump-once', PLAYER_JUMP_SPRITE_KEY, PLAYER_JUMP_FRAME_COUNT, PLAYER_JUMP_FRAME_RATE, 0);
    this.createAnimation('player-evade-once', PLAYER_EVADE_SPRITE_KEY, PLAYER_EVADE_FRAME_COUNT, PLAYER_EVADE_FRAME_RATE, 0);
    this.createAnimation('player-hurt-once', PLAYER_HURT_SPRITE_KEY, PLAYER_HURT_FRAME_COUNT, PLAYER_HURT_FRAME_RATE, 0);
    this.createAnimation('player-defeated-once', PLAYER_DEFEATED_SPRITE_KEY, PLAYER_DEFEATED_FRAME_COUNT, PLAYER_DEFEATED_FRAME_RATE, 0);
  }

  private createAnimation(key: string, textureKey: string, frameCount: number, frameRate: number, repeat: number): void {
    if (this.scene.anims.exists(key)) {
      return;
    }

    this.scene.anims.create({
      key,
      frames: this.scene.anims.generateFrameNumbers(textureKey, {
        start: 0,
        end: frameCount - 1,
      }),
      frameRate,
      repeat,
    });
  }

  private syncAnimationState(): void {
    const sprite = this.stateSprites[this.state] ?? this.body;
    const animationKey = this.getAnimationKeyForState();

    this.avatarSprites.forEach((avatarSprite) => {
      avatarSprite.setVisible(avatarSprite === sprite);
    });

    if (!animationKey) {
      sprite.stop();
      sprite.setFrame(this.gunAimFrameIndex);
      this.activeAnimationKey = '';
      return;
    }

    if (animationKey !== this.activeAnimationKey || !sprite.anims.isPlaying) {
      sprite.play(animationKey);
      this.activeAnimationKey = animationKey;
    }
  }

  private getAnimationKeyForState(): string {
    switch (this.state) {
      case 'walking':
        return 'player-walk-right-loop';
      case 'running':
        return 'player-run-right-loop';
      case 'attacking':
      case 'combo':
        return 'player-punch-once';
      case 'kicking':
        return 'player-kick-once';
      case 'special':
        return 'player-special-once';
      case 'shooting':
        return '';
      case 'jumping':
        return 'player-jump-once';
      case 'evading':
        return 'player-evade-once';
      case 'hurt':
        return 'player-hurt-once';
      case 'defeated':
        return 'player-defeated-once';
      default:
        return 'player-idle-loop';
    }
  }

  private getGunAimFrameIndex(direction: Phaser.Math.Vector2): number {
    const snapped = Phaser.Math.Angle.Wrap(Math.round(Math.atan2(direction.y, direction.x) / (Math.PI / 4)) * (Math.PI / 4));
    const epsilon = 0.001;

    if (Math.abs(snapped) < epsilon) {
      return 0;
    }
    if (Math.abs(snapped + Math.PI / 4) < epsilon) {
      return 1;
    }
    if (Math.abs(snapped + Math.PI / 2) < epsilon) {
      return 2;
    }
    if (Math.abs(snapped + 3 * Math.PI / 4) < epsilon) {
      return 3;
    }
    if (Math.abs(Math.abs(snapped) - Math.PI) < epsilon) {
      return 4;
    }
    if (Math.abs(snapped - 3 * Math.PI / 4) < epsilon) {
      return 5;
    }
    if (Math.abs(snapped - Math.PI / 2) < epsilon) {
      return 6;
    }
    return 7;
  }
}
