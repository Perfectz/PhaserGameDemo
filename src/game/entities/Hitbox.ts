import Phaser from 'phaser';

export class Hitbox {
  readonly rect: Phaser.GameObjects.Rectangle;
  readonly hitEnemyIds = new Set<number>();
  readonly hitPropIds = new Set<number>();

  private expiresAt: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    durationMs: number,
    color = 0xfff35c,
  ) {
    this.rect = scene.add.rectangle(x, y, width, height, color, 0);
    this.rect.setVisible(false);
    this.rect.setDepth(5000);
    this.expiresAt = scene.time.now + durationMs;
  }

  get bounds(): Phaser.Geom.Rectangle {
    return this.rect.getBounds();
  }

  update(now: number): boolean {
    if (now < this.expiresAt) {
      return true;
    }

    this.destroy();
    return false;
  }

  destroy(): void {
    this.rect.destroy();
  }
}
