import type { ReactNode } from "react";

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {children && <div className="mt-1 text-slate-600 dark:text-slate-300">{children}</div>}
    </header>
  );
}

export function Card({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  const headingId = id ?? `card-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 id={headingId} className="mb-4 text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export const Loading = () => (
  <p role="status" className="text-slate-500">
    Loading…
  </p>
);
