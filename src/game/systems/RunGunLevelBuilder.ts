import Phaser from 'phaser';
import { GAME_HEIGHT } from '../utils/constants';

export const RUN_GUN_WORLD_WIDTH = 3600;
export const RUN_GUN_CHECKPOINTS = [980, 1840, 2700] as const;
export const RUN_GUN_GOAL_X = RUN_GUN_WORLD_WIDTH - 120;

const RUN_GUN_FAR_TEXTURE_KEY = 'run-gun-far-backdrop';
const RUN_GUN_MID_TEXTURE_KEY = 'run-gun-mid-backdrop';
const RUN_GUN_FLOOR_TEXTURE_KEY = 'run-gun-floor-tile';
const RUN_GUN_PLATFORM_TEXTURE_KEY = 'run-gun-platform-tile';

export class RunGunLevelBuilder {
  constructor(private readonly scene: Phaser.Scene) {}

  create(): Phaser.Physics.Arcade.StaticGroup {
    this.scene.physics.world.gravity.y = 1320;
    this.scene.physics.world.setBounds(0, 0, RUN_GUN_WORLD_WIDTH, GAME_HEIGHT);
    this.scene.cameras.main.setBounds(0, 0, RUN_GUN_WORLD_WIDTH, GAME_HEIGHT);
    this.createLevelTextures();
    this.createBackground();
    const platforms = this.createPlatforms();
    this.createCheckpoints();
    return platforms;
  }

