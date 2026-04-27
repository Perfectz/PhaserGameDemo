import Phaser from 'phaser';
import { getDepthSort } from '../utils/depth';

export class Pickup {
  readonly container: Phaser.GameObjects.Container;
  readonly amount = 18;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const shadow = scene.add.ellipse(0, 8, 28, 10, 0x000000, 0.22);
    const ring = scene.add.ellipse(0, 0, 34, 18);
    ring.setStrokeStyle(2, 0x77ff9d, 0.42);
    const marker = scene.add.ellipse(0, 0, 24, 24, 0x77ff9d, 0.92);
    marker.setStrokeStyle(2, 0xecfff1);
    const crossH = scene.add.rectangle(0, 0, 14, 4, 0x103d27, 1);
    const crossV = scene.add.rectangle(0, 0, 4, 14, 0x103d27, 1);
    this.container = scene.add.container(x, y, [shadow, ring, marker, crossH, crossV]);
    this.container.setDepth(getDepthSort(y) + 10);
    scene.tweens.add({
      targets: [marker, crossH, crossV],
      y: -5,
      yoyo: true,
      repeat: -1,
      duration: 520,
      ease: 'Sine.easeInOut',
    });
    scene.tweens.add({
      targets: ring,
      scaleX: 1.18,
      scaleY: 1.18,
      alpha: 0.18,
      yoyo: true,
      repeat: -1,
      duration: 620,
      ease: 'Sine.easeInOut',
    });
    scene.tweens.add({
      targets: shadow,
      scaleX: 0.82,
      alpha: 0.16,
      yoyo: true,
      repeat: -1,
      duration: 520,
      ease: 'Sine.easeInOut',
    });
  }

  overlaps(bounds: Phaser.Geom.Rectangle): boolean {
    const pickupBounds = new Phaser.Geom.Rectangle(this.container.x - 16, this.container.y - 22, 32, 32);
    return Phaser.Geom.Intersects.RectangleToRectangle(bounds, pickupBounds);
  }

  destroy(): void {
    this.container.destroy();
  }
}
