import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/server/access/session";

const linkCls = "rounded-md px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800";

/** Reads the session, so it must render inside <Suspense>. */
export async function UserNav() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Link href="/demo" className={linkCls}>
          Demo
        </Link>
        <Link href="/signin" className={linkCls}>
          Sign in
        </Link>
        <Link href="/signup" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
          Create account
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Link href="/dashboard" className={linkCls}>
        Today
      </Link>
      <Link href="/plan" className={linkCls}>
        Plan
      </Link>
      <Link href="/courses" className={linkCls}>
        Courses
      </Link>
      <Link href="/settings/schedule" className={linkCls}>
        My week
      </Link>
      <form action={signOut}>
        <button type="submit" className={linkCls} title={`Signed in as ${user.email}`}>
          Sign out
        </button>
      </form>
    </div>
  );
}
