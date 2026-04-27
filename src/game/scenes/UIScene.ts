import Phaser from 'phaser';
import {
  PLAYER_MAX_HEALTH,
  SFX_UI_PAUSE_KEY,
  SFX_UI_SELECT_KEY,
  UI_MENU_BUTTON_SHELL_KEY,
  UI_MODAL_PANEL_KEY,
} from '../utils/constants';
import { GamepadControls } from '../systems/GamepadControls';
import { playSfx } from '../systems/SoundSystem';

export interface HudState {
  playerHealth: number;
  playerState: string;
  enemyCount: number;
  levelName: string;
  wave: number;
  stageClear: boolean;
  specialReadyPercent: number;
  advancePrompt: boolean;
  bossName?: string;
  bossHealthPercent?: number;
}

export class UIScene extends Phaser.Scene {
  private hudGraphics?: Phaser.GameObjects.Graphics;
  private healthText?: Phaser.GameObjects.Text;
  private stateText?: Phaser.GameObjects.Text;
  private specialText?: Phaser.GameObjects.Text;
  private objectiveText?: Phaser.GameObjects.Text;
  private levelText?: Phaser.GameObjects.Text;
  private enemyText?: Phaser.GameObjects.Text;
  private stageClearText?: Phaser.GameObjects.Text;
  private bossNameText?: Phaser.GameObjects.Text;
  private goPrompt?: Phaser.GameObjects.Container;
  private bossIntroOverlay?: Phaser.GameObjects.Container;
  private stageClearOverlay?: Phaser.GameObjects.Container;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private gameOverOverlay?: Phaser.GameObjects.Container;
  private pauseButton?: Phaser.GameObjects.Container;
  private gamepadControls?: GamepadControls;
  private isGameOver = false;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.hudGraphics = this.add.graphics();
    this.hudGraphics.setDepth(1001);

    this.createHudArt();
    this.createHudText();
    this.createAdvancePrompt();
    this.createBossIntroOverlay();
    this.createStageClearOverlay();
    this.createPauseButton();
    this.createPauseOverlay();
    this.createGameOverOverlay();

    this.events.on('hud:update', (state: HudState) => this.updateHud(state));
    this.events.on('pause:changed', (paused: boolean) => this.pauseOverlay?.setVisible(paused));
    this.events.on('game-over:changed', (visible: boolean) => this.setGameOverVisible(visible));
    this.events.on('boss:intro', (name: string) => this.showBossIntro(name));
    this.events.on('stage:cleared', () => this.showStageClearOverlay());
    this.input.keyboard?.on('keydown-P', () => this.toggleGamePause());
    this.input.keyboard?.on('keydown-ESC', () => this.toggleGamePause());
    this.input.keyboard?.on('keydown-R', () => {
      if (this.isGameOver) {
        this.requestRestart();
      }
    });
    this.gamepadControls = new GamepadControls(this);

