import Phaser from 'phaser';
import { commonAssets } from '../data/assets';
import { loadAssets } from '../systems/AssetLoaderSystem';

export class PreloadScene extends Phaser.Scene {
  private progressFill?: Phaser.GameObjects.Rectangle;
  private progressText?: Phaser.GameObjects.Text;
  private failedAssetCount = 0;

  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.createLoadingDisplay();
    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => this.updateLoadingDisplay(progress));
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => this.handleLoadError());
    loadAssets(this, commonAssets);
  }

  create(): void {
    this.load.off(Phaser.Loader.Events.PROGRESS);
    this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR);
    this.scene.start('MainMenuScene');
  }

  private createLoadingDisplay(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x07090d, 1).setOrigin(0);
    this.add.text(centerX, centerY - 58, 'NEON BRAWLER', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '32px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.rectangle(centerX, centerY, 420, 18, 0x101823, 1)
      .setStrokeStyle(2, 0x8ecae6, 0.72);
    this.progressFill = this.add.rectangle(centerX - 206, centerY, 412, 10, 0xffd166, 1)
      .setOrigin(0, 0.5)
      .setScale(0, 1);
    this.progressText = this.add.text(centerX, centerY + 36, 'LOADING 0%', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '14px',
      color: '#9fd3ff',
    }).setOrigin(0.5);
  }

  private updateLoadingDisplay(progress: number): void {
    this.progressFill?.setScale(Phaser.Math.Clamp(progress, 0, 1), 1);
    this.progressText?.setText(`LOADING ${Math.round(progress * 100)}%`);
  }

  private handleLoadError(): void {
    this.failedAssetCount += 1;
    this.progressText?.setText(`LOADING... ${this.failedAssetCount} ASSET RETRY NEEDED`);
    this.progressText?.setColor('#ffd166');
  }
}

