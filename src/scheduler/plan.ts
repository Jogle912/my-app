import type { Clock } from "./clock";
import { decompose, type Unit } from "./decompose";
import { ceilToGrid, floorToGrid, HOUR, type Interval, MINUTE, normalize, overlaps, subtract } from "./intervals";
import { ALL_DAYS, assertZone, expandWeekly, formatLocal, fromISO, localDateKey, localHour, toISO } from "./time";
import type {
  ExistingSession,
  PlanInput,
  PlannedSession,
  PlanResult,
  PlanWarning,
  SessionChange,
  Shortfall,
  WorkItem,
} from "./types";

export const ENGINE_VERSION = "0.1.0";
const DEFAULT_HORIZON_DAYS = 42;

interface Placement {
  unit: Unit;
  start: number;
  end: number;
  bufferReduced: boolean;
}

interface Locked {
  session: ExistingSession;
  start: number;
  end: number;
}

/** Everything derived from the input that every placement pass shares. */
interface Context {
  input: PlanInput;
  zone: string;
  now: number;
  horizon: Interval;
  /** Free time after sleep, classes, events, blocked windows and locked sessions. */
  baseFree: Interval[];
  /** Busy time that is not study time (used to explain why a session moved). */
  busy: Interval[];
  lockedByDay: Map<string, number>;
  lockedCourseByDay: Map<string, number>;
  units: Unit[];
  previousByItem: Map<string, { session: ExistingSession; start: number; end: number }[]>;
}

/**
 * Builds a study plan. Pure and deterministic: identical input and clock produce identical output.
 */
export function plan(input: PlanInput, clock: Clock): PlanResult {
  assertZone(input.timeZone);
  validatePreferences(input);
  const warnings: PlanWarning[] = [];
  const ctx = buildContext(input, clock, warnings);

  const candidates: { name: PlanResult["strategy"]; placements: Placement[]; leftover: Unit[] }[] = [];
  const hasPrevious = [...ctx.previousByItem.values()].some((v) => v.length > 0);
  if (hasPrevious) candidates.push({ name: "stable", ...runPass(ctx, "scored", true) });
  candidates.push({ name: "fresh", ...runPass(ctx, "scored", false) });
  if (candidates.every((c) => c.leftover.length > 0)) {
    candidates.push({ name: "earliest-deadline", ...runPass(ctx, "earliest", false) });
  }
  // Prefer earlier (more stable / nicer) passes unless a later one schedules strictly more work.
  let best = candidates[0];
  for (const c of candidates.slice(1)) if (unscheduled(c.leftover) < unscheduled(best.leftover)) best = c;
  if (hasPrevious && best.name !== "stable") {
    warnings.push({
      code: "FALLBACK_STRATEGY",
      message: "Your schedule was rebuilt because keeping existing sessions in place would have left work unscheduled.",
    });
  }

  const sessions = buildSessions(ctx, best.placements);
  for (const p of best.placements) {
    if (p.bufferReduced && !warnings.some((w) => w.code === "BUFFER_REDUCED" && w.itemId === p.unit.itemId)) {
      warnings.push({
        code: "BUFFER_REDUCED",
        itemId: p.unit.itemId,
        message: `"${itemTitle(ctx, p.unit.itemId)}" only fits by working inside your ${input.preferences.deadlineBufferHours}h safety buffer before the deadline.`,
      });
    }
  }

  const demandMinutes = ctx.units.reduce((s, u) => s + u.minutes, 0);
  const scheduledMinutes = best.placements.reduce((s, p) => s + p.unit.minutes, 0);
  return {
    engineVersion: ENGINE_VERSION,
    generatedAt: toISO(ctx.now),
    horizon: { start: toISO(ctx.horizon.start), end: toISO(ctx.horizon.end) },
    sessions,
    changes: diff(ctx, best.placements),
    shortfalls: shortfalls(ctx, best.leftover),
    warnings,
    capacity: { availableMinutes: capacityUpperBound(ctx), demandMinutes, scheduledMinutes },
    strategy: best.name,
  };
}

