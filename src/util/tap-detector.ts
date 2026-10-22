export type TapKind = "single" | "double";

export const MIN_DOUBLE_TAP_WAIT_MS = 100;
export const MAX_DOUBLE_TAP_WAIT_MS = 1000;
export const DEFAULT_DOUBLE_TAP_WAIT_MS = 300;

/** Reads a double-tap wait setting, falling back to the default and keeping it within 100–1000 ms. */
export function getDoubleTapWaitMs(value: unknown): number {
  const ms = Number(value);
  if (value === undefined || value === "" || !Number.isFinite(ms)) return DEFAULT_DOUBLE_TAP_WAIT_MS;
  return Math.min(Math.max(ms, MIN_DOUBLE_TAP_WAIT_MS), MAX_DOUBLE_TAP_WAIT_MS);
}

/**
 * Tells single taps from double taps, separately for each key (one per dial).
 * Taps pair up: the second tap within the wait is a double tap, and a third tap starts a new pair,
 * so three quick taps give a double tap and then a single tap.
 */
export class TapDetector {
  private readonly pending = new Map<string, NodeJS.Timeout>();

  constructor(private readonly onTap: (key: string, kind: TapKind) => void) {}

  tap(key: string, waitMs: number): void {
    const timer = this.pending.get(key);
    if (timer) {
      clearTimeout(timer);
      this.pending.delete(key);
      this.onTap(key, "double");
      return;
    }
    this.pending.set(
      key,
      setTimeout(() => {
        this.pending.delete(key);
        this.onTap(key, "single");
      }, waitMs),
    );
  }

  /** Drops a tap still waiting for its partner. */
  cancel(key: string): void {
    const timer = this.pending.get(key);
    if (timer) clearTimeout(timer);
    this.pending.delete(key);
  }
}
