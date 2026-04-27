import Phaser from 'phaser';
import { Hitbox } from '../entities/Hitbox';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { DestructibleProp } from '../entities/DestructibleProp';
import { moves } from '../data/moves';
import { getDepthScale } from '../utils/depth';
import { PlayerAction } from '../utils/types';
import {
  SFX_ENEMY_DEFEAT_KEY,
  SFX_HIT_HEAVY_KEY,
  SFX_HIT_LIGHT_KEY,
  SFX_JUMP_KEY,
  SFX_KICK_SWING_KEY,
  SFX_PROP_BREAK_KEY,
  SFX_PROP_HIT_KEY,
  SFX_PUNCH_SWING_KEY,
  SFX_SPECIAL_KEY,
} from '../utils/constants';
import { playSfx } from './SoundSystem';

type AttackMoveName = 'punch' | 'kick' | 'special';
interface AttackMove {
  damage: number;
  range: number;
  width: number;
  height: number;
  startupMs: number;
  activeMs: number;
  recoveryMs: number;
  comboBufferMs: number;
  hitStopMs: number;
  stunMs: number;
  knockback: number;
  knockdown: boolean;
  cooldownMs?: number;
  healthCost?: number;
}

const hitboxColors: Record<AttackMoveName, number> = {
  punch: 0xfff35c,
  kick: 0xef476f,
  special: 0x8ecae6,
};

export class CombatSystem {
  private activeHitboxes: Array<{ hitbox: Hitbox; moveName: AttackMoveName; move: AttackMove }> = [];
  private comboIndex = 0;
  private comboQueued = false;
  private nextComboReadyAt = 0;
  private comboWindowUntil = 0;
  private hitStopUntil = 0;
  private specialReadyAt = 0;

  constructor(private scene: Phaser.Scene) {}

  tryPlayerPunch(player: Player, enemies: Enemy[], props: DestructibleProp[] = []): void {
    this.tryPlayerAction('punch', player, enemies, props);
  }

  tryPlayerAction(action: PlayerAction, player: Player, enemies: Enemy[], props: DestructibleProp[] = []): void {
    if (action === 'jump') {
      if (player.jump(this.scene.time.now)) {
        playSfx(this.scene, SFX_JUMP_KEY, { volume: 0.36 });
      }
      return;
    }

    if (action === 'evade') {
      if (player.evade(this.scene.time.now, { x: player.facing, y: 0 })) {
        playSfx(this.scene, SFX_JUMP_KEY, { volume: 0.28, rate: 1.34 });
      }
      return;
    }

    if (action === 'punch') {
      this.tryPunchCombo(player, enemies, props);
      return;
    }

    if (action === 'shoot') {
      return;
    }

    this.resetCombo();
    this.tryPlayerAttack(action, player, enemies, props);
  }

  tryPlayerAttack(moveName: AttackMoveName, player: Player, enemies: Enemy[], props: DestructibleProp[] = []): void {
    const now = this.scene.time.now;
    const move = this.getMove(moveName);
    const state = moveName === 'special' ? 'special' : moveName === 'kick' ? 'kicking' : 'attacking';

    if (moveName === 'special') {
      if (now < this.specialReadyAt || !player.spendHealth(move.healthCost ?? 0)) {
        this.showStatusText(player.container.x, player.container.y - 112, now < this.specialReadyAt ? 'RECHARGING' : 'LOW HEALTH');
        return;
      }
      this.specialReadyAt = now + (move.cooldownMs ?? 0);
    }

    if (!player.beginAttack(now, move.startupMs + move.activeMs + move.recoveryMs, state)) {
      return;
    }

    playSfx(this.scene, moveName === 'special' ? SFX_SPECIAL_KEY : SFX_KICK_SWING_KEY, {
      volume: moveName === 'special' ? 0.48 : 0.38,
    });
    this.spawnAttackAfterStartup(moveName, move, player, enemies, props);
  }

  update(player: Player, enemies: Enemy[], props: DestructibleProp[] = []): void {
    const now = this.scene.time.now;

    if (this.comboQueued && now >= this.nextComboReadyAt && now <= this.comboWindowUntil) {
      this.startPunchStep(player, enemies, props, this.comboIndex);
    } else if (now > this.comboWindowUntil) {
      this.resetCombo();
    }

    this.activeHitboxes = this.activeHitboxes.filter(({ hitbox, moveName, move }) => {
      const alive = hitbox.update(now);
      if (alive) {
        this.resolveHitbox(hitbox, player, enemies, props, moveName, move);
      }
      return alive;
    });
  }

  isHitStopActive(now: number): boolean {
    return now < this.hitStopUntil;
  }