// ───────────────────────────── context ─────────────────────────────

function buildContext(input: PlanInput, clock: Clock, warnings: PlanWarning[]): Context {
  const zone = input.timeZone;
  const prefs = input.preferences;
  const now = ceilToGrid(clock.now().getTime());
  const horizon = { start: now, end: now + (input.horizonDays ?? DEFAULT_HORIZON_DAYS) * 24 * HOUR };

  const available = expandWeekly(input.availability, zone, horizon.start, horizon.end);
  const sleep = expandWeekly(
    [{ id: "sleep", days: ALL_DAYS, start: prefs.sleep.start, end: prefs.sleep.end }],
    zone,
    horizon.start,
    horizon.end,
  );
  const blocked = expandWeekly(input.blocked ?? [], zone, horizon.start, horizon.end);
  const classes = expandWeekly(input.classMeetings ?? [], zone, horizon.start, horizon.end);
  const events = (input.events ?? []).map((e) => ({ start: fromISO(e.start), end: fromISO(e.end) }));
  const busy = normalize([...sleep, ...blocked, ...classes, ...events]);

  const locked: Locked[] = (input.existingSessions ?? [])
    .filter((s) => s.locked)
    .map((s) => ({ session: s, start: fromISO(s.start), end: fromISO(s.end) }))
    .filter((l) => l.end > now);
  const breakMs = prefs.breakMinutes * MINUTE;
  const baseFree = subtract(available, [...busy, ...locked.map((l) => ({ start: l.start - breakMs, end: l.end + breakMs }))]);

  const lockedByDay = new Map<string, number>();
  const lockedCourseByDay = new Map<string, number>();
  const lockedMinutesByItem = new Map<string, number>();
  const itemsById = new Map(input.items.map((i) => [i.id, i]));
  for (const l of locked) {
    const day = localDateKey(l.start, zone);
    const mins = (l.end - Math.max(l.start, now)) / MINUTE;
    lockedByDay.set(day, (lockedByDay.get(day) ?? 0) + mins);
    const item = l.session.itemId ? itemsById.get(l.session.itemId) : undefined;
    if (item) {
      lockedCourseByDay.set(`${day}|${item.courseId}`, (lockedCourseByDay.get(`${day}|${item.courseId}`) ?? 0) + 1);
      if (l.end <= fromISO(item.dueAt)) lockedMinutesByItem.set(item.id, (lockedMinutesByItem.get(item.id) ?? 0) + mins);
    }
  }

  const coursesById = new Map(input.courses.map((c) => [c.id, c]));
  const units: Unit[] = [];
  const seen = new Set<string>();
  for (const item of input.items) {
    if (seen.has(item.id)) throw new Error(`Duplicate work item id "${item.id}"`);
    seen.add(item.id);
    const due = fromISO(item.dueAt, `dueAt of ${item.id}`);
    if (due <= now) {
      warnings.push({ code: "OVERDUE", itemId: item.id, message: `"${item.title}" was due ${formatLocal(due, zone)} and is not scheduled.` });
      continue;
    }
    if (due > horizon.end) {
      warnings.push({
        code: "DEFERRED_BEYOND_HORIZON",
        itemId: item.id,
        message: `"${item.title}" is due after the planning window and will be scheduled later.`,
      });
      continue;
    }
    units.push(...decompose(item, coursesById.get(item.courseId), prefs, now, lockedMinutesByItem.get(item.id) ?? 0));
  }
  // Earliest deadline first; ties broken by priority, then stable identifiers (determinism).
  units.sort(byUrgency);

  const previousByItem = new Map<string, { session: ExistingSession; start: number; end: number }[]>();
  for (const s of input.existingSessions ?? []) {
    if (s.locked || !s.itemId) continue;
    const list = previousByItem.get(s.itemId) ?? [];
    list.push({ session: s, start: fromISO(s.start), end: fromISO(s.end) });
    previousByItem.set(s.itemId, list);
  }
  for (const list of previousByItem.values()) list.sort((a, b) => a.start - b.start || a.session.id.localeCompare(b.session.id));

  return { input, zone, now, horizon, baseFree, busy, lockedByDay, lockedCourseByDay, units, previousByItem };
}

