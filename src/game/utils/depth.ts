import Phaser from 'phaser';
import {
  DEPTH_SCALE_BOTTOM,
  DEPTH_SCALE_TOP,
  WALKABLE_BOTTOM,
  WALKABLE_TOP,
} from './constants';

// Beat 'em ups fake depth by treating Y as distance from the camera:
// higher on the street is farther away, lower on the street is closer.
export function getDepthScale(y: number): number {
  const depthT = Phaser.Math.Clamp((y - WALKABLE_TOP) / (WALKABLE_BOTTOM - WALKABLE_TOP), 0, 1);
  return Phaser.Math.Linear(DEPTH_SCALE_TOP, DEPTH_SCALE_BOTTOM, depthT);
}

export function getDepthSort(y: number): number {
  return 100 + y;
}
