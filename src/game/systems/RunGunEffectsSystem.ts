import Phaser from 'phaser';
import { SFX_ENEMY_DEFEAT_KEY, SFX_HIT_LIGHT_KEY } from '../utils/constants';
import { playSfx } from './SoundSystem';

export class RunGunEffectsSystem {
  constructor(private readonly scene: Phaser.Scene) {}

  spawnPlayerMuzzleFlash(x: number, y: number, angle: number): void {
    const flash = this.scene.add.rectangle(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16, 32, 8, 0xfff4a3, 0.95)
      .setRotation(angle)
      .setDepth(2200);
    const glow = this.scene.add.circle(x, y, 18, 0x8ecae6, 0.35)
      .setDepth(2199);

    this.scene.tweens.add({
      targets: flash,
      scaleX: 1.7,
      alpha: 0,
      duration: 90,
      ease: 'Sine.easeOut',
      onComplete: () => flash.destroy(),
    });
    this.scene.tweens.add({
      targets: glow,
      scale: 1.6,
      alpha: 0,
      duration: 130,
      ease: 'Sine.easeOut',
      onComplete: () => glow.destroy(),
    });
  }

  spawnSpark(x: number, y: number): void {
    playSfx(this.scene, SFX_HIT_LIGHT_KEY, { volume: 0.26, rate: 1.3 });
    const spark = this.scene.add.ellipse(x, y, 28, 18, 0xffd166, 0.92).setDepth(2300);
    spark.setStrokeStyle(2, 0xffffff, 0.88);
    this.scene.tweens.add({
      targets: spark,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 130,
      ease: 'Sine.easeOut',
      onComplete: () => spark.destroy(),
    });
  }

  spawnLifeRecovery(x: number, y: number): void {
    const text = this.scene.add.text(x, y, '+1 LIFE', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '16px',
      color: '#8ecae6',
      stroke: '#07090d',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(2400);

    this.scene.tweens.add({
      targets: text,
      y: y - 44,
      alpha: 0,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  spawnExplosion(x: number, y: number, scale = 1): void {
    playSfx(this.scene, SFX_ENEMY_DEFEAT_KEY, { volume: 0.34, rate: Phaser.Math.FloatBetween(1.05, 1.18) });

    const flash = this.scene.add.circle(x, y, 34 * scale, 0xfff4a3, 0.95).setDepth(2350);
    const core = this.scene.add.circle(x, y, 18 * scale, 0xff4d1f, 0.9).setDepth(2360);
    const ring = this.scene.add.circle(x, y, 28 * scale, 0xffd166, 0).setDepth(2340);
    ring.setStrokeStyle(5 * scale, 0xfff4a3, 0.9);

    this.scene.tweens.add({
      targets: flash,
      scale: 2.45,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
    this.scene.tweens.add({
      targets: core,
      scale: 1.75,
      alpha: 0,
      duration: 230,
      ease: 'Sine.easeOut',
      onComplete: () => core.destroy(),
    });
    this.scene.tweens.add({
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
      const smoke = this.scene.add.circle(x, y, Phaser.Math.Between(9, 18) * scale, 0x485160, 0.58).setDepth(2220);
      this.scene.tweens.add({
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
      const shard = this.scene.add.rectangle(x, y, Phaser.Math.Between(5, 13) * scale, Phaser.Math.Between(3, 8) * scale, 0xffd166, 1).setDepth(2320);
      const angle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
      const distance = Phaser.Math.Between(46, 136) * scale;
      this.scene.tweens.add({
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

    this.scene.cameras.main.shake(120, 0.0032 * scale);
  }
}

