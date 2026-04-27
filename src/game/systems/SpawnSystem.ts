import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { EnemyTypeId, enemyTypeOrder } from '../data/enemyTypes';
import { levels } from '../data/levels';
import { WALKABLE_BOTTOM, WALKABLE_TOP } from '../utils/constants';
import { WaveDefinition } from '../utils/types';

export class SpawnSystem {
  private waveIndex = -1;
  private pendingSpawns = 0;
  private stageClear = false;

  readonly level = levels[0];

  constructor(private scene: Phaser.Scene, private enemies: Enemy[]) {}

  start(): void {
    this.startNextWave();
  }

  update(playerX = 0): void {
    if (this.pendingSpawns > 0 || this.stageClear) {
      return;
    }

    const activeEnemies = this.enemies.some((enemy) => this.isEncounterBlocking(enemy));
    if (!activeEnemies) {
      const nextWave = this.level.waves[this.waveIndex + 1];
      if (nextWave && playerX < (nextWave.triggerX ?? 0)) {
        return;
      }
      this.startNextWave();
    }
  }

  get currentWaveNumber(): number {
    return Math.max(0, this.waveIndex + 1);
  }

  get currentWaveIndex(): number {
    return this.waveIndex;
  }

  get currentWave(): WaveDefinition | undefined {
    return this.level.waves[this.waveIndex];
  }

  get nextWave(): WaveDefinition | undefined {
    return this.level.waves[this.waveIndex + 1];
  }

  hasActiveEncounter(): boolean {
    return this.pendingSpawns > 0 || this.enemies.some((enemy) => this.isEncounterBlocking(enemy));
  }

  isStageClear(): boolean {
    return this.stageClear;
  }

  private startNextWave(): void {
    this.waveIndex += 1;
    const wave = this.level.waves[this.waveIndex];

    if (!wave) {
      this.stageClear = true;
      this.scene.events.emit('stage:cleared');
      return;
    }

    this.scene.events.emit('wave:started', this.waveIndex, wave);
    this.pendingSpawns = wave.enemyCount;
    for (let index = 0; index < wave.enemyCount; index += 1) {
      this.scene.time.delayedCall(wave.spawnDelayMs * index, () => {
        this.spawnEnemy(index, wave.enemyTypes);
        this.pendingSpawns -= 1;
      });
    }
  }

  private spawnEnemy(index: number, waveEnemyTypes: EnemyTypeId[] = enemyTypeOrder): void {
    const camera = this.scene.cameras.main;
    const firstWave = this.waveIndex === 0;
    const fromRight = firstWave || index % 2 === 0;
    const visibleLeft = camera.scrollX + 110;
    const visibleRight = camera.scrollX + camera.width - 145;
    const x = firstWave
      ? camera.scrollX + 620 + index * 70
      : fromRight
        ? visibleRight + index * 28
        : visibleLeft - index * 28;
    const y = firstWave
      ? Phaser.Math.Clamp(392 + (index % 2 === 0 ? -18 : 24), WALKABLE_TOP + 35, WALKABLE_BOTTOM - 15)
      : Phaser.Math.Between(WALKABLE_TOP + 45, WALKABLE_BOTTOM - 25);
    const enemyTypeId = waveEnemyTypes[index % waveEnemyTypes.length] ?? enemyTypeOrder[0];
    this.enemies.push(new Enemy(this.scene, x, y, enemyTypeId));
  }

  private isEncounterBlocking(enemy: Enemy): boolean {
    return enemy.state !== 'defeated' || enemy.container.alpha > 0.08;
  }
}