function validatePreferences(input: PlanInput): void {
  const p = input.preferences;
  const positive: [string, number][] = [
    ["maxStudyMinutesPerDay", p.maxStudyMinutesPerDay],
    ["preferredSessionMinutes", p.preferredSessionMinutes],
    ["minSessionMinutes", p.minSessionMinutes],
  ];
  for (const [k, v] of positive) if (!(v > 0)) throw new Error(`preferences.${k} must be positive`);
  if (p.minSessionMinutes > p.preferredSessionMinutes) throw new Error("minSessionMinutes cannot exceed preferredSessionMinutes");
  if (p.breakMinutes < 0 || p.deadlineBufferHours < 0) throw new Error("breakMinutes and deadlineBufferHours cannot be negative");
}


/** Earliest deadline first; ties broken by priority, then stable identifiers (determinism). */
function byUrgency(a: Unit, b: Unit): number {
  return a.deadline - b.deadline || b.priority - a.priority || a.itemId.localeCompare(b.itemId) || a.seq - b.seq || a.key.localeCompare(b.key);
}

/**
 * Minimal churn: walk each item's previous future sessions in time order and keep each one where it
 * is, filled with the item's remaining work in order, as long as it is still valid. Stops at the first
 * session that no longer fits so milestone order is preserved. Returns the work still to place.
 */
function keepPreviousSessions(ctx: Context, state: State, queue: Unit[]): Unit[] {
  const rest: Unit[] = [];
  for (const [itemId, units] of groupBy(queue, (u) => u.itemId)) {
    const stream = [...units];
    for (const p of (ctx.previousByItem.get(itemId) ?? []).filter((x) => x.start >= ctx.now)) {
      if (!stream.length) break;
      const want = (p.end - p.start) / MINUTE;
      const consumed: Unit[] = [];
      let take = 0;
      while (take < want && stream.length) {
        const u = stream[0];
        if (u.minutes <= want - take) {
          consumed.push(stream.shift()!);
          take += u.minutes;
        } else {
          const need = want - take;
          consumed.push({ ...u, minutes: need });
          stream[0] = { ...u, key: `${u.key}+`, minutes: u.minutes - need };
          take += need;
        }
      }
      const head: Unit = {
        ...consumed[0],
        minutes: take,
        deadline: Math.min(...consumed.map((c) => c.deadline)),
        hardDeadline: Math.min(...consumed.map((c) => c.hardDeadline)),
      };
      const end = p.start + take * MINUTE;
      if (!fitsExactly(ctx, state, head, p.start, end)) {
        stream.unshift(...rejoin(consumed, stream.shift()));
        break;
      }
      state.commit(head, p.start, end, end > head.deadline);
    }
    rest.push(...stream);
  }
  return rest.sort(byUrgency);
}

/** Undo a tentative split so a failed keep leaves the work exactly as it was. */
function rejoin(consumed: Unit[], next: Unit | undefined): Unit[] {
  const last = consumed[consumed.length - 1];
  if (next && last && next.key === `${last.key}+`) return [...consumed.slice(0, -1), { ...last, minutes: last.minutes + next.minutes }];
  return next ? [...consumed, next] : consumed;
}

// ───────────────────────────── placement ─────────────────────────────