    this.updateHud({
      playerHealth: PLAYER_MAX_HEALTH,
      playerState: 'idle',
      enemyCount: 0,
      levelName: 'Training Street',
      wave: 1,
      stageClear: false,
      specialReadyPercent: 1,
      advancePrompt: false,
    });
  }

  private createHudText(): void {
    this.healthText = this.add.text(106, 24, '100 / 100', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '17px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 3,
    }).setDepth(1002);

    this.stateText = this.add.text(106, 51, 'READY', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '10px',
      color: '#9fd3ff',
      letterSpacing: 1,
    }).setDepth(1002);

    this.specialText = this.add.text(302, 55, 'SPECIAL READY', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '9px',
      color: '#8ecae6',
      align: 'right',
      letterSpacing: 1,
    }).setOrigin(1, 0).setDepth(1002);

    this.objectiveText = this.add.text(480, 31, 'CLEAR WAVE 1', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '12px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5, 0).setDepth(1002);

    this.levelText = this.add.text(816, 25, 'TRAINING STREET', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '12px',
      color: '#f8fbff',
      align: 'right',
    }).setOrigin(1, 0).setDepth(1002);

    this.enemyText = this.add.text(816, 46, 'WAVE 1  /  ENEMIES 0', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '11px',
      color: '#ffd166',
      align: 'right',
    }).setOrigin(1, 0).setDepth(1002);

    this.stageClearText = this.add.text(480, 176, 'STAGE CLEAR', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '54px',
      color: '#ffd166',
      stroke: '#07090d',
      strokeThickness: 8,
    }).setOrigin(0.5).setVisible(false).setDepth(1500);

    this.bossNameText = this.add.text(480, 100, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '14px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 3,
    }).setOrigin(0.5).setVisible(false).setDepth(1002);
  }

  private updateHud(state: HudState): void {
    this.drawHud(state);

    this.healthText?.setText(`${state.playerHealth} / ${PLAYER_MAX_HEALTH}`);
    this.stateText?.setText(state.playerState.toUpperCase());
    this.specialText?.setText(state.specialReadyPercent >= 1
      ? 'SPECIAL READY'
      : `SPECIAL ${Math.round(Phaser.Math.Clamp(state.specialReadyPercent, 0, 1) * 100)}%`);
    this.specialText?.setColor(state.specialReadyPercent >= 1 ? '#ffd166' : '#8ecae6');
    this.objectiveText?.setText(this.getObjectiveLabel(state));
    this.levelText?.setText(state.levelName.toUpperCase());
    this.enemyText?.setText(`WAVE ${state.wave}  /  ENEMIES ${state.enemyCount}`);
    this.stageClearText?.setVisible(state.stageClear);
    this.goPrompt?.setVisible(state.advancePrompt && !this.isGameOver);
    this.bossNameText?.setVisible(Boolean(state.bossName && state.bossHealthPercent !== undefined));
    this.bossNameText?.setText(state.bossName?.toUpperCase() ?? '');
  }

  private drawHud(state: HudState): void {
    const graphics = this.hudGraphics;
    if (!graphics) {
      return;
    }

    graphics.clear();
    this.drawPlayerPlate(graphics, state.playerHealth / PLAYER_MAX_HEALTH, state.specialReadyPercent);
    this.drawObjectivePlate(graphics, state);
    this.drawWavePlate(graphics, state.stageClear);
    if (state.bossName && state.bossHealthPercent !== undefined) {
      this.drawBossPlate(graphics, state.bossHealthPercent);
    }
  }

  private drawPlayerPlate(graphics: Phaser.GameObjects.Graphics, healthPercent: number, specialReadyPercent: number): void {
    const clampedHealth = Phaser.Math.Clamp(healthPercent, 0, 1);
    const clampedSpecial = Phaser.Math.Clamp(specialReadyPercent, 0, 1);
    const x = 24;
    const y = 18;
    const width = 346;
    const height = 66;

    graphics.fillStyle(0x071019, 0.74);
    graphics.fillRoundedRect(x + 4, y + 4, width, height, 9);
    graphics.fillStyle(0x101823, 0.9);
    graphics.fillRoundedRect(x, y, width, height, 9);
    graphics.lineStyle(2, 0x46f2ff, 0.46);
    graphics.strokeRoundedRect(x, y, width, height, 9);
    graphics.lineStyle(2, 0xffd166, 0.82);
    graphics.lineBetween(x + 14, y + height - 8, x + 84, y + height - 8);
    graphics.lineStyle(2, 0x06d6a0, 0.58);
    graphics.lineBetween(x + 96, y + height - 8, x + 170, y + height - 8);

    graphics.fillStyle(0x111722, 0.92);
    graphics.fillRoundedRect(42, 28, 48, 44, 6);
    graphics.lineStyle(2, 0xffd166, 0.9);
    graphics.strokeRoundedRect(42, 28, 48, 44, 6);
    graphics.fillStyle(0x47a3ff, 1);
    graphics.fillRect(55, 39, 24, 22);
    graphics.fillStyle(0xf8fbff, 0.9);
    graphics.fillRect(74, 43, 6, 10);

    graphics.fillStyle(0x07090d, 0.78);
    graphics.fillRoundedRect(106, 68, 190, 6, 4);
    graphics.fillStyle(clampedSpecial >= 1 ? 0x8ecae6 : 0x3c5268, 0.9);
    graphics.fillRoundedRect(106, 68, 190 * clampedSpecial, 6, 4);
    graphics.lineStyle(1, 0x8ecae6, 0.42);
    graphics.strokeRoundedRect(106, 68, 190, 6, 4);

    graphics.fillStyle(0x080c12, 0.85);
    graphics.fillRoundedRect(220, 34, 124, 14, 4);
    graphics.fillStyle(this.getHealthColor(clampedHealth), 1);
    graphics.fillRoundedRect(220, 34, 124 * clampedHealth, 14, 4);
    graphics.lineStyle(1, 0xffffff, 0.25);
    graphics.strokeRoundedRect(220, 34, 124, 14, 4);

    for (let markerX = 244; markerX < 336; markerX += 24) {
      graphics.lineStyle(1, 0x07090d, 0.42);
      graphics.lineBetween(markerX, 34, markerX - 4, 48);
    }
  }

  private drawWavePlate(graphics: Phaser.GameObjects.Graphics, stageClear: boolean): void {
    const x = 650;
    const y = 18;
    const width = 190;
    const height = 58;
    const accent = stageClear ? 0x06d6a0 : 0xef476f;

    graphics.fillStyle(0x071019, 0.7);
    graphics.fillRoundedRect(x + 4, y + 4, width, height, 8);
    graphics.fillStyle(0x101823, 0.88);
    graphics.fillRoundedRect(x, y, width, height, 8);
    graphics.lineStyle(2, accent, 0.62);
    graphics.strokeRoundedRect(x, y, width, height, 8);
    graphics.fillStyle(accent, 0.9);
    graphics.fillCircle(x + 18, y + 18, 4);
    graphics.lineStyle(2, 0xffd166, 0.62);
    graphics.lineBetween(x + 18, y + height - 8, x + 72, y + height - 8);
  }

  private drawObjectivePlate(graphics: Phaser.GameObjects.Graphics, state: HudState): void {
    const x = 384;
    const y = 18;
    const width = 212;
    const height = 38;
    const accent = state.stageClear ? 0x06d6a0 : state.advancePrompt ? 0xffd166 : 0x8ecae6;

    graphics.fillStyle(0x071019, 0.66);
    graphics.fillRoundedRect(x + 3, y + 4, width, height, 9);
    graphics.fillStyle(0x101823, 0.82);
    graphics.fillRoundedRect(x, y, width, height, 9);
    graphics.lineStyle(2, accent, 0.58);
    graphics.strokeRoundedRect(x, y, width, height, 9);
    graphics.fillStyle(accent, 0.9);
    graphics.fillRect(x + 14, y + height - 8, width - 28, 2);
  }

  private getObjectiveLabel(state: HudState): string {
    if (state.stageClear) {
      return 'STAGE CLEAR';
    }

    if (state.advancePrompt) {
      return 'MOVE RIGHT';
    }

    if (state.bossName) {
      return `DEFEAT ${state.bossName.toUpperCase()}`;
    }

    return `CLEAR WAVE ${state.wave}`;
  }

  private createHudArt(): void {
    // Dynamic HUD chrome is drawn in drawHud so health, wave, and boss states stay visually unified.
  }

  private drawBossPlate(graphics: Phaser.GameObjects.Graphics, healthPercent: number): void {
    const clampedHealth = Phaser.Math.Clamp(healthPercent, 0, 1);
    const x = 326;
    const y = 124;
    const width = 308;
    const height = 14;

    graphics.fillStyle(0x07090d, 0.78);
    graphics.fillRoundedRect(x - 12, y - 24, width + 24, 42, 7);
    graphics.lineStyle(2, 0x34e8ff, 0.9);
    graphics.strokeRoundedRect(x - 12, y - 24, width + 24, 42, 7);
    graphics.fillStyle(0x1a202b, 1);
    graphics.fillRoundedRect(x, y, width, height, 5);
    graphics.fillStyle(clampedHealth < 0.3 ? 0xef476f : 0x34e8ff, 1);
    graphics.fillRoundedRect(x, y, width * clampedHealth, height, 5);
    graphics.lineStyle(1, 0xf8fbff, 0.28);
    graphics.strokeRoundedRect(x, y, width, height, 5);
  }

  private createAdvancePrompt(): void {
    const glow = this.add.rectangle(0, 0, 104, 42, 0x06d6a0, 0.14)
      .setStrokeStyle(2, 0x8ecae6, 0.78);
    const label = this.add.text(-12, 0, 'GO', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '23px',
      color: '#ffd166',
      stroke: '#07090d',
      strokeThickness: 5,
    }).setOrigin(0.5);
    const arrow = this.add.triangle(34, 0, 0, -15, 0, 15, 26, 0, 0xf8fbff, 1)
      .setStrokeStyle(2, 0x07090d, 0.9);

    this.goPrompt = this.add.container(870, 250, [glow, label, arrow]);
    this.goPrompt.setDepth(1600);
    this.goPrompt.setVisible(false);
    this.tweens.add({
      targets: this.goPrompt,
      x: 874,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createBossIntroOverlay(): void {
    const shade = this.add.rectangle(480, 270, 960, 540, 0x07090d, 0.36);
    const rail = this.add.rectangle(480, 260, 960, 86, 0x101723, 0.92)
      .setStrokeStyle(3, 0x34e8ff, 0.86);
    const label = this.add.text(480, 242, 'BOSS APPROACHING', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '18px',
      color: '#ffd166',
      stroke: '#07090d',
      strokeThickness: 4,
    }).setOrigin(0.5);
    const name = this.add.text(480, 278, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '42px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 6,
    }).setOrigin(0.5).setName('bossIntroName');

    this.bossIntroOverlay = this.add.container(0, 0, [shade, rail, label, name]);
    this.bossIntroOverlay.setDepth(18000);
    this.bossIntroOverlay.setVisible(false);
  }

  private createStageClearOverlay(): void {
    const shade = this.add.rectangle(480, 270, 960, 540, 0x07090d, 0.42);
    const panel = this.createPanel(480, 286, 594, 226, 0x8ecae6);
    const title = this.add.text(480, 238, 'STAGE CLEAR', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '50px',
      color: '#ffd166',
      stroke: '#07090d',
      strokeThickness: 7,
    }).setOrigin(0.5);
    const subtitle = this.add.text(480, 304, 'AREA SECURED', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '18px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.stageClearOverlay = this.add.container(0, 0, [shade, panel, title, subtitle]);
    this.stageClearOverlay.setDepth(17500);
    this.stageClearOverlay.setVisible(false);
  }

  private createPauseButton(): void {
    const button = this.add.container(914, 45);
    const back = this.add.graphics();
    back.fillStyle(0x101823, 0.9);
    back.fillRoundedRect(-24, -22, 48, 44, 8);
    back.lineStyle(2, 0x8ecae6, 0.72);
    back.strokeRoundedRect(-24, -22, 48, 44, 8);
    back.fillStyle(0xf8fbff, 0.92);
    back.fillRoundedRect(-8, -10, 5, 20, 2);
    back.fillRoundedRect(4, -10, 5, 20, 2);
    button.add(back);
    button.setSize(48, 44);
    button.setDepth(1003);
    button.setInteractive(new Phaser.Geom.Rectangle(-24, -22, 48, 44), Phaser.Geom.Rectangle.Contains);
    button.on('pointerdown', () => {
      playSfx(this, SFX_UI_SELECT_KEY, { volume: 0.32 });
      this.toggleGamePause();
    });
    this.pauseButton = button;
  }

  private createPauseOverlay(): void {
    const shade = this.add.rectangle(480, 270, 960, 540, 0x07090d, 0.72);
    const panel = this.createPanel(480, 272, 548, 346, 0x8ecae6);
    const title = this.add.text(480, 130, 'PAUSED', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '38px',
      color: '#ffd166',
      stroke: '#07090d',
      strokeThickness: 6,
    }).setOrigin(0.5);
    const subtitle = this.add.text(480, 166, 'STREET COMMANDS', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '13px',
      color: '#8ecae6',
    }).setOrigin(0.5);
    const leftCommands = this.add.text(288, 202, [
      'MOVE     WASD / ARROWS',
      'RUN      SHIFT',
      'PUNCH    J',
      'KICK     K',
      'JUMP     SPACE / L',
    ], {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#dce9f4',
      lineSpacing: 9,
    });
    const rightCommands = this.add.text(512, 202, [
      'EVADE    E',
      'SPECIAL  I',
      'SHOT     O',
      'PAUSE    P / ESC',
      'PAD      STICK + FACE',
    ], {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#dce9f4',
      lineSpacing: 9,
    });
    const resume = this.createMenuButton(365, 430, 'RESUME', 0x06d6a0, () => this.setGamePause(false));
    const titleButton = this.createMenuButton(595, 430, 'TITLE', 0xffd166, () => this.requestTitle(), '#151923');

    this.pauseOverlay = this.add.container(0, 0, [
      shade,
      panel,
      title,
      subtitle,
      leftCommands,
      rightCommands,
      resume,
      titleButton,
    ]);
    this.pauseOverlay.setDepth(20000);
    this.pauseOverlay.setVisible(false);
  }

  private createGameOverOverlay(): void {
    const shade = this.add.rectangle(480, 270, 960, 540, 0x07090d, 0.82);
    const panel = this.createPanel(480, 282, 548, 286, 0xef476f);
    const title = this.add.text(480, 185, 'GAME OVER', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '52px',
      color: '#ef476f',
      stroke: '#07090d',
      strokeThickness: 7,
    }).setOrigin(0.5);
    const hint = this.add.text(480, 250, 'PRESS R OR TAP RESTART', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '17px',
      color: '#f8fbff',
    }).setOrigin(0.5);
    const restart = this.createMenuButton(480, 344, 'RESTART', 0xffd166, () => this.requestRestart(), '#151923');

    this.gameOverOverlay = this.add.container(0, 0, [shade, panel, title, hint, restart]);
    this.gameOverOverlay.setDepth(21000);
    this.gameOverOverlay.setVisible(false);
  }

  private createPanel(x: number, y: number, width: number, height: number, accent: number): Phaser.GameObjects.Container {
    const image = this.add.image(0, 0, UI_MODAL_PANEL_KEY)
      .setDisplaySize(width, height)
      .setTint(accent === 0xef476f ? 0xffd4df : 0xffffff);
    return this.add.container(x, y, [image]);
  }

  private createMenuButton(
    x: number,
    y: number,
    labelText: string,
    color: number,
    onPress: () => void,
    textColor = '#ffffff',
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    const shell = this.add.image(0, 0, UI_MENU_BUTTON_SHELL_KEY)
      .setDisplaySize(220, 58)
      .setTint(color);
    const label = this.add.text(0, 0, labelText, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '20px',
      color: textColor,
    }).setOrigin(0.5);
    button.add([shell, label]);
    button.setSize(220, 52);
    button.setInteractive(new Phaser.Geom.Rectangle(-110, -26, 220, 52), Phaser.Geom.Rectangle.Contains);
    button.on('pointerdown', () => {
      playSfx(this, SFX_UI_SELECT_KEY, { volume: 0.32 });
      onPress();
    });
    return button;
  }

  private getHealthColor(healthPercent: number): number {
    if (healthPercent < 0.28) {
      return 0xef476f;
    }
    if (healthPercent < 0.55) {
      return 0xffd166;
    }
    return 0x06d6a0;
  }

  update(): void {
    const gamepadInput = this.gamepadControls?.getInput();
    if (gamepadInput?.pause) {
      this.toggleGamePause();
    }
    if (this.isGameOver && (gamepadInput?.restart || gamepadInput?.confirm)) {
      this.requestRestart();
    }
  }

  private toggleGamePause(): void {
    if (this.isGameOver) {
      return;
    }

    this.setGamePause(!this.pauseOverlay?.visible);
  }

  private setGamePause(paused: boolean): void {
    playSfx(this, SFX_UI_PAUSE_KEY, { volume: 0.3, rate: paused ? 1 : 1.12 });
    this.pauseOverlay?.setVisible(paused);
    this.scene.get('GameScene').events.emit('pause:set', paused);
  }

  private setGameOverVisible(visible: boolean): void {
    this.isGameOver = visible;
    this.pauseButton?.setAlpha(visible ? 0.35 : 1);
    this.pauseOverlay?.setVisible(false);
    this.goPrompt?.setVisible(false);
    this.gameOverOverlay?.setVisible(visible);
  }

  private showBossIntro(name: string): void {
    if (!this.bossIntroOverlay) {
      return;
    }

    const nameText = this.bossIntroOverlay.getByName('bossIntroName') as Phaser.GameObjects.Text | null;
    nameText?.setText(name);
    this.bossIntroOverlay.setVisible(true);
    this.bossIntroOverlay.setAlpha(0);
    this.tweens.add({
      targets: this.bossIntroOverlay,
      alpha: 1,
      duration: 160,
      yoyo: true,
      hold: 980,
      onComplete: () => this.bossIntroOverlay?.setVisible(false),
    });
  }

  private showStageClearOverlay(): void {
    this.stageClearOverlay?.setVisible(true);
    this.stageClearOverlay?.setAlpha(0);
    this.tweens.add({
      targets: this.stageClearOverlay,
      alpha: 1,
      duration: 260,
      ease: 'Sine.easeOut',
    });
  }

  private requestRestart(): void {
    this.setGameOverVisible(false);
    this.setGamePause(false);
    this.scene.get('GameScene').events.emit('restart:requested');
  }

  private requestTitle(): void {
    this.pauseOverlay?.setVisible(false);
    this.scene.get('GameScene').events.emit('pause:set', false);
    this.scene.get('GameScene').events.emit('title:requested');
  }
}
