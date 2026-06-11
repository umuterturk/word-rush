import type { ClockPort } from '../ports';

/**
 * Production clock backed by wall-clock time.
 * Use Date.now() so timers keep advancing while the tab is hidden;
 * performance.now() pauses in background tabs and desyncs from Date.now().
 */
export class BrowserClockAdapter implements ClockPort {
  now(): number {
    return Date.now();
  }

  requestFrame(callback: (time: number) => void): number {
    return requestAnimationFrame(() => callback(this.now()));
  }

  cancelFrame(handle: number): void {
    cancelAnimationFrame(handle);
  }
}