class State {
  free: Interval[];
  dayMinutes: Map<string, number>;
  dayCourse: Map<string, number>;
  dayItem = new Map<string, number>();
  lastEnd = new Map<string, number>();
  placements: Placement[] = [];
  constructor(private ctx: Context) {
    this.free = ctx.baseFree.map((i) => ({ ...i }));
    this.dayMinutes = new Map(ctx.lockedByDay);
    this.dayCourse = new Map(ctx.lockedCourseByDay);
  }
  dayBudget(day: string): number {
    return this.ctx.input.preferences.maxStudyMinutesPerDay - (this.dayMinutes.get(day) ?? 0);
  }
  commit(unit: Unit, start: number, end: number, bufferReduced: boolean): void {
    const b = this.ctx.input.preferences.breakMinutes * MINUTE;
    this.free = subtract(this.free, [{ start: start - b, end: end + b }]);
    const day = localDateKey(start, this.ctx.zone);
    this.dayMinutes.set(day, (this.dayMinutes.get(day) ?? 0) + (end - start) / MINUTE);
    const dc = `${day}|${unit.courseId}`;
    this.dayCourse.set(dc, (this.dayCourse.get(dc) ?? 0) + 1);
    const di = `${day}|${unit.itemId}`;
    this.dayItem.set(di, (this.dayItem.get(di) ?? 0) + 1);
    if (unit.ordered) this.lastEnd.set(chainKey(unit), end);
    this.placements.push({ unit, start, end, bufferReduced });
  }
}

const chainKey = (u: Unit) => u.itemId;

interface Candidate {
  start: number;
  /** Minutes that fit here (may be less than the unit when splitting). */
  minutes: number;
  score: number;
}

function runPass(ctx: Context, mode: "scored" | "earliest", keepPrevious: boolean): { placements: Placement[]; leftover: Unit[] } {
  const state = new State(ctx);
  let queue = ctx.units.map((u) => ({ ...u }));
  const leftover: Unit[] = [];

  if (keepPrevious) queue = keepPreviousSessions(ctx, state, queue);

  while (queue.length) {
    const unit = queue.shift()!;
    // Ordered work after this unit must still fit between this unit's end and the deadline.
    const after = unit.ordered ? queue.filter((q) => q.itemId === unit.itemId).reduce((a, q) => a + q.minutes, 0) : 0;
    const placed =
      placeUnit(ctx, state, unit, mode, unit.deadline, false, after) || placeUnit(ctx, state, unit, mode, unit.hardDeadline, true, after);
    if (placed === false) {
      leftover.push(unit);
    } else if (placed !== true) {
      // Partially placed: the remainder is retried next, keeping the item's order.
      queue.unshift(placed);
    }
  }
  return { placements: state.placements, leftover };
}

/** Returns true when fully placed, a remainder unit when split, or false when nothing fit. */
function placeUnit(
  ctx: Context,
  state: State,
  unit: Unit,
  mode: "scored" | "earliest",
  deadline: number,
  bufferReduced: boolean,
  reserveAfter: number,
): boolean | Unit {
  const prefs = ctx.input.preferences;
  const earliest = Math.max(unit.release, unit.ordered ? (state.lastEnd.get(chainKey(unit)) ?? 0) : 0, ctx.now);
  // Candidates that leave room for the rest of an ordered chain are preferred; others are a fallback
  // so that an infeasible chain still gets its earliest steps scheduled.
  const full: Candidate[] = [];
  const partial: Candidate[] = [];
  const fullTight: Candidate[] = [];
  const partialTight: Candidate[] = [];
  for (const f of state.free) {
    if (f.end <= earliest) continue;
    if (f.start >= deadline) break;
    for (const start of candidateStarts(ctx, f, earliest)) {
      const day = localDateKey(start, ctx.zone);
      const budget = state.dayBudget(day);
      const room = Math.min(floorToGrid(Math.min(f.end, deadline)) - start, ctx.horizon.end - start) / MINUTE;
      const fit = Math.min(room, budget);
      const roomy =
        reserveAfter <= 0 ||
        freeMinutesBetween(state, start + Math.min(fit, unit.minutes) * MINUTE, deadline, prefs.minSessionMinutes) >= reserveAfter;
      if (fit >= unit.minutes) {
        (roomy ? full : fullTight).push({ start, minutes: unit.minutes, score: score(ctx, state, unit, start, deadline, mode) });
      } else {
        // Split: place what fits here; the remainder is scheduled next.
        const minutes = Math.floor(fit / 5) * 5;
        if (minutes >= prefs.minSessionMinutes) {
          (roomy ? partial : partialTight).push({ start, minutes, score: score(ctx, state, unit, start, deadline, mode) });
        }
      }
    }
  }
  const pick = best(full) ?? best(partial) ?? best(fullTight) ?? best(partialTight);
  if (!pick) return false;
  if (pick.minutes === unit.minutes) {
    state.commit(unit, pick.start, pick.start + unit.minutes * MINUTE, bufferReduced);
    return true;
  }
  const head: Unit = { ...unit, minutes: pick.minutes };
  state.commit(head, pick.start, pick.start + pick.minutes * MINUTE, bufferReduced);
  return { ...unit, key: `${unit.key}+`, minutes: unit.minutes - pick.minutes };
}