  private createLevelTextures(): void {
    if (!this.scene.textures.exists(RUN_GUN_FAR_TEXTURE_KEY)) {
      const far = this.scene.textures.createCanvas(RUN_GUN_FAR_TEXTURE_KEY, 960, 260)!;
      const context = far.context;
      const sky = context.createLinearGradient(0, 0, 0, 260);
      sky.addColorStop(0, '#08131f');
      sky.addColorStop(0.58, '#102636');
      sky.addColorStop(1, '#18222f');
      context.fillStyle = sky;
      context.fillRect(0, 0, 960, 260);

      context.fillStyle = 'rgba(71, 197, 255, 0.18)';
      context.beginPath();
      context.arc(790, 58, 72, 0, Math.PI * 2);
      context.fill();

      for (let index = 0; index < 30; index += 1) {
        const x = index * 34 + (index % 3) * 8;
        const width = 32 + (index % 5) * 10;
        const height = 68 + (index % 7) * 18;
        context.fillStyle = index % 2 === 0 ? '#101b27' : '#132130';
        context.fillRect(x, 220 - height, width, height);
        context.fillStyle = index % 3 === 0 ? 'rgba(255, 209, 102, 0.62)' : 'rgba(70, 210, 255, 0.42)';
        for (let row = 0; row < Math.floor(height / 18); row += 1) {
          for (let column = 0; column < Math.floor(width / 16); column += 1) {
            if ((row + column + index) % 3 !== 0) {
              context.fillRect(x + 7 + column * 15, 220 - height + 12 + row * 17, 5, 3);
            }
          }
        }
      }

      context.fillStyle = 'rgba(20, 44, 58, 0.75)';
      context.fillRect(0, 224, 960, 36);
      context.strokeStyle = 'rgba(82, 220, 255, 0.24)';
      context.lineWidth = 2;
      for (let x = 0; x < 960; x += 96) {
        context.beginPath();
        context.moveTo(x, 224);
        context.lineTo(x + 68, 260);
        context.stroke();
      }
      far.refresh();
    }

    if (!this.scene.textures.exists(RUN_GUN_MID_TEXTURE_KEY)) {
      const mid = this.scene.textures.createCanvas(RUN_GUN_MID_TEXTURE_KEY, 960, 340)!;
      const context = mid.context;
      context.clearRect(0, 0, 960, 340);

      const wall = context.createLinearGradient(0, 0, 0, 340);
      wall.addColorStop(0, '#182734');
      wall.addColorStop(1, '#202a34');
      context.fillStyle = wall;
      context.fillRect(0, 46, 960, 294);

      for (let x = 0; x < 960; x += 160) {
        context.fillStyle = x % 320 === 0 ? '#263746' : '#22303d';
        context.fillRect(x + 12, 72, 116, 206);
        context.strokeStyle = 'rgba(132, 239, 255, 0.22)';
        context.lineWidth = 3;
        context.strokeRect(x + 12, 72, 116, 206);
        context.fillStyle = 'rgba(5, 10, 15, 0.48)';
        context.fillRect(x + 28, 96, 84, 42);
        context.fillRect(x + 28, 158, 84, 42);
        context.fillStyle = 'rgba(255, 82, 49, 0.66)';
        context.fillRect(x + 32, 144, 74, 4);
        context.fillStyle = 'rgba(75, 222, 255, 0.5)';
        context.fillRect(x + 34, 208, 70, 5);
      }

      context.strokeStyle = '#324657';
      context.lineWidth = 16;
      context.beginPath();
      context.moveTo(0, 286);
      context.lineTo(960, 286);
      context.stroke();
      context.strokeStyle = 'rgba(255, 209, 102, 0.5)';
      context.lineWidth = 3;
      for (let x = -80; x < 960; x += 80) {
        context.beginPath();
        context.moveTo(x, 302);
        context.lineTo(x + 42, 272);
        context.stroke();
      }

      context.strokeStyle = 'rgba(78, 224, 255, 0.38)';
      context.lineWidth = 7;
      context.beginPath();
      context.moveTo(0, 54);
      context.lineTo(960, 54);
      context.stroke();
      mid.refresh();
    }

    if (!this.scene.textures.exists(RUN_GUN_FLOOR_TEXTURE_KEY)) {
      const floor = this.scene.textures.createCanvas(RUN_GUN_FLOOR_TEXTURE_KEY, 512, 96)!;
      const context = floor.context;
      const metal = context.createLinearGradient(0, 0, 0, 96);
      metal.addColorStop(0, '#3a414a');
      metal.addColorStop(0.55, '#242a32');
      metal.addColorStop(1, '#151a20');
      context.fillStyle = metal;
      context.fillRect(0, 0, 512, 96);

      for (let x = 0; x < 512; x += 128) {
        context.strokeStyle = 'rgba(151, 177, 190, 0.28)';
        context.lineWidth = 2;
        context.strokeRect(x + 4, 8, 120, 76);
        context.fillStyle = 'rgba(10, 14, 18, 0.28)';
        context.fillRect(x + 10, 16, 108, 20);
        context.fillStyle = x % 256 === 0 ? 'rgba(255, 209, 102, 0.74)' : 'rgba(48, 220, 255, 0.58)';
        context.fillRect(x + 16, 74, 94, 4);
        context.fillStyle = '#12161b';
        context.beginPath();
        context.arc(x + 18, 18, 3, 0, Math.PI * 2);
        context.arc(x + 110, 18, 3, 0, Math.PI * 2);
        context.arc(x + 18, 76, 3, 0, Math.PI * 2);
        context.arc(x + 110, 76, 3, 0, Math.PI * 2);
        context.fill();
      }

      context.fillStyle = 'rgba(255, 183, 64, 0.9)';
      for (let x = -20; x < 512; x += 42) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + 22, 0);
        context.lineTo(x + 4, 14);
        context.lineTo(x - 18, 14);
        context.closePath();
        context.fill();
      }
      floor.refresh();
    }

    if (!this.scene.textures.exists(RUN_GUN_PLATFORM_TEXTURE_KEY)) {
      const platform = this.scene.textures.createCanvas(RUN_GUN_PLATFORM_TEXTURE_KEY, 256, 36)!;
      const context = platform.context;
      const metal = context.createLinearGradient(0, 0, 0, 36);
      metal.addColorStop(0, '#4a5b66');
      metal.addColorStop(0.38, '#2d3842');
      metal.addColorStop(1, '#161d24');
      context.fillStyle = metal;
      context.fillRect(0, 0, 256, 36);
      context.strokeStyle = 'rgba(142, 234, 255, 0.52)';
      context.lineWidth = 2;
      context.strokeRect(1, 1, 254, 34);
      context.fillStyle = 'rgba(255, 209, 102, 0.72)';
      for (let x = 8; x < 256; x += 46) {
        context.fillRect(x, 7, 22, 3);
      }
      context.strokeStyle = 'rgba(7, 10, 14, 0.55)';
      context.lineWidth = 3;
      for (let x = 0; x < 256; x += 64) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + 38, 36);
        context.stroke();
      }
      platform.refresh();
    }
  }

  private createBackground(): void {
    this.scene.add.rectangle(0, 0, RUN_GUN_WORLD_WIDTH, GAME_HEIGHT, 0x071019).setOrigin(0).setDepth(-40);
    this.scene.add.tileSprite(0, 0, RUN_GUN_WORLD_WIDTH, 260, RUN_GUN_FAR_TEXTURE_KEY).setOrigin(0, 0).setDepth(-35);
    this.scene.add.tileSprite(0, 78, RUN_GUN_WORLD_WIDTH, 340, RUN_GUN_MID_TEXTURE_KEY).setOrigin(0, 0).setDepth(-26);

    for (let x = 0; x < RUN_GUN_WORLD_WIDTH; x += 420) {
      this.scene.add.rectangle(x + 124, 88, 18, 340, 0x102130, 0.92).setOrigin(0.5, 0).setDepth(-18);
      this.scene.add.rectangle(x + 132, 90, 4, 334, 0x49dcff, 0.32).setOrigin(0.5, 0).setDepth(-17);
      this.scene.add.rectangle(x + 300, 246, 230, 16, 0x293541, 0.86).setOrigin(0.5, 0).setDepth(-16);
      this.scene.add.rectangle(x + 300, 252, 228, 3, 0xffd166, 0.45).setOrigin(0.5, 0).setDepth(-15);
    }

    for (let x = 80; x < RUN_GUN_WORLD_WIDTH; x += 520) {
      this.scene.add.rectangle(x, 428, 260, 18, 0x111923, 0.86).setOrigin(0.5, 0).setDepth(-8);
      this.scene.add.rectangle(x, 432, 260, 3, 0x38d9ff, 0.45).setOrigin(0.5, 0).setDepth(-7);
    }

    this.scene.add.rectangle(RUN_GUN_GOAL_X, 286, 18, 350, 0xffd166, 0.82).setOrigin(0.5, 0).setDepth(-4);
    this.scene.add.rectangle(RUN_GUN_GOAL_X, 286, 72, 34, 0x101923, 0.95).setDepth(-3).setStrokeStyle(2, 0xffd166, 0.9);
    this.scene.add.text(RUN_GUN_GOAL_X, 286, 'EXIT', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '16px',
      color: '#fff4a3',
      stroke: '#05080c',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(-2);
  }

  private createPlatforms(): Phaser.Physics.Arcade.StaticGroup {
    const platforms = this.scene.physics.add.staticGroup();
    this.addPlatform(platforms, 0, 492, RUN_GUN_WORLD_WIDTH, 96, 0x252b34);
    this.addPlatform(platforms, 430, 392, 280, 28, 0x34414d);
    this.addPlatform(platforms, 820, 318, 250, 28, 0x34414d);
    this.addPlatform(platforms, 1190, 430, 320, 28, 0x34414d);
    this.addPlatform(platforms, 1620, 350, 260, 28, 0x34414d);
    this.addPlatform(platforms, 2010, 276, 230, 28, 0x34414d);
    this.addPlatform(platforms, 2370, 420, 360, 28, 0x34414d);
    this.addPlatform(platforms, 2890, 338, 300, 28, 0x34414d);
    this.addPlatform(platforms, 3260, 455, 310, 28, 0x34414d);
    return platforms;
  }

  private addPlatform(
    platforms: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
  ): void {
    const textureKey = height > 60 ? RUN_GUN_FLOOR_TEXTURE_KEY : RUN_GUN_PLATFORM_TEXTURE_KEY;
    const platform = this.scene.add.tileSprite(x + width / 2, y + height / 2, width, height, textureKey);
    platform.setTint(color);
    platforms.add(platform);
    (platform.body as Phaser.Physics.Arcade.StaticBody | undefined)?.updateFromGameObject();

    this.scene.add.rectangle(x + width / 2, y + 3, width, 3, height > 60 ? 0xffd166 : 0x8ecae6, 0.42)
      .setDepth(25)
      .setOrigin(0.5, 0.5);
    this.scene.add.rectangle(x + width / 2, y + height - 3, width, 4, 0x05080c, 0.34)
      .setDepth(24)
      .setOrigin(0.5, 0.5);
  }

  private createCheckpoints(): void {
    RUN_GUN_CHECKPOINTS.forEach((x, index) => {
      this.scene.add.rectangle(x, 384, 8, 108, 0x8ecae6, 0.56).setDepth(32);
      this.scene.add.rectangle(x, 338, 76, 28, 0x101923, 0.9)
        .setDepth(33)
        .setStrokeStyle(2, 0x8ecae6, 0.72);
      this.scene.add.text(x, 338, `CP ${index + 1}`, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '13px',
        color: '#f8fbff',
        stroke: '#07090d',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(34);
    });
  }
}

