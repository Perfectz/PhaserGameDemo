export type DestructiblePropTypeId = 'trashCan' | 'mailbox' | 'woodenCrate' | 'oilDrum';

export interface DestructiblePropDefinition {
  id: DestructiblePropTypeId;
  displayName: string;
  rowIndex: number;
  maxHealth: number;
  displayHeight: number;
  bodyWidth: number;
  bodyHeight: number;
}

export const destructibleProps: Record<DestructiblePropTypeId, DestructiblePropDefinition> = {
  trashCan: {
    id: 'trashCan',
    displayName: 'Trash Can',
    rowIndex: 0,
    maxHealth: 28,
    displayHeight: 116,
    bodyWidth: 48,
    bodyHeight: 58,
  },
  mailbox: {
    id: 'mailbox',
    displayName: 'Mailbox',
    rowIndex: 1,
    maxHealth: 36,
    displayHeight: 132,
    bodyWidth: 54,
    bodyHeight: 70,
  },
  woodenCrate: {
    id: 'woodenCrate',
    displayName: 'Wooden Crate',
    rowIndex: 2,
    maxHealth: 24,
    displayHeight: 122,
    bodyWidth: 58,
    bodyHeight: 54,
  },
  oilDrum: {
    id: 'oilDrum',
    displayName: 'Oil Drum',
    rowIndex: 3,
    maxHealth: 42,
    displayHeight: 134,
    bodyWidth: 50,
    bodyHeight: 74,
  },
};