/** Start of the free interval, plus hour marks inside long intervals (so energy preferences can matter). */
function candidateStarts(ctx: Context, f: Interval, earliest: number): number[] {
  const minGap = (ctx.input.preferences.minSessionMinutes + ctx.input.preferences.breakMinutes) * MINUTE;
  const first = ceilToGrid(Math.max(f.start, earliest));
  const out = [first];
  for (let t = Math.ceil((first + 1) / HOUR) * HOUR; t < f.end; t += HOUR) {
    if (t - first >= minGap) out.push(t);
  }
  return out;
}

/** Free study minutes in [from, to), ignoring fragments too short for a session (an upper bound). */
function freeMinutesBetween(state: State, from: number, to: number, minSession: number): number {
  let total = 0;
  for (const f of state.free) {
    const s = Math.max(f.start, from);
    const e = Math.min(f.end, to);
    if (e - s >= minSession * MINUTE) total += (e - s) / MINUTE;
  }
  return total;
}

function best(list: Candidate[]): Candidate | undefined {
  let b: Candidate | undefined;
  for (const c of list) if (!b || c.score > b.score + 1e-9 || (Math.abs(c.score - b.score) <= 1e-9 && c.start < b.start)) b = c;
  return b;
}

function score(ctx: Context, state: State, unit: Unit, start: number, deadline: number, mode: "scored" | "earliest"): number {
  if (mode === "earliest") return -start / HOUR;
  const prefs = ctx.input.preferences;
  const span = Math.max(deadline - unit.release, HOUR);
  const elapsed = (start - unit.release) / span; // 0 = as early as possible, 1 = last minute
  const hour = localHour(start, ctx.zone);
  const energy = hour >= 5 && hour < 12 ? prefs.energy.morning : hour < 17 && hour >= 12 ? prefs.energy.afternoon : prefs.energy.evening;
  const day = localDateKey(start, ctx.zone);
  const sameCourse = state.dayCourse.get(`${day}|${unit.courseId}`) ?? 0;
  const load = (state.dayMinutes.get(day) ?? 0) / prefs.maxStudyMinutesPerDay;
  const sameItem = state.dayItem.get(`${day}|${unit.itemId}`) ?? 0;
  return (
    -0.4 * sameItem + // spaced practice: spread one item over several days
    -2 * elapsed -
    6 * Math.max(0, elapsed - 0.7) + // steep penalty for the last stretch before a deadline
    (energy - 2) * (unit.difficulty / 3) * 0.8 +
    (sameCourse >= prefs.maxSameCourseSessionsPerDay ? -3 : -0.5 * sameCourse) +
    -1 * load
  );
}

