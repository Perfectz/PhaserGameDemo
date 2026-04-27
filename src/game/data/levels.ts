import { DestructiblePropPlacement, LevelDefinition, StageSetpiecePlacement, WaveDefinition } from '../utils/types';

const streetProps: DestructiblePropPlacement[] = [
  { typeId: 'trashCan', x: 280, y: 292 },
  { typeId: 'woodenCrate', x: 470, y: 462 },
  { typeId: 'mailbox', x: 700, y: 314 },
  { typeId: 'oilDrum', x: 930, y: 454 },
  { typeId: 'trashCan', x: 1200, y: 292 },
  { typeId: 'woodenCrate', x: 1435, y: 448 },
  { typeId: 'mailbox', x: 1620, y: 326 },
  { typeId: 'oilDrum', x: 1885, y: 454 },
  { typeId: 'trashCan', x: 2070, y: 302 },
  { typeId: 'woodenCrate', x: 2280, y: 442 },
  { typeId: 'mailbox', x: 2520, y: 314 },
  { typeId: 'oilDrum', x: 2760, y: 454 },
  { typeId: 'woodenCrate', x: 2980, y: 438 },
];

const makeProps = (shift: number): DestructiblePropPlacement[] =>
  streetProps.map((prop, index) => ({
    ...prop,
    x: Math.min(3060, Math.max(220, prop.x + (index % 2 === 0 ? shift : -shift * 0.45))),
  }));

const makeLevel = (
  id: string,
  displayName: string,
  destructibleProps: DestructiblePropPlacement[],
  waves: WaveDefinition[],
  stageSetpieces: StageSetpiecePlacement[] = [],
): LevelDefinition => ({
  id,
  displayName,
  backgroundId: 'training-street-parallax',
  destructibleProps,
  stageSetpieces,
  waves,
});

export const levels: LevelDefinition[] = [
  makeLevel('street-01', 'Training Street', streetProps, [
    { enemyCount: 1, spawnDelayMs: 350, triggerX: 0, enemyTypes: ['razorPunk'] },
    { enemyCount: 2, spawnDelayMs: 450, triggerX: 720, enemyTypes: ['razorPunk', 'voltStriker'] },
    { enemyCount: 2, spawnDelayMs: 500, triggerX: 1420, enemyTypes: ['razorPunk', 'voltStriker'] },
    { enemyCount: 3, spawnDelayMs: 560, triggerX: 2180, enemyTypes: ['ironBouncer', 'razorPunk', 'voltStriker'] },
    { enemyCount: 1, spawnDelayMs: 0, triggerX: 3020, enemyTypes: ['neonWarden'] },
  ], [
    { type: 'neonGate', x: 150, y: 252, height: 176 },
    { type: 'raisedWalkway', x: 850, y: 248, width: 420, height: 138 },
    { type: 'streetKiosk', x: 1440, y: 256, height: 188 },
    { type: 'stairs', x: 2005, y: 256, width: 300, height: 170 },
    { type: 'overpass', x: 2510, y: 250, width: 420, height: 190 },
    { type: 'subwayEntrance', x: 2875, y: 250, height: 170 },
  ]),
  makeLevel('street-02', 'Metro Underpass', makeProps(70), [
    { enemyCount: 2, spawnDelayMs: 380, triggerX: 0, enemyTypes: ['razorPunk'] },
    { enemyCount: 3, spawnDelayMs: 440, triggerX: 660, enemyTypes: ['razorPunk', 'voltStriker'] },
    { enemyCount: 3, spawnDelayMs: 500, triggerX: 1260, enemyTypes: ['voltStriker', 'razorPunk'] },
    { enemyCount: 4, spawnDelayMs: 560, triggerX: 1900, enemyTypes: ['ironBouncer', 'razorPunk'] },
    { enemyCount: 4, spawnDelayMs: 610, triggerX: 2540, enemyTypes: ['voltStriker', 'ironBouncer', 'razorPunk'] },
    { enemyCount: 1, spawnDelayMs: 0, triggerX: 3020, enemyTypes: ['neonWarden'] },
  ]),
  makeLevel('street-03', 'Rooftop Market', makeProps(-55), [
    { enemyCount: 2, spawnDelayMs: 360, triggerX: 0, enemyTypes: ['voltStriker', 'razorPunk'] },
    { enemyCount: 3, spawnDelayMs: 430, triggerX: 620, enemyTypes: ['razorPunk', 'ironBouncer'] },
    { enemyCount: 4, spawnDelayMs: 500, triggerX: 1220, enemyTypes: ['voltStriker', 'razorPunk'] },
    { enemyCount: 4, spawnDelayMs: 560, triggerX: 1860, enemyTypes: ['ironBouncer', 'voltStriker'] },
    { enemyCount: 5, spawnDelayMs: 590, triggerX: 2500, enemyTypes: ['razorPunk', 'voltStriker', 'ironBouncer'] },
    { enemyCount: 1, spawnDelayMs: 0, triggerX: 3020, enemyTypes: ['neonWarden'] },
  ]),
  makeLevel('street-04', 'Neon Docks', makeProps(115), [
    { enemyCount: 3, spawnDelayMs: 360, triggerX: 0, enemyTypes: ['razorPunk', 'voltStriker'] },
    { enemyCount: 3, spawnDelayMs: 420, triggerX: 600, enemyTypes: ['ironBouncer', 'razorPunk'] },
    { enemyCount: 4, spawnDelayMs: 500, triggerX: 1180, enemyTypes: ['voltStriker', 'ironBouncer'] },
    { enemyCount: 5, spawnDelayMs: 540, triggerX: 1800, enemyTypes: ['razorPunk', 'voltStriker', 'ironBouncer'] },
    { enemyCount: 5, spawnDelayMs: 590, triggerX: 2440, enemyTypes: ['ironBouncer', 'voltStriker', 'razorPunk'] },
    { enemyCount: 1, spawnDelayMs: 0, triggerX: 3020, enemyTypes: ['neonWarden'] },
  ]),
  makeLevel('street-05', 'Warden Tower', makeProps(-95), [
    { enemyCount: 3, spawnDelayMs: 340, triggerX: 0, enemyTypes: ['voltStriker', 'razorPunk'] },
    { enemyCount: 4, spawnDelayMs: 400, triggerX: 560, enemyTypes: ['ironBouncer', 'razorPunk', 'voltStriker'] },
    { enemyCount: 5, spawnDelayMs: 470, triggerX: 1120, enemyTypes: ['voltStriker', 'ironBouncer'] },
    { enemyCount: 5, spawnDelayMs: 520, triggerX: 1740, enemyTypes: ['razorPunk', 'ironBouncer', 'voltStriker'] },
    { enemyCount: 6, spawnDelayMs: 560, triggerX: 2380, enemyTypes: ['ironBouncer', 'voltStriker', 'razorPunk'] },
    { enemyCount: 2, spawnDelayMs: 320, triggerX: 3020, enemyTypes: ['neonWarden'] },
  ]),
];
