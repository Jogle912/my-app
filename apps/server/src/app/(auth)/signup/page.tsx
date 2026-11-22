import Link from "next/link";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { signUp } from "../actions";

export const metadata = { title: "Create account · StudyPilot" };

export default function SignUpPage() {
  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <ActionForm action={signUp} className="flex flex-col gap-4" aria-label="Create account">
        <Field label="Name" name="name" required autoComplete="name" />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Password" name="password" type="password" required autoComplete="new-password" hint="At least 10 characters." />
        <SubmitButton>Create account</SubmitButton>
      </ActionForm>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Sign in
        </Link>
      </p>
    </section>
  );
}