function fitsExactly(ctx: Context, state: State, unit: Unit, start: number, end: number): boolean {
  const earliest = Math.max(unit.release, unit.ordered ? (state.lastEnd.get(chainKey(unit)) ?? 0) : 0, ctx.now);
  if (start < earliest || end > unit.hardDeadline || end > ctx.horizon.end) return false;
  if (!state.free.some((f) => f.start <= start && end <= f.end)) return false;
  return state.dayBudget(localDateKey(start, ctx.zone)) >= unit.minutes;
}

const unscheduled = (units: Unit[]) => units.reduce((s, u) => s + u.minutes, 0);

// ───────────────────────────── output ─────────────────────────────

function buildSessions(ctx: Context, placements: Placement[]): PlannedSession[] {
  const items = new Map(ctx.input.items.map((i) => [i.id, i]));
  const out: PlannedSession[] = placements.map((p) => ({
    key: p.unit.key,
    itemId: p.unit.itemId,
    milestoneId: p.unit.milestoneId,
    courseId: p.unit.courseId,
    title: p.unit.title,
    start: toISO(p.start),
    end: toISO(p.end),
    minutes: (p.end - p.start) / MINUTE,
    locked: false,
    bufferReduced: p.bufferReduced,
  }));
  for (const s of ctx.input.existingSessions ?? []) {
    if (!s.locked || fromISO(s.end) <= ctx.now) continue;
    const item: WorkItem | undefined = s.itemId ? items.get(s.itemId) : undefined;
    out.push({
      key: `locked:${s.id}`,
      itemId: s.itemId ?? "",
      courseId: item?.courseId ?? "",
      title: item?.title ?? "Locked block",
      start: s.start,
      end: s.end,
      minutes: (fromISO(s.end) - fromISO(s.start)) / MINUTE,
      locked: true,
      bufferReduced: false,
    });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start) || a.key.localeCompare(b.key));
}

function itemTitle(ctx: Context, itemId: string): string {
  return ctx.input.items.find((i) => i.id === itemId)?.title ?? itemId;
}

function diff(ctx: Context, placements: Placement[]): SessionChange[] {
  if (!ctx.input.existingSessions) return []; // first plan: nothing to compare against
  const fmt = (t: number) => formatLocal(t, ctx.zone);
  const changes: SessionChange[] = [];
  const newByItem = groupBy(
    [...placements].sort((a, b) => a.start - b.start || a.unit.key.localeCompare(b.unit.key)),
    (p) => p.unit.itemId,
  );
  const itemIds = new Set([...ctx.previousByItem.keys(), ...newByItem.keys()]);
  for (const itemId of [...itemIds].sort()) {
    const prev = ctx.previousByItem.get(itemId) ?? [];
    const next = newByItem.get(itemId) ?? [];
    const title = itemTitle(ctx, itemId);
    const itemStillPlanned = ctx.input.items.some((i) => i.id === itemId);
    const unmatchedNext = next.filter((n) => !prev.some((p) => p.start === n.start && p.end === n.end));
    const unmatchedPrev = prev.filter((p) => !next.some((n) => p.start === n.start && p.end === n.end));
    const pairs = Math.min(unmatchedNext.length, unmatchedPrev.length);
    for (let i = 0; i < pairs; i++) {
      const p = unmatchedPrev[i];
      const n = unmatchedNext[i];
      const reason =
        p.end <= ctx.now ? "PREVIOUS_TIME_PASSED" : ctx.busy.some((b) => overlaps(b, p)) ? "PREVIOUS_TIME_UNAVAILABLE" : "REBALANCED";
      const why =
        reason === "PREVIOUS_TIME_PASSED"
          ? "the original session was missed"
          : reason === "PREVIOUS_TIME_UNAVAILABLE"
            ? "that time is now busy"
            : "more urgent work needed that time";
      const resized = p.start === n.start;
      changes.push({
        kind: "moved",
        reason: resized ? "WORK_DONE_OR_REDUCED" : reason,
        itemId,
        previous: { id: p.session.id, start: p.session.start, end: p.session.end },
        next: { key: n.unit.key, start: toISO(n.start), end: toISO(n.end) },
        explanation: resized
          ? `Changed the ${fmt(p.start)} session for "${title}" to ${(n.end - n.start) / MINUTE} minutes to match the work left.`
          : `Moved "${title}" from ${fmt(p.start)} to ${fmt(n.start)} because ${why}.`,
      });
    }
    for (const n of unmatchedNext.slice(pairs)) {
      changes.push({
        kind: "added",
        reason: "NEW_WORK",
        itemId,
        next: { key: n.unit.key, start: toISO(n.start), end: toISO(n.end) },
        explanation: `Added a ${(n.end - n.start) / MINUTE}-minute session for "${title}" on ${fmt(n.start)}.`,
      });
    }
    for (const p of unmatchedPrev.slice(pairs)) {
      if (p.end <= ctx.now && itemStillPlanned) continue; // a past session whose work is no longer needed
      const reason = itemStillPlanned ? "WORK_DONE_OR_REDUCED" : "ITEM_REMOVED";
      changes.push({
        kind: "removed",
        reason,
        itemId,
        previous: { id: p.session.id, start: p.session.start, end: p.session.end },
        explanation:
          reason === "ITEM_REMOVED"
            ? `Removed the ${fmt(p.start)} session: "${title}" is no longer on your list.`
            : `Removed the ${fmt(p.start)} session for "${title}" because less work remains.`,
      });
    }
  }
  return changes;
}

