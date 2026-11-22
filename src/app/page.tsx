import Link from "next/link";

export default function Home() {
  return (
    <section className="flex flex-col items-start gap-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Turn deadlines into a plan you can actually follow.</h1>
      <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">
        StudyPilot builds a realistic weekly study schedule from your courses, adapts when life gets in the way, and tells you
        honestly when there isn&apos;t enough time.
      </p>
      <Link
        href="/demo"
        className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Try with demo data
      </Link>
      <p className="text-sm text-slate-500 dark:text-slate-400">Canvas connection and sign-in are coming in a later milestone.</p>
    </section>
  );
}