  getSpecialReadyPercent(now: number): number {
    if (now >= this.specialReadyAt) {
      return 1;
    }

    const cooldownMs = moves.special.cooldownMs ?? 1;
    return Phaser.Math.Clamp(1 - (this.specialReadyAt - now) / cooldownMs, 0, 1);
  }

  destroy(): void {
    this.activeHitboxes.forEach(({ hitbox }) => hitbox.destroy());
    this.activeHitboxes = [];
  }

  private tryPunchCombo(player: Player, enemies: Enemy[], props: DestructibleProp[]): void {
    const now = this.scene.time.now;

    if (now >= this.nextComboReadyAt && now <= this.comboWindowUntil && this.comboIndex > 0) {
      this.startPunchStep(player, enemies, props, this.comboIndex);
      return;
    }

    if (now < this.nextComboReadyAt && now <= this.comboWindowUntil && this.comboIndex > 0) {
      this.comboQueued = true;
      return;
    }

    this.startPunchStep(player, enemies, props, 0);
  }

  private startPunchStep(player: Player, enemies: Enemy[], props: DestructibleProp[], stepIndex: number): void {
    const now = this.scene.time.now;
    const move = moves.punch[stepIndex] ?? moves.punch[0];
    const lockMs = move.startupMs + move.activeMs + move.recoveryMs;

    if (!player.beginAttack(now, lockMs, stepIndex > 0 ? 'combo' : 'attacking', stepIndex > 0)) {
      return;
    }

    playSfx(this.scene, SFX_PUNCH_SWING_KEY, {
      volume: 0.34,
      rate: 1 + stepIndex * 0.08,
    });
    this.comboQueued = false;
    this.comboIndex = stepIndex + 1;
    this.nextComboReadyAt = now + move.startupMs + move.activeMs + Math.floor(move.recoveryMs * 0.35);
    this.comboWindowUntil = now + lockMs + move.comboBufferMs;

    if (this.comboIndex >= moves.punch.length) {
      this.comboWindowUntil = now + lockMs;
      this.scene.time.delayedCall(lockMs, () => {
        player.setRecovering(this.scene.time.now + 80);
        this.resetCombo();
      });
    }

    this.spawnAttackAfterStartup('punch', move, player, enemies, props);
  }

  private spawnAttackAfterStartup(
    moveName: AttackMoveName,
    move: AttackMove,
    player: Player,
    enemies: Enemy[],
    props: DestructibleProp[],
  ): void {
    this.scene.time.delayedCall(move.startupMs, () => {
      if (player.state === 'defeated') {
        return;
      }

      const laneScale = getDepthScale(player.container.y);
      const x = player.container.x + player.facing * move.range * laneScale;
      const y = player.container.y - 30 * laneScale;
      const hitbox = new Hitbox(
        this.scene,
        x,
        y,
        move.width * laneScale,
        move.height * laneScale,
        move.activeMs,
        hitboxColors[moveName],
      );
      this.activeHitboxes.push({ hitbox, moveName, move });
      if (moveName === 'special') {
        this.spawnSpecialPulse(player.container.x, player.container.y - 36, hitboxColors.special);
      }
      this.resolveHitbox(hitbox, player, enemies, props, moveName, move);
    });

    this.scene.time.delayedCall(move.startupMs + move.activeMs + move.recoveryMs, () => {
      if (player.state !== 'defeated' && moveName !== 'punch') {
        player.setRecovering(this.scene.time.now + 60);
      }
    });
  }

