import Phaser from 'phaser';
import { backgrounds } from '../data/backgrounds';
import {
  CYBER_STAGE_SHEET_KEY,
  GAME_HEIGHT,
  SETPIECE_NEON_GATE_KEY,
  SETPIECE_OVERPASS_SIGN_KEY,
  SETPIECE_RAISED_WALKWAY_KEY,
  SETPIECE_STAIRS_RAMP_KEY,
  SETPIECE_STREET_KIOSK_KEY,
  SETPIECE_SUBWAY_ENTRANCE_KEY,
  WALKABLE_BOTTOM,
  WALKABLE_LEFT,
  WALKABLE_RIGHT,
  WALKABLE_TOP,
  WORLD_WIDTH,
} from '../utils/constants';
import { LevelDefinition, StageSetpiecePlacement } from '../utils/types';
import { ParallaxBackgroundSystem } from './ParallaxBackgroundSystem';

export class StageRendererSystem {
  constructor(private readonly scene: Phaser.Scene) {}

  createWorld(level: LevelDefinition): ParallaxBackgroundSystem | undefined {
    this.scene.cameras.main.setBackgroundColor('#111318');
    const background = backgrounds[level.backgroundId];
    const parallaxBackground = background ? new ParallaxBackgroundSystem(this.scene, background) : undefined;

    this.scene.add.rectangle(0, 0, WORLD_WIDTH, GAME_HEIGHT, 0x121620).setOrigin(0).setDepth(-45);
    this.renderCityBackdrops();
    this.renderStreet();
    this.renderRoadTexture();
    this.renderStageSetpieces(level);

    this.scene.add.rectangle(WALKABLE_LEFT, WALKABLE_TOP, 4, WALKABLE_BOTTOM - WALKABLE_TOP, 0x8ecae6, 0.42).setOrigin(0).setDepth(-4);
    this.scene.add.rectangle(WALKABLE_RIGHT, WALKABLE_TOP, 4, WALKABLE_BOTTOM - WALKABLE_TOP, 0x8ecae6, 0.42).setOrigin(0).setDepth(-4);

    this.scene.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    return parallaxBackground;
  }

  private renderStreet(): void {
    const street = this.scene.add.graphics();
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
      const stripe = this.scene.add.rectangle(x + 32, stripeY, 92, 5, 0xf4d35e, 0.5).setOrigin(0);
      stripe.setDepth(-5);
      stripe.setAngle(1.5);
    }
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
    const image = this.scene.add.image(x, y, CYBER_STAGE_SHEET_KEY, frame)
      .setOrigin(0, 1)
      .setDepth(depth)
      .setAlpha(alpha);

    if (width !== undefined && height !== undefined) {
      image.setDisplaySize(width, height);
    } else if (height !== undefined) {
      const source = this.scene.textures.get(CYBER_STAGE_SHEET_KEY).get(frame);
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
    const image = this.scene.add.image(x, y, textureKey)
      .setOrigin(0, 1)
      .setDepth(depth)
      .setAlpha(alpha);

    if (width !== undefined && height !== undefined) {
      image.setDisplaySize(width, height);
    } else if (height !== undefined) {
      const source = this.scene.textures.get(textureKey).getSourceImage() as HTMLImageElement;
      image.setDisplaySize(source.width * (height / source.height), height);
    }

    return image;
  }

  private addStageShadow(x: number, y: number, width: number, height: number, depth: number): void {
    this.scene.add.ellipse(x + width * 0.5, y, width, height, 0x05070b, 0.34)
      .setDepth(depth);
  }

  private addStageSign(setpiece: StageSetpiecePlacement, x: number, y: number): void {
    if (!setpiece.label) {
      return;
    }

    this.scene.add.text(x, y, setpiece.label, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '11px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(-1);
  }
}

