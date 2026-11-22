import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { signIn } from "../actions";

export const metadata = { title: "Sign in · StudyPilot" };

async function NextField({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <input type="hidden" name="next" value={next ?? "/dashboard"} />;
}

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <ActionForm action={signIn} className="flex flex-col gap-4" aria-label="Sign in">
        <Suspense>
          <NextField searchParams={searchParams as Promise<{ next?: string }>} />
        </Suspense>
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Password" name="password" type="password" required autoComplete="current-password" />
        <SubmitButton>Sign in</SubmitButton>
      </ActionForm>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        New here?{" "}
        <Link href="/signup" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Create an account
        </Link>
      </p>
    </section>
  );
}