function shortfalls(ctx: Context, leftover: Unit[]): Shortfall[] {
  const byItem = groupBy(leftover, (u) => u.itemId);
  const out: Shortfall[] = [];
  for (const [itemId, units] of byItem) {
    const item = ctx.input.items.find((i) => i.id === itemId)!;
    const unscheduledMinutes = units.reduce((s, u) => s + u.minutes, 0);
    const remainingMinutes = ctx.units.filter((u) => u.itemId === itemId).reduce((s, u) => s + u.minutes, 0);
    out.push({
      itemId,
      title: item.title,
      dueAt: item.dueAt,
      remainingMinutes,
      unscheduledMinutes,
      explanation: `Not enough free time before "${item.title}" is due (${formatLocal(fromISO(item.dueAt), ctx.zone)}): ${unscheduledMinutes} of ${remainingMinutes} minutes could not be scheduled. Free up time, raise your daily limit, or lower the scope.`,
    });
  }
  return out.sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.itemId.localeCompare(b.itemId));
}

/** Free minutes in the horizon, capped per day by the daily maximum (an upper bound on study capacity). */
function capacityUpperBound(ctx: Context): number {
  const min = ctx.input.preferences.minSessionMinutes * MINUTE;
  const perDay = new Map<string, number>();
  for (const f of ctx.baseFree) {
    if (f.end - f.start < min) continue;
    // Attribute each free interval to the local day(s) it covers.
    let t = f.start;
    while (t < f.end) {
      const day = localDateKey(t, ctx.zone);
      let next = t;
      while (next < f.end && localDateKey(next, ctx.zone) === day) next = Math.min(f.end, next + HOUR);
      perDay.set(day, (perDay.get(day) ?? 0) + (next - t) / MINUTE);
      t = next;
    }
  }
  let total = 0;
  for (const [day, mins] of perDay) total += Math.min(mins, Math.max(0, ctx.input.preferences.maxStudyMinutesPerDay - (ctx.lockedByDay.get(day) ?? 0)));
  return Math.round(total);
}

function groupBy<T>(list: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of list) {
    const k = key(x);
    const arr = m.get(k) ?? [];
    arr.push(x);
    m.set(k, arr);
  }
  return m;
}
