import Phaser from 'phaser';
import { DestructiblePropTypeId } from '../data/destructibleProps';
import { EnemyTypeId } from '../data/enemyTypes';

export type FacingDirection = -1 | 1;

export type PlayerState =
  | 'idle'
  | 'walking'
  | 'running'
  | 'attacking'
  | 'combo'
  | 'kicking'
  | 'recovering'
  | 'special'
  | 'evading'
  | 'shooting'
  | 'jumping'
  | 'hurt'
  | 'defeated';
export type EnemyState =
  | 'idle'
  | 'chasing'
  | 'attacking'
  | 'hurt'
  | 'stunned'
  | 'knockedDown'
  | 'gettingUp'
  | 'defeated';

export type PlayerAction = 'punch' | 'kick' | 'jump' | 'special' | 'shoot' | 'evade';

export interface MovementInput {
  x: number;
  y: number;
  run?: boolean;
}

export interface AttackInput {
  punch: boolean;
  kick: boolean;
  jump: boolean;
  special: boolean;
  shoot: boolean;
  evade: boolean;
}

export interface TouchInput {
  movement: MovementInput;
  actions: AttackInput;
  run: boolean;
}

export interface CharacterBounds {
  body: Phaser.Geom.Rectangle;
  hurtbox: Phaser.Geom.Rectangle;
}

export interface WaveDefinition {
  enemyCount: number;
  spawnDelayMs: number;
  enemyTypes?: EnemyTypeId[];
  triggerX?: number;
}

export interface DestructiblePropPlacement {
  typeId: DestructiblePropTypeId;
  x: number;
  y: number;
}

export type StageSetpieceType =
  | 'raisedWalkway'
  | 'ramp'
  | 'stairs'
  | 'ladder'
  | 'overpass'
  | 'neonGate'
  | 'streetKiosk'
  | 'subwayEntrance';

export interface StageSetpiecePlacement {
  type: StageSetpieceType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
}

export type ParallaxLayerShape = 'haze' | 'farSkyline' | 'midSkyline' | 'streetRail';

export interface ParallaxLayerDefinition {
  textureKey: string;
  shape?: ParallaxLayerShape;
  tileWidth: number;
  tileHeight: number;
  y: number;
  depth: number;
  scrollSpeed: number;
  alpha?: number;
}

export interface BackgroundDefinition {
  id: string;
  skyTopColor: number;
  skyBottomColor: number;
  horizonColor: number;
  layers: ParallaxLayerDefinition[];
}

export interface LevelDefinition {
  id: string;
  displayName: string;
  backgroundId: string;
  destructibleProps: DestructiblePropPlacement[];
  stageSetpieces: StageSetpiecePlacement[];
  waves: WaveDefinition[];
}
