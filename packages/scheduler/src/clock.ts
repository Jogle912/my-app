/** Injected time source. The scheduler and anything time-dependent must use this, never `Date.now()`. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

/** A clock frozen at one instant (tests). */
export function fixedClock(iso: string): Clock {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) throw new Error(`Invalid clock instant: ${iso}`);
  return { now: () => new Date(t) };
}

/** A clock that tests can advance to simulate the passage of time. */
export class SimulatedClock implements Clock {
  private t: number;
  constructor(iso: string) {
    this.t = new Date(iso).getTime();
    if (Number.isNaN(this.t)) throw new Error(`Invalid clock instant: ${iso}`);
  }
  now(): Date {
    return new Date(this.t);
  }
  advanceMinutes(minutes: number): void {
    this.t += minutes * 60_000;
  }
  set(iso: string): void {
    this.t = new Date(iso).getTime();
  }
}
