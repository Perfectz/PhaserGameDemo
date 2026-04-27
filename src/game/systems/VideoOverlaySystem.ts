import Phaser from 'phaser';
import { isSoundMuted } from './SoundSystem';

interface FullscreenVideoOverlayOptions {
  src: string;
  skipText?: string;
  onComplete: () => void;
}

export function playFullscreenVideoOverlay(
  scene: Phaser.Scene,
  options: FullscreenVideoOverlayOptions,
): void {
  const overlay = document.createElement('div');
  overlay.className = 'cinematic-video-overlay';

  const video = document.createElement('video');
  video.className = 'cinematic-video-overlay__video';
  video.src = options.src;
  video.autoplay = true;
  video.controls = false;
  video.muted = isSoundMuted();
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('playsinline', 'true');

  const skipLabel = document.createElement('div');
  skipLabel.className = 'cinematic-video-overlay__skip';
  skipLabel.textContent = options.skipText ?? 'TAP / PRESS ANY KEY TO SKIP';

  overlay.append(video, skipLabel);
  (document.getElementById('game') ?? document.body).appendChild(overlay);

  const abortController = new AbortController();
  let completed = false;

  const cleanup = () => {
    abortController.abort();
    video.pause();
    overlay.remove();
  };

  const cleanupOnSceneShutdown = () => {
    if (completed) {
      return;
    }
    completed = true;
    cleanup();
  };

  const finish = () => {
    if (completed) {
      return;
    }
    completed = true;
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanupOnSceneShutdown);
    cleanup();
    options.onComplete();
  };

  const listenerOptions = { once: true, signal: abortController.signal };
  video.addEventListener('ended', finish, listenerOptions);
  video.addEventListener('error', finish, listenerOptions);
  overlay.addEventListener('pointerdown', finish, listenerOptions);
  window.addEventListener('keydown', finish, listenerOptions);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanupOnSceneShutdown);

  video.play().catch(() => {
    skipLabel.textContent = 'TAP / PRESS ANY KEY TO CONTINUE';
  });
}
