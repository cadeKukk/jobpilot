import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Compass, Plus } from "lucide-react";
import { BottomNav, SidebarNav } from "@/components/nav-links";
import { SignOutButton } from "@/components/sign-out-button";
import { getOptionalUser } from "@/lib/user";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobPilot",
  description:
    "AI job-search copilot: track applications, tailor resumes, and find matching jobs.",
};

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
        <Compass className="h-4.5 w-4.5" />
      </span>
      JobPilot
    </Link>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getOptionalUser();

  if (!user) {
    return (
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur print:hidden">
            <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
              <Logo />
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500"
                >
                  Get started
                </Link>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
            {children}
          </main>
        </body>
      </html>
    );
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-slate-200 bg-white px-4 py-5 md:flex print:hidden">
          <Logo />

          <div className="mt-8 flex-1">
            <SidebarNav />
            <Link
              href="/applications/new"
              className="mt-6 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Add application
            </Link>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="truncate px-1 text-xs text-slate-400" title={user.email}>
              {user.email}
            </p>
            <div className="mt-1 -ml-1">
              <SignOutButton />
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col md:pl-60">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur md:hidden print:hidden">
            <Logo />
            <SignOutButton />
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
            {children}
          </main>
        </div>

        {/* Mobile bottom tabs */}
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden print:hidden">
          <BottomNav />
        </nav>
      </body>
    </html>
  );
}
