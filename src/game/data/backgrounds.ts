import { WALKABLE_TOP } from '../utils/constants';
import { BackgroundDefinition } from '../utils/types';

export const backgrounds: Record<string, BackgroundDefinition> = {
  'training-street-parallax': {
    id: 'training-street-parallax',
    skyTopColor: 0x101722,
    skyBottomColor: 0x1c2635,
    horizonColor: 0x263142,
    layers: [
      {
        textureKey: 'training-street-far-skyline',
        tileWidth: 1536,
        tileHeight: 340,
        y: -54,
        depth: -34,
        scrollSpeed: 0.1,
      },
      {
        textureKey: 'training-street-mid-buildings',
        tileWidth: 1536,
        tileHeight: 300,
        y: 46,
        depth: -28,
        scrollSpeed: 0.28,
        alpha: 0.95,
      },
      {
        textureKey: 'training-street-foreground-rail',
        tileWidth: 1536,
        tileHeight: 354,
        y: WALKABLE_TOP - 104,
        depth: -18,
        scrollSpeed: 0.5,
        alpha: 0.9,
      },
    ],
  },
};
