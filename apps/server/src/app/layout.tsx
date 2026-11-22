import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { UserNav } from "@/components/UserNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyPilot",
  description: "Turn deadlines into a study plan you can actually follow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-slate-900">
          Skip to content
        </a>
        <header className="border-b border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
          <nav aria-label="Main" className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              StudyPilot
            </Link>
            <Suspense fallback={null}>
              <UserNav />
            </Suspense>
          </nav>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
