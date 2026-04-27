import Phaser from 'phaser';
import { GameAsset } from '../data/assets';

export function loadAssets(scene: Phaser.Scene, assets: readonly GameAsset[]): void {
  assets.forEach((asset) => {
    if (isAssetLoaded(scene, asset)) {
      return;
    }

    switch (asset.kind) {
      case 'image':
        scene.load.image(asset.key, asset.url);
        break;
      case 'audio':
        scene.load.audio(asset.key, asset.url);
        break;
      case 'spritesheet':
        scene.load.spritesheet(asset.key, asset.url, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
        });
        break;
      case 'atlas':
        scene.load.atlas(asset.key, asset.textureUrl, asset.atlasUrl);
        break;
      default:
        assertNever(asset);
    }
  });
}

export function areAssetsLoaded(scene: Phaser.Scene, assets: readonly GameAsset[]): boolean {
  return assets.every((asset) => isAssetLoaded(scene, asset));
}

export function loadAssetsThenStart(
  scene: Phaser.Scene,
  assets: readonly GameAsset[],
  onComplete: () => void,
  onProgress?: (progress: number) => void,
  onError?: () => void,
): boolean {
  if (areAssetsLoaded(scene, assets)) {
    onComplete();
    return false;
  }

  scene.load.once(Phaser.Loader.Events.COMPLETE, onComplete);
  if (onProgress) {
    scene.load.on(Phaser.Loader.Events.PROGRESS, onProgress);
  }
  if (onError) {
    scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
  }
  loadAssets(scene, assets);
  scene.load.start();
  return true;
}

function isAssetLoaded(scene: Phaser.Scene, asset: GameAsset): boolean {
  if (asset.kind === 'audio') {
    return scene.cache.audio.exists(asset.key);
  }

  return scene.textures.exists(asset.key);
}

function assertNever(value: never): never {
  throw new Error(`Unhandled asset kind: ${JSON.stringify(value)}`);
}

