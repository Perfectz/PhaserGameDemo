import Phaser from 'phaser';
import { DestructibleProp } from './DestructibleProp';
import { Enemy } from './Enemy';
import {
  PLAYER_SHOT_DAMAGE,
  PLAYER_SHOT_KNOCKBACK,
  PLAYER_SHOT_LIFESPAN_MS,
  PLAYER_SHOT_SPEED,
  SFX_ENEMY_DEFEAT_KEY,
  SFX_HIT_LIGHT_KEY,
  SFX_PROP_BREAK_KEY,
  SFX_PROP_HIT_KEY,
  WALKABLE_BOTTOM,
  WALKABLE_LEFT,
  WALKABLE_RIGHT,
  WALKABLE_TOP,
} from '../utils/constants';
import { getDepthSort } from '../utils/depth';
import { playSfx } from '../systems/SoundSystem';

export class Projectile {
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly glow: Phaser.GameObjects.Ellipse;

  private readonly spawnedAt: number;
  private readonly direction: Phaser.Math.Vector2;
  private destroyed = false;

  constructor(private scene: Phaser.Scene, x: number, y: number, direction: Phaser.Math.Vector2) {
    this.spawnedAt = scene.time.now;
    this.direction = direction.clone().normalize();
    this.sprite = scene.add.rectangle(x, y, 24, 5, 0xfff35c, 1);
    this.sprite.setStrokeStyle(2, 0xffffff, 0.82);
    this.sprite.setRotation(Math.atan2(this.direction.y, this.direction.x));
    this.sprite.setDepth(getDepthSort(y) + 300);
    this.glow = scene.add.ellipse(x - this.direction.x * 9, y - this.direction.y * 9, 26, 12, 0xfff35c, 0.28);
    this.glow.setRotation(this.sprite.rotation);
    this.glow.setDepth(this.sprite.depth - 1);
  }

  update(deltaMs: number, enemies: Enemy[], props: DestructibleProp[]): boolean {
    if (this.destroyed) {
      return false;
    }

    const dt = deltaMs / 1000;
    this.sprite.x += this.direction.x * PLAYER_SHOT_SPEED * dt;
    this.sprite.y += this.direction.y * PLAYER_SHOT_SPEED * dt;
    this.sprite.setDepth(getDepthSort(this.sprite.y) + 300);
    this.glow.setPosition(this.sprite.x - this.direction.x * 9, this.sprite.y - this.direction.y * 9);
    this.glow.setRotation(this.sprite.rotation);
    this.glow.setDepth(this.sprite.depth - 1);
    this.glow.setAlpha(0.18 + Math.sin(this.scene.time.now / 34) * 0.08);

    if (
      this.scene.time.now - this.spawnedAt > PLAYER_SHOT_LIFESPAN_MS ||
      this.sprite.x < WALKABLE_LEFT - 80 ||
      this.sprite.x > WALKABLE_RIGHT + 80 ||
      this.sprite.y < WALKABLE_TOP - 120 ||
      this.sprite.y > WALKABLE_BOTTOM + 80
    ) {
      this.destroy();
      return false;
    }

    const bounds = this.getBounds();
    for (const enemy of enemies) {
      if (enemy.state === 'defeated' || enemy.state === 'knockedDown' || enemy.state === 'gettingUp') {
        continue;
      }

      if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, enemy.getHurtbox())) {
        const defeatedByHit = enemy.health <= PLAYER_SHOT_DAMAGE;
        const knockback = (Math.sign(this.direction.x) || 1) * PLAYER_SHOT_KNOCKBACK;
        enemy.takeDamage(PLAYER_SHOT_DAMAGE, knockback, 150, false);
        playSfx(this.scene, defeatedByHit ? SFX_ENEMY_DEFEAT_KEY : SFX_HIT_LIGHT_KEY, {
          volume: defeatedByHit ? 0.5 : 0.4,
          rate: 1.12,
        });
        this.spawnImpact(enemy.container.x, enemy.container.y - 62, defeatedByHit);
        this.destroy();
        return false;
      }
    }

    for (const prop of props) {
      if (prop.isDestroyed) {
        continue;
      }

      if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, prop.getHurtbox())) {
        const knockback = (Math.sign(this.direction.x) || 1) * PLAYER_SHOT_KNOCKBACK;
        const destroyed = prop.takeDamage(PLAYER_SHOT_DAMAGE, knockback);
        playSfx(this.scene, destroyed ? SFX_PROP_BREAK_KEY : SFX_PROP_HIT_KEY, {
          volume: destroyed ? 0.5 : 0.36,
        });
        this.spawnImpact(prop.container.x, prop.container.y - 42, destroyed);
        if (destroyed) {
          this.scene.events.emit('pickup:spawn', prop.container.x, prop.container.y - 10);
        }
        this.destroy();
        return false;
      }
    }

    return true;
  }

  destroy(): void {
    this.destroyed = true;
    this.glow.destroy();
    this.sprite.destroy();
  }

  private getBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.sprite.x - 10, this.sprite.y - 10, 20, 20);
  }

  private spawnImpact(x: number, y: number, heavy: boolean): void {
    const spark = this.scene.add.ellipse(x, y, heavy ? 28 : 18, heavy ? 18 : 12, 0xfff35c, 0.9);
    spark.setStrokeStyle(2, 0xffffff, 0.8);
    spark.setDepth(getDepthSort(y) + 360);
    this.scene.tweens.add({
      targets: spark,
      scaleX: heavy ? 1.8 : 1.35,
      scaleY: heavy ? 1.8 : 1.35,
      alpha: 0,
      duration: heavy ? 180 : 120,
      ease: 'Sine.easeOut',
      onComplete: () => spark.destroy(),
    });
  }
}