  private resolveHitbox(
    hitbox: Hitbox,
    player: Player,
    enemies: Enemy[],
    props: DestructibleProp[],
    moveName: AttackMoveName,
    move: AttackMove,
  ): void {
    for (const enemy of enemies) {
      if (
        enemy.state === 'defeated' ||
        enemy.state === 'knockedDown' ||
        enemy.state === 'gettingUp' ||
        hitbox.hitEnemyIds.has(enemy.id)
      ) {
        continue;
      }

      const sameLane = Math.abs(enemy.container.y - player.container.y) < 42 * player.getDepthScale();
      if (sameLane && Phaser.Geom.Intersects.RectangleToRectangle(hitbox.bounds, enemy.getHurtbox())) {
        hitbox.hitEnemyIds.add(enemy.id);
        const knockback = player.facing * move.knockback;
        const defeatedByHit = enemy.health <= move.damage;
        enemy.takeDamage(move.damage, knockback, move.stunMs, move.knockdown);
        playSfx(this.scene, defeatedByHit ? SFX_ENEMY_DEFEAT_KEY : move.knockdown ? SFX_HIT_HEAVY_KEY : SFX_HIT_LIGHT_KEY, {
          volume: defeatedByHit ? 0.52 : 0.48,
        });
        this.spawnHitSpark(enemy.container.x, enemy.container.y - 66, hitboxColors[moveName], move.knockdown);
        this.spawnImpactRing(enemy.container.x, enemy.container.y - 58, hitboxColors[moveName], moveName === 'special');
        this.showDamageNumber(enemy.container.x, enemy.container.y - 82, move.damage);
        this.hitStopUntil = Math.max(this.hitStopUntil, this.scene.time.now + move.hitStopMs);
        this.scene.cameras.main.shake(move.knockdown ? 110 : 70, move.knockdown ? 0.004 : 0.0025);
      }
    }

    for (const prop of props) {
      if (prop.isDestroyed || hitbox.hitPropIds.has(prop.id)) {
        continue;
      }

      const sameLane = Math.abs(prop.container.y - player.container.y) < 46 * player.getDepthScale();
      if (sameLane && Phaser.Geom.Intersects.RectangleToRectangle(hitbox.bounds, prop.getHurtbox())) {
        hitbox.hitPropIds.add(prop.id);
        const knockback = player.facing * move.knockback;
        const destroyed = prop.takeDamage(move.damage, knockback);
        playSfx(this.scene, destroyed ? SFX_PROP_BREAK_KEY : SFX_PROP_HIT_KEY, {
          volume: destroyed ? 0.52 : 0.42,
        });
        this.spawnHitSpark(prop.container.x, prop.container.y - 42, hitboxColors[moveName], destroyed);
        this.showDamageNumber(prop.container.x, prop.container.y - 58, move.damage);
        this.hitStopUntil = Math.max(this.hitStopUntil, this.scene.time.now + Math.floor(move.hitStopMs * 0.75));
        this.scene.cameras.main.shake(destroyed ? 90 : 55, destroyed ? 0.003 : 0.0018);
        if (destroyed) {
          this.scene.events.emit('pickup:spawn', prop.container.x, prop.container.y - 10);
        }
      }
    }
  }

  private getMove(moveName: AttackMoveName): AttackMove {
    return moveName === 'punch' ? moves.punch[0] : moves[moveName];
  }

  private resetCombo(): void {
    this.comboIndex = 0;
    this.comboQueued = false;
    this.nextComboReadyAt = 0;
    this.comboWindowUntil = 0;
  }

  private showDamageNumber(x: number, y: number, damage: number): void {
    const text = this.scene.add.text(x, y, String(damage), {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '18px',
      color: '#ffd166',
      stroke: '#07090d',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(9000);

    this.scene.tweens.add({
      targets: text,
      y: y - 28,
      alpha: 0,
      duration: 420,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private showStatusText(x: number, y: number, label: string): void {
    const text = this.scene.add.text(x, y, label, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '15px',
      color: '#8ecae6',
      stroke: '#07090d',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(9000);

    this.scene.tweens.add({
      targets: text,
      y: y - 18,
      alpha: 0,
      duration: 520,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private spawnHitSpark(x: number, y: number, color: number, heavy: boolean): void {
    const graphics = this.scene.add.graphics();
    const radius = heavy ? 38 : 26;
    graphics.setDepth(9500);
    graphics.lineStyle(4, 0xffffff, 0.98);
    graphics.strokeCircle(x, y, radius * 0.34);
    graphics.lineStyle(5, color, 0.95);
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10;
      graphics.lineBetween(
        x + Math.cos(angle) * 5,
        y + Math.sin(angle) * 5,
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
      );
    }
    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      scaleX: heavy ? 1.65 : 1.32,
      scaleY: heavy ? 1.65 : 1.32,
      duration: heavy ? 230 : 160,
      ease: 'Sine.easeOut',
      onComplete: () => graphics.destroy(),
    });
  }

  private spawnImpactRing(x: number, y: number, color: number, heavy: boolean): void {
    const ring = this.scene.add.ellipse(x, y, heavy ? 86 : 58, heavy ? 38 : 28);
    ring.setStrokeStyle(heavy ? 5 : 3, color, 0.82);
    ring.setDepth(9400);
    this.scene.tweens.add({
      targets: ring,
      scaleX: heavy ? 1.65 : 1.35,
      scaleY: heavy ? 1.65 : 1.35,
      alpha: 0,
      duration: heavy ? 260 : 180,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private spawnSpecialPulse(x: number, y: number, color: number): void {
    const pulse = this.scene.add.ellipse(x, y, 148, 74);
    pulse.setStrokeStyle(5, color, 0.68);
    pulse.setDepth(9300);
    this.scene.tweens.add({
      targets: pulse,
      scaleX: 1.45,
      scaleY: 1.45,
      alpha: 0,
      duration: 280,
      ease: 'Sine.easeOut',
      onComplete: () => pulse.destroy(),
    });
  }
}
