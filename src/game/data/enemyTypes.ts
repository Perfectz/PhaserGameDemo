import { ENEMY_MAX_HEALTH, ENEMY_SPEED } from '../utils/constants';
import type { FacingDirection } from '../utils/types';

export type EnemyTypeId = 'razorPunk' | 'ironBouncer' | 'voltStriker' | 'neonWarden';
export type EnemyAnimationName = 'idle' | 'walk' | 'attack' | 'hurt' | 'defeated';

export interface EnemyAnimationDefinition {
  spriteKey: string;
  frames: number[];
  frameRate: number;
  repeat: number;
}

export interface EnemyTypeDefinition {
  id: EnemyTypeId;
  displayName: string;
  maxHealth: number;
  speed: number;
  spriteKey: string;
  tintColor: number;
  animations: Record<EnemyAnimationName, EnemyAnimationDefinition>;
  nativeFacing?: FacingDirection;
  spriteScaleMultiplier?: number;
  healthBarWidth?: number;
  healthBarYOffset?: number;
  hurtboxWidth?: number;
  hurtboxHeight?: number;
  hurtboxYOffset?: number;
  attackDamage?: number;
  attackCooldownMs?: number;
  attackLockMs?: number;
  attackKnockback?: number;
  attackRangeX?: number;
  attackRangeY?: number;
}

export const enemyTypes: Record<EnemyTypeId, EnemyTypeDefinition> = {
  razorPunk: {
    id: 'razorPunk',
    displayName: 'Razor Punk',
    maxHealth: ENEMY_MAX_HEALTH,
    speed: ENEMY_SPEED + 28,
    attackDamage: 5,
    attackCooldownMs: 1850,
    spriteKey: 'enemy-razor-punk-idle',
    tintColor: 0x4fd9d5,
    animations: {
      idle: { spriteKey: 'enemy-razor-punk-idle', frames: [0, 1, 2, 3, 4, 5], frameRate: 8, repeat: -1 },
      walk: { spriteKey: 'enemy-razor-punk-walk', frames: [0, 1, 2, 3, 4, 5, 6, 7], frameRate: 10, repeat: -1 },
      attack: { spriteKey: 'enemy-razor-punk-attack', frames: [0, 1, 2, 3, 4, 5], frameRate: 12, repeat: 0 },
      hurt: { spriteKey: 'enemy-razor-punk-hurt', frames: [0, 1, 2, 3, 4], frameRate: 12, repeat: 0 },
      defeated: { spriteKey: 'enemy-razor-punk-defeated', frames: [0, 1, 2, 3, 4, 5, 6, 7], frameRate: 10, repeat: 0 },
    },
  },
  ironBouncer: {
    id: 'ironBouncer',
    displayName: 'Iron Bouncer',
    maxHealth: ENEMY_MAX_HEALTH + 40,
    speed: ENEMY_SPEED - 26,
    attackDamage: 8,
    attackCooldownMs: 2050,
    spriteKey: 'enemy-iron-bouncer-idle',
    tintColor: 0xe0b84f,
    animations: {
      idle: { spriteKey: 'enemy-iron-bouncer-idle', frames: [0, 1, 2, 3, 4, 5], frameRate: 7, repeat: -1 },
      walk: { spriteKey: 'enemy-iron-bouncer-walk', frames: [0, 1, 2, 3, 4, 5, 6, 7], frameRate: 8, repeat: -1 },
      attack: { spriteKey: 'enemy-iron-bouncer-attack', frames: [0, 1, 2, 3, 4, 5], frameRate: 10, repeat: 0 },
      hurt: { spriteKey: 'enemy-iron-bouncer-hurt', frames: [0, 1, 2, 3, 4], frameRate: 10, repeat: 0 },
      defeated: { spriteKey: 'enemy-iron-bouncer-defeated', frames: [0, 1, 2, 3, 4, 5, 6, 7], frameRate: 9, repeat: 0 },
    },
  },
  voltStriker: {
    id: 'voltStriker',
    displayName: 'Volt Striker',
    maxHealth: ENEMY_MAX_HEALTH + 10,
    speed: ENEMY_SPEED + 18,
    attackDamage: 6,
    attackCooldownMs: 1750,
    spriteKey: 'enemy-volt-striker-idle',
    tintColor: 0xb86cff,
    nativeFacing: 1,
    animations: {
      idle: { spriteKey: 'enemy-volt-striker-idle', frames: [0, 1, 2, 3, 4, 5], frameRate: 8, repeat: -1 },
      walk: { spriteKey: 'enemy-volt-striker-walk', frames: [0, 1, 2, 3, 4, 5, 6, 7], frameRate: 11, repeat: -1 },
      attack: { spriteKey: 'enemy-volt-striker-attack', frames: [0, 1, 2, 3, 4, 5], frameRate: 13, repeat: 0 },
      hurt: { spriteKey: 'enemy-volt-striker-hurt', frames: [0, 1, 2, 3, 4], frameRate: 12, repeat: 0 },
      defeated: { spriteKey: 'enemy-volt-striker-defeated', frames: [0, 1, 2, 3, 4, 5, 6, 7], frameRate: 10, repeat: 0 },
    },
  },
  neonWarden: {
    id: 'neonWarden',
    displayName: 'Neon Warden',
    maxHealth: ENEMY_MAX_HEALTH + 175,
    speed: ENEMY_SPEED - 28,
    spriteKey: 'enemy-neon-warden-idle',
    tintColor: 0x34e8ff,
    spriteScaleMultiplier: 1.24,
    healthBarWidth: 76,
    healthBarYOffset: -104,
    hurtboxWidth: 62,
    hurtboxHeight: 126,
    hurtboxYOffset: 120,
    attackDamage: 15,
    attackCooldownMs: 1900,
    attackLockMs: 420,
    attackKnockback: 220,
    attackRangeX: 78,
    attackRangeY: 34,
    animations: {
      idle: { spriteKey: 'enemy-neon-warden-idle', frames: [0, 1, 2, 3, 4, 5], frameRate: 7, repeat: -1 },
      walk: { spriteKey: 'enemy-neon-warden-walk', frames: [0, 1, 2, 3, 4, 5, 6, 7], frameRate: 8, repeat: -1 },
      attack: { spriteKey: 'enemy-neon-warden-attack', frames: [0, 1, 2, 3, 4, 5], frameRate: 10, repeat: 0 },
      hurt: { spriteKey: 'enemy-neon-warden-hurt', frames: [0, 1, 2, 3, 4], frameRate: 10, repeat: 0 },
      defeated: { spriteKey: 'enemy-neon-warden-defeated', frames: [0, 1, 2, 3, 4, 5, 6, 7], frameRate: 9, repeat: 0 },
    },
  },
};

export const enemyTypeOrder: EnemyTypeId[] = ['razorPunk', 'ironBouncer', 'voltStriker'];
