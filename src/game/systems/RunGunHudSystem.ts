import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SFX_UI_SELECT_KEY } from '../utils/constants';
import { RUN_GUN_GOAL_X } from './RunGunLevelBuilder';
import { playSfx } from './SoundSystem';

interface RunGunHudState {
  playerX: number;
  enemyCount: number;
  lives: number;
  checkpointNumber: number;
  stageCleared: boolean;
  isPaused: boolean;
}

export class RunGunHudSystem {
  private statusText?: Phaser.GameObjects.Text;
  private progressFill?: Phaser.GameObjects.Rectangle;
  private livesText?: Phaser.GameObjects.Text;
  private objectiveText?: Phaser.GameObjects.Text;
  private clearText?: Phaser.GameObjects.Text;
  private readyText?: Phaser.GameObjects.Text;
  private checkpointText?: Phaser.GameObjects.Text;
  private pauseOverlay?: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onResume: () => void,
    private readonly onTitle: () => void,
  ) {}

  create(): void {
    this.scene.add.rectangle(16, 14, 418, 74, 0x071019, 0.78)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(4998)
      .setStrokeStyle(2, 0x8ecae6, 0.42);
    this.scene.add.rectangle(176, 62, 226, 8, 0x07090d, 0.9)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(5000)
      .setStrokeStyle(1, 0x8ecae6, 0.42);
    this.progressFill = this.scene.add.rectangle(178, 64, 222, 4, 0xffd166, 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(5001);

    this.statusText = this.scene.add.text(32, 24, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '14px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 4,
    }).setScrollFactor(0).setDepth(5000);

    this.livesText = this.scene.add.text(32, 52, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '13px',
      color: '#ffd166',
      stroke: '#07090d',
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(5000);

    this.objectiveText = this.scene.add.text(GAME_WIDTH / 2, 502, 'REACH THE EXIT', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '13px',
      color: '#d7e1ee',
      stroke: '#07090d',
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5000);

    this.clearText = this.scene.add.text(GAME_WIDTH / 2, 190, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '34px',
      color: '#fff4a3',
      align: 'center',
      stroke: '#080b10',
      strokeThickness: 7,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5200).setVisible(false);

    this.checkpointText = this.scene.add.text(GAME_WIDTH / 2, 104, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '20px',
      color: '#8ecae6',
      align: 'center',
      stroke: '#07090d',
      strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5100).setAlpha(0);

    this.readyText = this.scene.add.text(GAME_WIDTH / 2, 164, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '42px',
      color: '#ffd166',
      align: 'center',
      stroke: '#07090d',
      strokeThickness: 7,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5300).setAlpha(0);

    this.createPauseOverlay();
  }

  showReadyPrompt(holdMs: number): void {
    this.readyText?.setText('LEVEL 2\nRUN-GUN').setAlpha(0).setScale(0.94);
    this.scene.tweens.add({
      targets: this.readyText,
      alpha: 1,
      scale: 1,
      duration: 180,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: holdMs,
    });
  }

  setPauseVisible(visible: boolean): void {
    this.pauseOverlay?.setVisible(visible);
  }

  showCheckpoint(checkpointNumber: number): void {
    this.checkpointText?.setText(`CHECKPOINT ${checkpointNumber}`).setAlpha(1).setY(104);
    this.scene.tweens.add({
      targets: this.checkpointText,
      alpha: 0,
      y: 84,
      duration: 1100,
      ease: 'Sine.easeOut',
    });
  }

  showClear(text: string): void {
    this.clearText?.setText(text).setVisible(true).setAlpha(0);
    this.scene.tweens.add({
      targets: this.clearText,
      alpha: 1,
      y: 178,
      duration: 360,
      ease: 'Back.easeOut',
    });
  }

  update(state: RunGunHudState): void {
    const metersToExit = Math.max(0, Math.ceil((RUN_GUN_GOAL_X - state.playerX) / 100));
    const progress = Phaser.Math.Clamp(state.playerX / RUN_GUN_GOAL_X, 0, 1);
    this.progressFill?.setScale(progress, 1);
    this.statusText?.setText(
      state.stageCleared ? 'STAGE CLEAR' : `EXIT ${metersToExit}   ENEMIES ${state.enemyCount}`,
    );
    this.livesText?.setText(`LIVES ${state.lives}   CHECKPOINT ${state.checkpointNumber}`);
    this.objectiveText?.setText(state.stageCleared ? 'AREA SECURED' : state.isPaused ? 'PAUSED' : 'REACH THE EXIT');
  }

  private createPauseOverlay(): void {
    const shade = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x07090d, 0.76)
      .setScrollFactor(0);
    const panel = this.scene.add.rectangle(GAME_WIDTH / 2, 270, 470, 286, 0x101823, 0.96)
      .setScrollFactor(0)
      .setStrokeStyle(3, 0x8ecae6, 0.72);
    const title = this.scene.add.text(GAME_WIDTH / 2, 174, 'PAUSED', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '38px',
      color: '#ffd166',
      stroke: '#07090d',
      strokeThickness: 7,
    }).setOrigin(0.5).setScrollFactor(0);
    const subtitle = this.scene.add.text(GAME_WIDTH / 2, 224, 'RUN-GUN GAUNTLET', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '13px',
      color: '#8ecae6',
      stroke: '#07090d',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0);
    const resume = this.createPauseButton(GAME_WIDTH / 2, 300, 'RESUME', 0x06d6a0, this.onResume);
    const quit = this.createPauseButton(GAME_WIDTH / 2, 366, 'TITLE', 0xffd166, this.onTitle);

    this.pauseOverlay = this.scene.add.container(0, 0, [shade, panel, title, subtitle, resume, quit])
      .setDepth(21000)
      .setVisible(false);
  }

  private createPauseButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onPress: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);
    const shell = this.scene.add.rectangle(0, 0, 206, 48, 0x101923, 0.94)
      .setStrokeStyle(2, color, 0.82);
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '18px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 4,
    }).setOrigin(0.5);

    button.add([shell, text]);
    button.setSize(206, 48);
    button.setScrollFactor(0);
    button.setInteractive(new Phaser.Geom.Rectangle(-103, -24, 206, 48), Phaser.Geom.Rectangle.Contains);
    button.on('pointerdown', () => {
      playSfx(this.scene, SFX_UI_SELECT_KEY, { volume: 0.32 });
      onPress();
    });
    return button;
  }
}

