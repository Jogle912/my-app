import { HOUR, MINUTE } from "./intervals";
import { fromISO } from "./time";
import type { Course, Preferences, WorkItem } from "./types";

/** A schedulable chunk of work. */
export interface Unit {
  key: string;
  itemId: string;
  milestoneId?: string;
  courseId: string;
  title: string;
  minutes: number;
  /** Earliest start (ms). */
  release: number;
  /** Target finish including the deadline buffer (ms). */
  deadline: number;
  /** Absolute latest finish: the real due time (ms). */
  hardDeadline: number;
  /** Units of the same item with a higher `seq` must start after lower ones end (except exams). */
  seq: number;
  ordered: boolean;
  priority: number;
  difficulty: number;
}

/** Splits `total` minutes into near-equal chunks no longer than `preferred`, on a 5-minute grid. */
export function splitMinutes(total: number, preferred: number, min: number): number[] {
  if (total <= 0) return [];
  if (total <= Math.max(preferred, min)) return [roundUp5(total)];
  const n = Math.ceil(total / preferred);
  const base = roundUp5(total / n);
  const out: number[] = [];
  let left = roundUp5(total);
  for (let i = 0; i < n && left > 0; i++) {
    const m = Math.min(base, left);
    out.push(m);
    left -= m;
  }
  // Merge a tiny tail into the previous chunk rather than scheduling a too-short session.
  if (out.length > 1 && out[out.length - 1] < min) out[out.length - 2] += out.pop()!;
  return out;
}

const roundUp5 = (m: number) => Math.max(5, Math.ceil(m / 5) * 5);

/** Exams are reviewed up to one hour before they start, regardless of the general buffer. */
const EXAM_REVIEW_CUTOFF = HOUR;

export function decompose(
  item: WorkItem,
  course: Course | undefined,
  prefs: Preferences,
  now: number,
  lockedMinutes: number,
): Unit[] {
  const due = fromISO(item.dueAt, `dueAt of ${item.id}`);
  const availableFrom = item.availableFrom ? fromISO(item.availableFrom) : now;
  const releaseBase = Math.max(now, availableFrom);
  const priority = clamp(item.priority ?? 3, 1, 5);
  const difficulty = clamp(course?.difficulty ?? 3, 1, 5);
  const isExam = item.kind === "exam";
  const deadline = isExam ? due - EXAM_REVIEW_CUTOFF : due - prefs.deadlineBufferHours * HOUR;

  // Remaining work per step, after subtracting time already done and time in locked sessions.
  const steps = (item.milestones?.length
    ? item.milestones.map((m) => ({ id: m.id, title: `${item.title}: ${m.title}`, left: m.estimatedMinutes - (m.completedMinutes ?? 0) }))
    : [{ id: undefined as string | undefined, title: item.title, left: item.estimatedMinutes - (item.completedMinutes ?? 0) }]
  ).map((s) => ({ ...s, left: Math.max(0, s.left) }));
  let credit = lockedMinutes;
  for (const s of steps) {
    const used = Math.min(credit, s.left);
    s.left -= used;
    credit -= used;
  }

  const units: Unit[] = [];
  let seq = 0;
  for (const s of steps) {
    for (const minutes of splitMinutes(s.left, prefs.preferredSessionMinutes, prefs.minSessionMinutes)) {
      units.push({
        key: `${item.id}:${s.id ?? "work"}:${seq}`,
        itemId: item.id,
        milestoneId: s.id,
        courseId: item.courseId,
        title: isExam ? `Review for ${item.title}` : s.title,
        minutes,
        release: releaseBase,
        deadline,
        hardDeadline: due,
        seq,
        ordered: !isExam,
        priority,
        difficulty,
      });
      seq++;
    }
  }

  if (isExam) spaceExamReview(units, prefs.examReviewOffsetsDays, releaseBase, due);
  return units;
}

/** Spaced repetition: the k-th review unit opens on its own day before the exam (e.g. D-7, D-4, D-2, D-1). */
function spaceExamReview(units: Unit[], offsetsDays: number[], releaseBase: number, examAt: number): void {
  const offsets = [...offsetsDays].sort((a, b) => b - a);
  const n = units.length;
  units.forEach((u, i) => {
    // Use the offsets closest to the exam; extra units share the earliest offset.
    const idx = Math.max(0, offsets.length - n + i);
    const days = offsets[Math.min(idx, offsets.length - 1)] ?? 0;
    u.release = Math.max(releaseBase, examAt - days * 24 * HOUR);
  });
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export const minutesToMs = (m: number) => m * MINUTE;
