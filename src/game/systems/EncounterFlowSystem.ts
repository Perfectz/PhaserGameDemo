import Phaser from 'phaser';
import { LevelDefinition } from '../utils/types';
import { GAME_WIDTH, WORLD_WIDTH } from '../utils/constants';

export interface EncounterBounds {
  left: number;
  right: number;
}

export class EncounterFlowSystem {
  constructor(private readonly level: LevelDefinition) {}

  getBoundsForWave(waveIndex: number): EncounterBounds {
    const wave = this.level.waves[waveIndex];
    const triggerX = wave?.triggerX ?? 0;
    const center = Phaser.Math.Clamp(triggerX + 260, GAME_WIDTH * 0.5, WORLD_WIDTH - GAME_WIDTH * 0.5);
    const halfWidth = GAME_WIDTH * 0.5;

    return {
      left: Phaser.Math.Clamp(center - halfWidth, 0, WORLD_WIDTH - GAME_WIDTH),
      right: Phaser.Math.Clamp(center + halfWidth, GAME_WIDTH, WORLD_WIDTH),
    };
  }

  shouldShowAdvancePrompt(waveIndex: number, hasActiveEncounter: boolean, stageClear: boolean): boolean {
    if (hasActiveEncounter || stageClear) {
      return false;
    }

    return Boolean(this.level.waves[waveIndex + 1]);
  }
}
