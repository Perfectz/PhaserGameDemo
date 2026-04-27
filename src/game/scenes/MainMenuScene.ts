import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  SFX_UI_SELECT_KEY,
  TITLE_SCREEN_IMAGE_KEY,
  TITLE_SCREEN_MUSIC_KEY,
} from '../utils/constants';
import { GamepadControls } from '../systems/GamepadControls';
import { getBestTimeLabel } from '../systems/DemoProgressSystem';
import { readStorageValue, writeStorageValue } from '../systems/StorageSystem';
import {
  applySoundPreference,
  isSoundMuted,
  playLoopingMusic,
  playSfx,
  setSoundMuted,
  stopMusic,
} from '../systems/SoundSystem';

const introVideoUrl = new URL('../../assets/video/intro.mp4', import.meta.url).href;
const INTRO_VIDEO_PLAYED_STORAGE_KEY = 'neonBrawlerIntroVideoPlayed';

type MenuMode = 'brawler' | 'shooter';

interface MenuOption {
  mode: MenuMode;
  container: Phaser.GameObjects.Container;
  panel: Phaser.GameObjects.Rectangle;
  accent: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
  subtitle: Phaser.GameObjects.Text;
  color: number;
}

export class MainMenuScene extends Phaser.Scene {
  private gamepadControls?: GamepadControls;
  private menuOptions: MenuOption[] = [];
  private selectedIndex = 0;
  private nextGamepadNavAt = 0;
  private soundTogglePanel?: Phaser.GameObjects.Rectangle;
  private soundToggleTrack?: Phaser.GameObjects.Rectangle;
  private soundToggleKnob?: Phaser.GameObjects.Rectangle;
  private soundToggleText?: Phaser.GameObjects.Text;
  private introComplete = false;
  private isStarting = false;

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.menuOptions = [];
    this.selectedIndex = 0;
    this.nextGamepadNavAt = 0;
    this.introComplete = false;
    this.isStarting = false;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07090d, 1).setOrigin(0);
    applySoundPreference(this);
    this.startTitleMusic();
    this.input.once('pointerdown', () => this.startTitleMusic());
    this.input.keyboard?.once('keydown', () => this.startTitleMusic());

    if (!this.hasSeenIntroVideo()) {
      this.playIntroSequence();
      return;
    }

    this.createTitleMenu();
    this.startRequestedModeFromUrl();
  }

  update(): void {
    if (this.menuOptions.length === 0) {
      return;
    }

    const gamepadInput = this.gamepadControls?.getInput();
    if (!gamepadInput) {
      return;
    }

    if (gamepadInput.movement.y < -0.45 && this.time.now >= this.nextGamepadNavAt) {
      this.moveSelection(-1);
      this.nextGamepadNavAt = this.time.now + 180;
    } else if (gamepadInput.movement.y > 0.45 && this.time.now >= this.nextGamepadNavAt) {
      this.moveSelection(1);
      this.nextGamepadNavAt = this.time.now + 180;
    }

    if (gamepadInput?.alternate) {
      this.selectMode('shooter');
    } else if (gamepadInput?.confirm) {
      this.confirmSelection();
    }
  }

  private createTitleMenu(): void {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TITLE_SCREEN_IMAGE_KEY)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07090d, 0.34).setOrigin(0);
    this.add.rectangle(0, 0, 520, GAME_HEIGHT, 0x07090d, 0.36).setOrigin(0);
    this.createTitleAtmosphere();

    const title = this.add.text(70, 112, 'NEON BRAWLER', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '58px',
      color: '#f1f6ff',
      stroke: '#07090d',
      strokeThickness: 8,
    }).setOrigin(0, 0.5);
    const titleAccent = this.add.rectangle(76, 150, 344, 4, 0x8ecae6, 0.82).setOrigin(0, 0.5);
    this.tweens.add({
      targets: [title, titleAccent],
      alpha: 0.84,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.add.text(74, 170, 'PLAYABLE WEB DEMO', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '18px',
      color: '#ffd166',
      letterSpacing: 1,
    }).setOrigin(0, 0.5);
    this.add.text(74, 214, 'Fight through neon streets, then jump into a side-scrolling run-and-gun gauntlet.', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#d7e1ee',
      wordWrap: { width: 370 },
      lineSpacing: 8,
    });

    this.add.text(76, 286, 'CHOOSE LEVEL', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '13px',
      color: '#8ecae6',
      letterSpacing: 1,
    }).setOrigin(0, 0.5);

    this.menuOptions = [
      this.createMenuOption(76, 338, 'BRAWLER', `Level 1 - Neon street fight  ${getBestTimeLabel('brawler')}`, 'brawler', 0x8ecae6),
      this.createMenuOption(76, 414, 'SHOOTER', `Level 2 - Run-gun gauntlet  ${getBestTimeLabel('shooter')}`, 'shooter', 0xffd166),
    ];
    this.selectOption(0, false);

    this.add.text(76, 472, 'UP/DOWN or W/S selects   ENTER/SPACE/click confirms', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#d7e1ee',
    });
    this.add.text(76, 496, 'Gamepad: D-pad/stick selects   A confirms   Y opens shooter', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#ffd166',
    });
    this.createSoundToggle();

    this.gamepadControls = new GamepadControls(this);
    this.bindKeyboardNavigation();
  }

  private createTitleAtmosphere(): void {
    for (let index = 0; index < 9; index += 1) {
      const y = 72 + index * 45;
      const rail = this.add.rectangle(28, y, 70 + (index % 3) * 28, 2, index % 2 === 0 ? 0x8ecae6 : 0xffd166, 0.16)
        .setOrigin(0, 0.5);
      this.tweens.add({
        targets: rail,
        x: 36,
        alpha: 0.38,
        duration: 900 + index * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.add.text(74, 72, 'PUBLIC DEMO BUILD', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '11px',
      color: '#8ecae6',
      stroke: '#07090d',
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setAlpha(0.86);
  }

  private playIntroSequence(): void {
    const overlay = document.createElement('div');
    overlay.className = 'intro-video-overlay';

    const introVideo = document.createElement('video');
    introVideo.className = 'intro-video-overlay__video';
    introVideo.src = introVideoUrl;
    introVideo.muted = true;
    introVideo.autoplay = true;
    introVideo.playsInline = true;
    introVideo.preload = 'auto';

    const skipText = document.createElement('div');
    skipText.className = 'intro-video-overlay__skip';
    skipText.textContent = 'PRESS ANY KEY TO SKIP';

    overlay.append(introVideo, skipText);
    (document.getElementById('game') ?? document.body).appendChild(overlay);

    const abortController = new AbortController();
    const finishIntro = () => {
      abortController.abort();
      this.finishIntroSequence(overlay, introVideo);
    };
    const listenerOptions = { once: true, signal: abortController.signal };

    introVideo.addEventListener('ended', finishIntro, listenerOptions);
    introVideo.addEventListener('error', finishIntro, listenerOptions);
    overlay.addEventListener('pointerdown', finishIntro, listenerOptions);
    window.addEventListener('keydown', finishIntro, listenerOptions);

    introVideo.play().catch(() => {
      // Muted autoplay should work, but a tap/key skip still gets players to the title if a browser blocks it.
    });
  }

  private finishIntroSequence(
    overlay: HTMLDivElement,
    introVideo: HTMLVideoElement,
  ): void {
    if (this.introComplete) {
      return;
    }

    this.introComplete = true;
    this.registry.set('introVideoPlayed', true);
    this.persistIntroVideoPlayed();
    introVideo.pause();
    overlay.remove();
    this.createTitleMenu();
    this.cameras.main.fadeIn(220, 7, 9, 13);
  }

  private hasSeenIntroVideo(): boolean {
    if (this.registry.get('introVideoPlayed')) {
      return true;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('skipIntro') === '1' || params.get('demo') === '1') {
      this.persistIntroVideoPlayed();
      return true;
    }

    return readStorageValue(INTRO_VIDEO_PLAYED_STORAGE_KEY) === 'true';
  }

  private persistIntroVideoPlayed(): void {
    writeStorageValue(INTRO_VIDEO_PLAYED_STORAGE_KEY, 'true');
  }

  private startRequestedModeFromUrl(): void {
    const requestedMode = new URLSearchParams(window.location.search).get('mode');
    if (requestedMode !== 'brawler' && requestedMode !== 'shooter') {
      return;
    }

    this.time.delayedCall(260, () => this.transitionToMode(requestedMode));
  }

  private startTitleMusic(): void {
    playLoopingMusic(this, TITLE_SCREEN_MUSIC_KEY, 0.42);
  }

  private stopTitleMusic(): void {
    stopMusic(this, TITLE_SCREEN_MUSIC_KEY);
  }

  private createSoundToggle(): void {
    const container = this.add.container(792, 42).setDepth(100);
    this.soundTogglePanel = this.add.rectangle(0, 0, 164, 42, 0x07090d, 0.72)
      .setStrokeStyle(2, 0x8ecae6, 0.54);
    this.soundToggleTrack = this.add.rectangle(-48, 0, 46, 22, 0x101823, 0.92)
      .setStrokeStyle(1, 0x8ecae6, 0.56);
    this.soundToggleKnob = this.add.rectangle(-58, 0, 16, 16, 0x8ecae6, 0.94);
    this.soundToggleText = this.add.text(2, 0, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '13px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 3,
    }).setOrigin(0, 0.5);

    container.add([this.soundTogglePanel, this.soundToggleTrack, this.soundToggleKnob, this.soundToggleText]);
    container.setSize(164, 42);
    container.setInteractive(new Phaser.Geom.Rectangle(-82, -21, 164, 42), Phaser.Geom.Rectangle.Contains);
    container.on('pointerdown', () => this.toggleSound());
    this.updateSoundToggle();
  }

  private toggleSound(): void {
    const muted = !isSoundMuted();
    setSoundMuted(this, muted);
    if (!muted) {
      this.startTitleMusic();
      playSfx(this, SFX_UI_SELECT_KEY, { volume: 0.24, rate: 1.12 });
    }
    this.updateSoundToggle();
  }

  private updateSoundToggle(): void {
    const muted = isSoundMuted();
    this.soundToggleText?.setText(muted ? 'SOUND OFF' : 'SOUND ON');
    this.soundToggleText?.setColor(muted ? '#b9cce0' : '#f8fbff');
    this.soundTogglePanel?.setStrokeStyle(2, muted ? 0x6d788b : 0x8ecae6, muted ? 0.46 : 0.72);
    this.soundToggleTrack?.setStrokeStyle(1, muted ? 0x6d788b : 0x8ecae6, muted ? 0.46 : 0.72);
    this.soundToggleKnob?.setFillStyle(muted ? 0x6d788b : 0xffd166, muted ? 0.8 : 0.96);
    this.soundToggleKnob?.setPosition(muted ? -58 : -38, 0);
  }

  private createMenuOption(
    x: number,
    y: number,
    titleText: string,
    subtitleText: string,
    mode: MenuMode,
    color: number,
  ): MenuOption {
    const optionWidth = 410;
    const panel = this.add.rectangle(0, 0, optionWidth, 58, 0x07090d, 0.74)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, color, 0.5);
    const accent = this.add.rectangle(14, 0, 5, 34, color, 0.88)
      .setOrigin(0.5);
    const title = this.add.text(34, -12, titleText, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '18px',
      color: '#f8fbff',
      stroke: '#07090d',
      strokeThickness: 3,
    }).setOrigin(0, 0.5);
    const subtitle = this.add.text(34, 14, subtitleText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#b9cce0',
      wordWrap: { width: optionWidth - 82 },
    }).setOrigin(0, 0.5);
    const chevron = this.add.triangle(optionWidth - 28, 0, 0, -9, 0, 9, 14, 0, color, 0.96)
      .setOrigin(0.5);

    const container = this.add.container(x, y, [panel, accent, title, subtitle, chevron]);
    container.setSize(optionWidth, 58);
    container.setInteractive(new Phaser.Geom.Rectangle(0, -29, optionWidth, 58), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => this.selectOptionByMode(mode));
    container.on('pointerdown', () => this.selectMode(mode));

    return { mode, container, panel, accent, title, subtitle, color };
  }

  private bindKeyboardNavigation(): void {
    this.input.keyboard?.on('keydown-UP', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-W', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-S', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.confirmSelection());
    this.input.keyboard?.on('keydown-SPACE', () => this.confirmSelection());
    this.input.keyboard?.on('keydown-G', () => this.selectMode('shooter'));
    this.input.keyboard?.on('keydown-M', () => this.toggleSound());
  }

  private moveSelection(direction: -1 | 1): void {
    const nextIndex = Phaser.Math.Wrap(this.selectedIndex + direction, 0, this.menuOptions.length);
    this.selectOption(nextIndex);
  }

  private selectOptionByMode(mode: MenuMode): void {
    const index = this.menuOptions.findIndex((option) => option.mode === mode);
    if (index >= 0) {
      this.selectOption(index);
    }
  }

  private selectOption(index: number, playSound = true): void {
    if (index === this.selectedIndex && playSound) {
      return;
    }

    this.selectedIndex = index;
    if (playSound) {
      playSfx(this, SFX_UI_SELECT_KEY, { volume: 0.18, rate: 1.18 });
    }

    this.menuOptions.forEach((option, optionIndex) => {
      const selected = optionIndex === this.selectedIndex;
      option.container.setScale(selected ? 1.035 : 1);
      option.container.setAlpha(selected ? 1 : 0.68);
      option.panel.setFillStyle(selected ? 0x101823 : 0x07090d, selected ? 0.86 : 0.68);
      option.panel.setStrokeStyle(selected ? 3 : 2, selected ? 0xf8fbff : option.color, selected ? 0.88 : 0.34);
      option.title.setColor(selected ? '#ffffff' : '#d7e1ee');
      option.subtitle.setColor(selected ? '#ffd166' : '#8fa7bd');
      option.accent.setAlpha(selected ? 1 : 0.45);
    });
  }

  private confirmSelection(): void {
    const selectedMode = this.menuOptions[this.selectedIndex]?.mode ?? 'brawler';
    this.selectMode(selectedMode);
  }

  private selectMode(mode: MenuMode): void {
    if (mode === 'shooter') {
      this.startRunGun();
      return;
    }

    this.startGame();
  }

  private startGame(): void {
    this.transitionToMode('brawler');
  }

  private startRunGun(): void {
    this.transitionToMode('shooter');
  }

  private transitionToMode(mode: MenuMode): void {
    if (this.isStarting) {
      return;
    }

    this.isStarting = true;
    playSfx(this, SFX_UI_SELECT_KEY, { volume: 0.34 });
    this.stopTitleMusic();
    this.cameras.main.fadeOut(180, 7, 9, 13);
    this.time.delayedCall(190, () => {
      if (mode === 'shooter') {
        this.scene.stop('UIScene');
        this.scene.start('RunGunScene');
        return;
      }

      this.scene.start('GameScene');
    });
  }
}
