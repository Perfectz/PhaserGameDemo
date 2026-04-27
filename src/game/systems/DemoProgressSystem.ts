import { readStorageValue, writeStorageValue } from './StorageSystem';

type DemoMode = 'brawler' | 'shooter';

const BEST_TIME_PREFIX = 'neonBrawlerBestTime';

export function getBestTimeMs(mode: DemoMode): number | undefined {
  const stored = readStorageValue(`${BEST_TIME_PREFIX}:${mode}`);
  if (!stored) {
    return undefined;
  }

  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function getBestTimeLabel(mode: DemoMode): string {
  const bestTimeMs = getBestTimeMs(mode);
  return bestTimeMs ? `BEST ${formatRunTime(bestTimeMs)}` : 'BEST --:--';
}

export function recordBestTime(mode: DemoMode, elapsedMs: number): boolean {
  const currentBest = getBestTimeMs(mode);
  if (currentBest !== undefined && currentBest <= elapsedMs) {
    return false;
  }

  writeStorageValue(`${BEST_TIME_PREFIX}:${mode}`, String(Math.round(elapsedMs)));
  return true;
}

export function formatRunTime(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
