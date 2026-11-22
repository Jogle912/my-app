"use client";

import { useActionState, useId, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}
export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900";

/**
 * A form bound to a server action that shows field and form errors. React resets uncontrolled
 * fields after the action completes, so edit forms fall back to their (refreshed) saved values.
 */
export function ActionForm({
  action,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form
      action={formAction}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
        <ul role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {Object.entries(state.fieldErrors).map(([field, msg]) => (
            <li key={field}>{msg}</li>
          ))}
        </ul>
      )}
    </form>
  );
}

export function SubmitButton({ children, variant = "primary" }: { children: ReactNode; variant?: "primary" | "secondary" | "danger" }) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
    danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-300",
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 ${styles}`}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  hint,
  min,
  max,
  step,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  autoComplete?: string;
}) {
  const id = `f-${name}-${useId()}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={min}
        max={max}
        step={step}
        autoComplete={autoComplete}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={inputCls}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  const id = `f-${name}-${useId()}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select id={id} name={name} defaultValue={defaultValue} className={inputCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  const id = `f-${name}-${useId()}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea id={id} name={name} defaultValue={defaultValue} rows={4} className={inputCls} />
    </div>
  );
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DaysField({ legend = "Days", defaultValue = [] }: { legend?: string; defaultValue?: number[] }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {DAY_LABELS.map((d, i) => (
          <label key={d} className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700">
            <input type="checkbox" name="days" value={i + 1} defaultChecked={defaultValue.includes(i + 1)} />
            {d}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
