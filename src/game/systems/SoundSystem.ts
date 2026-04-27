import Phaser from 'phaser';

interface SfxOptions {
  volume?: number;
  rate?: number;
  detune?: number;
}

const SOUND_MUTED_STORAGE_KEY = 'neonBrawlerSoundMuted';

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
  try {
    return window.localStorage.getItem(SOUND_MUTED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSoundMuted(scene: Phaser.Scene, muted: boolean): void {
  scene.sound.setMute(muted);
  try {
    window.localStorage.setItem(SOUND_MUTED_STORAGE_KEY, String(muted));
  } catch {
    // Local storage can be unavailable in some browser privacy modes; runtime mute still applies.
  }
}

export function applySoundPreference(scene: Phaser.Scene): boolean {
  const muted = isSoundMuted();
  scene.sound.setMute(muted);
  return muted;
}

export function playLoopingMusic(scene: Phaser.Scene, key: string, volume: number): Phaser.Sound.BaseSound | undefined {
  try {
    const existingMusic = scene.sound.get(key) as Phaser.Sound.BaseSound | null;
    const music = existingMusic ?? scene.sound.add(key, {
      loop: true,
      volume,
    });

    if (!music.isPlaying) {
      music.play();
    }

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
}
