import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { PreloadScene } from './scenes/PreloadScene';
import { RunGunScene } from './scenes/RunGunScene';
import { UIScene } from './scenes/UIScene';
import { GAME_HEIGHT, GAME_WIDTH } from './utils/constants';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#111318',
  pixelArt: false,
  input: {
    gamepad: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, MainMenuScene, GameScene, RunGunScene, UIScene],
};
