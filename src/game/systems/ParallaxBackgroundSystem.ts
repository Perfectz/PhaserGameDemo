import Phaser from 'phaser';
import { GAME_WIDTH, WALKABLE_TOP } from '../utils/constants';
import { BackgroundDefinition, ParallaxLayerDefinition } from '../utils/types';

interface ParallaxLayerView {
  definition: ParallaxLayerDefinition;
  sprite: Phaser.GameObjects.TileSprite;
}

export class ParallaxBackgroundSystem {
  private readonly skyTop: Phaser.GameObjects.Rectangle;
  private readonly skyBottom: Phaser.GameObjects.Rectangle;
  private readonly horizon: Phaser.GameObjects.Rectangle;
  private readonly layers: ParallaxLayerView[];

  constructor(private scene: Phaser.Scene, definition: BackgroundDefinition) {
    this.skyTop = scene.add.rectangle(0, 0, GAME_WIDTH, WALKABLE_TOP * 0.52, definition.skyTopColor)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-40);
    this.skyBottom = scene.add.rectangle(0, WALKABLE_TOP * 0.52, GAME_WIDTH, WALKABLE_TOP * 0.48, definition.skyBottomColor)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-39);
    this.horizon = scene.add.rectangle(0, WALKABLE_TOP - 20, GAME_WIDTH, 20, definition.horizonColor)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-27);

    this.layers = definition.layers.map((layer) => {
      this.ensureTexture(layer);
      return {
        definition: layer,
        sprite: scene.add.tileSprite(0, layer.y, GAME_WIDTH, layer.tileHeight, layer.textureKey)
          .setOrigin(0)
          .setScrollFactor(0)
          .setDepth(layer.depth)
          .setAlpha(layer.alpha ?? 1),
      };
    });
  }

  update(): void {
    const camera = this.scene.cameras.main;
    this.layers.forEach(({ definition, sprite }) => {
      sprite.tilePositionX = camera.scrollX * definition.scrollSpeed;
    });
  }

  updateLayout(width: number, height: number): void {
    this.skyTop.setSize(width, WALKABLE_TOP * 0.52);
    this.skyBottom.setPosition(0, WALKABLE_TOP * 0.52);
    this.skyBottom.setSize(width, Math.max(WALKABLE_TOP * 0.48, height - WALKABLE_TOP));
    this.horizon.setSize(width, 20);
    this.layers.forEach(({ definition, sprite }) => {
      sprite.setSize(width, definition.tileHeight);
    });
  }

  private ensureTexture(layer: ParallaxLayerDefinition): void {
    if (this.scene.textures.exists(layer.textureKey)) {
      return;
    }
    if (!layer.shape) {
      throw new Error(`Missing parallax texture: ${layer.textureKey}`);
    }

    const graphics = this.scene.add.graphics();
    graphics.setVisible(false);
    switch (layer.shape) {
      case 'haze':
        this.drawHaze(graphics, layer);
        break;
      case 'farSkyline':
        this.drawFarSkyline(graphics, layer);
        break;
      case 'midSkyline':
        this.drawMidSkyline(graphics, layer);
        break;
      case 'streetRail':
        this.drawStreetRail(graphics, layer);
        break;
    }
    graphics.generateTexture(layer.textureKey, layer.tileWidth, layer.tileHeight);
    graphics.destroy();
  }

  private drawHaze(graphics: Phaser.GameObjects.Graphics, layer: ParallaxLayerDefinition): void {
    graphics.fillStyle(0x7aa0bd, 0.08);
    graphics.fillRect(0, 24, layer.tileWidth, 16);
    graphics.fillStyle(0xc9d7e5, 0.12);
    graphics.fillRect(54, 56, 160, 10);
    graphics.fillRect(265, 42, 116, 8);
  }

  private drawFarSkyline(graphics: Phaser.GameObjects.Graphics, layer: ParallaxLayerDefinition): void {
    const groundY = layer.tileHeight;
    const buildings = [
      [10, 74, 58, 84],
      [78, 48, 76, 110],
      [170, 68, 64, 90],
      [250, 36, 94, 122],
      [360, 58, 72, 100],
      [452, 86, 50, 72],
    ];

    buildings.forEach(([x, y, width, height], index) => {
      graphics.fillStyle(index % 2 === 0 ? 0x172131 : 0x111926, 1);
      graphics.fillRect(x, y, width, height);
      graphics.fillStyle(0x8ecae6, 0.16);
      for (let windowY = y + 18; windowY < groundY - 14; windowY += 22) {
        graphics.fillRect(x + 12, windowY, 8, 4);
        graphics.fillRect(x + width - 22, windowY + 7, 8, 4);
      }
    });
  }

  private drawMidSkyline(graphics: Phaser.GameObjects.Graphics, layer: ParallaxLayerDefinition): void {
    const groundY = layer.tileHeight;
    const buildings = [
      [0, 44, 74, 90],
      [92, 18, 86, 116],
      [196, 54, 62, 80],
      [276, 28, 98, 106],
    ];

    buildings.forEach(([x, y, width, height], index) => {
      graphics.fillStyle(index % 2 === 0 ? 0x202a3b : 0x263247, 1);
      graphics.fillRect(x, y, width, height);
      graphics.fillStyle(0xffd166, 0.24);
      for (let windowY = y + 18; windowY < groundY - 12; windowY += 20) {
        for (let windowX = x + 14; windowX < x + width - 10; windowX += 24) {
          graphics.fillRect(windowX, windowY, 7, 5);
        }
      }
    });
  }

  private drawStreetRail(graphics: Phaser.GameObjects.Graphics, layer: ParallaxLayerDefinition): void {
    graphics.fillStyle(0x151a23, 1);
    graphics.fillRect(0, 31, layer.tileWidth, 21);
    graphics.lineStyle(4, 0x6d788b, 0.9);
    graphics.lineBetween(0, 8, layer.tileWidth, 8);
    graphics.lineBetween(0, 29, layer.tileWidth, 29);
    graphics.lineStyle(3, 0x394353, 1);
    for (let x = 10; x < layer.tileWidth; x += 42) {
      graphics.lineBetween(x, 8, x + 12, 52);
    }
  }
}
