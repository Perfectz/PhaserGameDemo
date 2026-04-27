import Phaser from 'phaser';
import { DestructiblePropDefinition } from '../data/destructibleProps';
import {
  DESTRUCTIBLE_DAMAGE_FRAME_COUNT,
  DESTRUCTIBLE_SPRITE_KEY,
  WALKABLE_BOTTOM,
  WALKABLE_LEFT,
  WALKABLE_RIGHT,
  WALKABLE_TOP,
} from '../utils/constants';
import { getDepthScale, getDepthSort } from '../utils/depth';

let nextPropId = 1;

export class DestructibleProp {
  readonly id = nextPropId++;
  readonly container: Phaser.GameObjects.Container;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Ellipse;

  health: number;
  readonly maxHealth: number;
  isDestroyed = false;

  private currentDamageFrame = 0;

  constructor(
    private scene: Phaser.Scene,
    readonly definition: DestructiblePropDefinition,
    x: number,
    y: number,
  ) {
    this.maxHealth = definition.maxHealth;
    this.health = definition.maxHealth;

    this.shadow = scene.add.ellipse(0, 1, definition.bodyWidth * 0.82, 10, 0x000000, 0.22);
    this.sprite = scene.add.sprite(0, 4, DESTRUCTIBLE_SPRITE_KEY, this.getFrameIndex(0));
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setDisplaySize(
      definition.displayHeight,
      definition.displayHeight,
    );

    this.container = scene.add.container(
      Phaser.Math.Clamp(x, WALKABLE_LEFT, WALKABLE_RIGHT),
      Phaser.Math.Clamp(y, WALKABLE_TOP, WALKABLE_BOTTOM),
      [this.shadow, this.sprite],
    );
    this.container.setSize(definition.bodyWidth, definition.bodyHeight);
    this.applyDepthPresentation();
  }

  takeDamage(damage: number, knockbackX: number): boolean {
    if (this.isDestroyed) {
      return false;
    }

    this.health = Math.max(0, this.health - damage);
    const nextFrame = this.health <= 0
      ? 2
      : this.health <= this.maxHealth * 0.45
        ? 2
        : 1;
    this.setDamageFrame(nextFrame);
    this.flashHit(knockbackX);

    if (this.health <= 0) {
      this.breakApart(knockbackX);
      return true;
    }

    return false;
  }

  getHurtbox(): Phaser.Geom.Rectangle {
    const scale = getDepthScale(this.container.y);
    const width = this.definition.bodyWidth * scale;
    const height = this.definition.bodyHeight * scale;
    return new Phaser.Geom.Rectangle(
      this.container.x - width / 2,
      this.container.y - height,
      width,
      height,
    );
  }

  destroy(): void {
    this.container.destroy();
  }

  private setDamageFrame(frame: number): void {
    const clamped = Phaser.Math.Clamp(frame, 0, DESTRUCTIBLE_DAMAGE_FRAME_COUNT - 1);
    if (clamped === this.currentDamageFrame) {
      return;
    }

    this.currentDamageFrame = clamped;
    this.sprite.setFrame(this.getFrameIndex(clamped));
  }

  private breakApart(knockbackX: number): void {
    this.isDestroyed = true;
    this.scene.time.delayedCall(90, () => {
      if (!this.container.scene) {
        return;
      }
      this.setDamageFrame(3);
      this.shadow.setScale(1.1, 0.72);
      this.spawnDebris(knockbackX);
    });
  }

  private flashHit(knockbackX: number): void {
    this.sprite.setTint(0xfff0a6);
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + Math.sign(knockbackX || 1) * 5,
      yoyo: true,
      duration: 45,
      ease: 'Sine.easeOut',
    });
    this.scene.time.delayedCall(90, () => {
      if (!this.isDestroyed) {
        this.sprite.clearTint();
      }
    });
  }

  private spawnDebris(knockbackX: number): void {
    const direction = Math.sign(knockbackX || 1);
    for (let index = 0; index < 5; index += 1) {
      const shard = this.scene.add.rectangle(
        this.container.x,
        this.container.y - Phaser.Math.Between(18, 46),
        Phaser.Math.Between(5, 11),
        Phaser.Math.Between(3, 8),
        this.getDebrisColor(),
        0.95,
      );
      shard.setDepth(getDepthSort(this.container.y) + 20 + index);
      shard.setAngle(Phaser.Math.Between(-35, 35));
      this.scene.tweens.add({
        targets: shard,
        x: shard.x + direction * Phaser.Math.Between(24, 70),
        y: shard.y + Phaser.Math.Between(-16, 18),
        alpha: 0,
        angle: shard.angle + Phaser.Math.Between(-100, 100),
        duration: 360,
        ease: 'Sine.easeOut',
        onComplete: () => shard.destroy(),
      });
    }
  }

  private getDebrisColor(): number {
    switch (this.definition.id) {
      case 'mailbox':
        return 0x1f56c6;
      case 'woodenCrate':
        return 0xb06a2c;
      case 'oilDrum':
        return 0xd1342f;
      default:
        return 0xb8bec4;
    }
  }

  private getFrameIndex(damageFrame: number): number {
    return this.definition.rowIndex * DESTRUCTIBLE_DAMAGE_FRAME_COUNT + damageFrame;
  }

  private applyDepthPresentation(): void {
    const scale = getDepthScale(this.container.y);
    this.container.setScale(scale);
    this.container.setDepth(getDepthSort(this.container.y));
  }
}
