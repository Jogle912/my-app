import type { AssignmentKind } from "./types";

export const DIFFICULTY = [1, 2, 3, 4, 5].map((v) => ({ value: v, label: v === 1 ? "1 Easy" : v === 5 ? "5 Hard" : String(v) }));

export const KINDS: { value: AssignmentKind; label: string }[] = [
  { value: "HOMEWORK", label: "Homework" },
  { value: "PROJECT", label: "Project" },
  { value: "READING", label: "Reading" },
  { value: "QUIZ", label: "Quiz" },
  { value: "EXAM", label: "Exam" },
  { value: "OTHER", label: "Other" },
];

export const ENERGY = [
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
];
