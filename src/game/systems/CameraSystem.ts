import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GAME_HEIGHT, WORLD_WIDTH } from '../utils/constants';
import { getDepthSort } from '../utils/depth';
import { EncounterBounds } from './EncounterFlowSystem';

export class CameraSystem {
  private horizontalLock?: EncounterBounds;

  constructor(private scene: Phaser.Scene, private player: Player) {
    const camera = scene.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    camera.stopFollow();
  }

  setHorizontalLock(bounds?: EncounterBounds): void {
    this.horizontalLock = bounds;
  }

  update(): void {
    const camera = this.scene.cameras.main;
    const viewportWidth = camera.width;
    const maxWorldScroll = Math.max(0, WORLD_WIDTH - viewportWidth);
    const lockMinScroll = this.horizontalLock
      ? Phaser.Math.Clamp(this.horizontalLock.left, 0, maxWorldScroll)
      : 0;
    const lockMaxScroll = this.horizontalLock
      ? Phaser.Math.Clamp(this.horizontalLock.right - viewportWidth, lockMinScroll, maxWorldScroll)
      : maxWorldScroll;
    const targetScrollX = Phaser.Math.Clamp(
      this.player.container.x - viewportWidth * 0.5,
      lockMinScroll,
      lockMaxScroll,
    );
    const nextScrollX = Math.abs(camera.scrollX - targetScrollX) < 0.5
      ? targetScrollX
      : Phaser.Math.Linear(camera.scrollX, targetScrollX, 0.1);

    camera.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    camera.setScroll(nextScrollX, 0);
    this.player.container.setDepth(getDepthSort(this.player.container.y));
  }
}
