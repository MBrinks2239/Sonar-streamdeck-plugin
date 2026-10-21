export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Two decimals, so float noise like 0.30000000000000004 never ends up in a URL. */
export function formatVolumeForUrl(volume: number): string {
  return String(Math.round(volume * 100) / 100);
}

/** NaN-safe 0..1 check; `volume < 0 || volume > 1` lets NaN through. */
export function isValidVolume(volume: number): boolean {
  return volume >= 0 && volume <= 1;
}
