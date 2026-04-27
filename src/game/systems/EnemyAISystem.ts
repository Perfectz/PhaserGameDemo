import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';

export class EnemyAISystem {
  private lastAttackerId: number | null = null;

  update(deltaMs: number, enemies: Enemy[], player: Player, now: number, attacksEnabledAt = 0): void {
    const activeEnemies = enemies.filter((enemy) => enemy.state !== 'defeated');
    const attacker = this.selectAttacker(activeEnemies, player);
    this.lastAttackerId = attacker?.id ?? null;

    for (let index = 0; index < activeEnemies.length; index += 1) {
      const enemy = activeEnemies[index];
      const laneOffset = this.getLaneOffset(index);
      const isAttacker = enemy.id === this.lastAttackerId;
      const spacingOffset = isAttacker ? 0 : this.getSpacingOffset(index, enemy.container.x < player.container.x);
      enemy.update(deltaMs, player, now, laneOffset, spacingOffset);

      if (!isAttacker || now < attacksEnabledAt) {
        enemy.delayNextAttackUntil(attacksEnabledAt);
        continue;
      }

      if (enemy.canAttackPlayer(player, now) && player.state !== 'defeated') {
        enemy.attackPlayer(player, now);
      }
    }
  }

  private getLaneOffset(index: number): number {
    const lanePattern = [0, -34, 34, -58, 58];
    return lanePattern[index % lanePattern.length];
  }

  private getSpacingOffset(index: number, enemyIsLeftOfPlayer: boolean): number {
    const distance = 74 + (index % 2) * 24;
    return enemyIsLeftOfPlayer ? -distance : distance;
  }

  private selectAttacker(enemies: Enemy[], player: Player): Enemy | undefined {
    const candidates = enemies.filter((enemy) => (
      enemy.state !== 'stunned' &&
      enemy.state !== 'knockedDown' &&
      enemy.state !== 'gettingUp'
    ));

    return candidates.sort((first, second) => (
      this.distanceToPlayer(first, player) - this.distanceToPlayer(second, player)
    ))[0];
  }

  private distanceToPlayer(enemy: Enemy, player: Player): number {
    const dx = enemy.container.x - player.container.x;
    const dy = (enemy.container.y - player.container.y) * 1.55;
    return dx * dx + dy * dy;
  }
}
