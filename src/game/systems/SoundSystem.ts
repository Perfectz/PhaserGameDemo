import Phaser from 'phaser';
import { readStorageValue, writeStorageValue } from './StorageSystem';

interface SfxOptions {
  volume?: number;
  rate?: number;
  detune?: number;
}

const SOUND_MUTED_STORAGE_KEY = 'neonBrawlerSoundMuted';
const activeMusicKeys = new Set<string>();

export function playSfx(scene: Phaser.Scene, key: string, options: SfxOptions = {}): void {
  try {
    scene.sound.play(key, {
      volume: options.volume ?? 0.55,
      rate: options.rate ?? 1,
      detune: options.detune ?? 0,
    });
  } catch {
    // Browsers may keep audio locked until first user interaction; missing or locked SFX should never interrupt gameplay.
  }
}

export function isSoundMuted(): boolean {
  return readStorageValue(SOUND_MUTED_STORAGE_KEY) === 'true';
}

export function setSoundMuted(scene: Phaser.Scene, muted: boolean): void {
  scene.sound.setMute(muted);
  writeStorageValue(SOUND_MUTED_STORAGE_KEY, String(muted));
}

export function applySoundPreference(scene: Phaser.Scene): boolean {
  const muted = isSoundMuted();
  scene.sound.setMute(muted);
  return muted;
}

export function playLoopingMusic(scene: Phaser.Scene, key: string, volume: number): Phaser.Sound.BaseSound | undefined {
  try {
    activeMusicKeys.forEach((activeKey) => {
      if (activeKey !== key) {
        stopMusic(scene, activeKey);
      }
    });

    const existingMusic = scene.sound.get(key) as Phaser.Sound.BaseSound | null;
    const music = existingMusic ?? scene.sound.add(key, {
      loop: true,
      volume,
    });

    if (!music.isPlaying) {
      music.play();
    }

    activeMusicKeys.add(key);
    return music;
  } catch {
    // Music should fail soft when browser audio is still locked or an asset is unavailable.
    return undefined;
  }
}

export function stopMusic(scene: Phaser.Scene, key: string): void {
  const music = scene.sound.get(key) as Phaser.Sound.BaseSound | null;
  if (music?.isPlaying) {
    music.stop();
  }
  activeMusicKeys.delete(key);
}
