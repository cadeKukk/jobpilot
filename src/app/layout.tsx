import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
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
  title: "JobPilot — Cade Kukk",
  description:
    "Cade's personal job-search copilot: matched jobs, Fable-5 fit analysis, tailored resumes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-20 border-b border-neutral-50 bg-[#0a0a0a]/95 backdrop-blur print:hidden">
          <div className="mx-auto flex h-14 w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 px-4 sm:px-6">
            <Link href="/" className="flex items-baseline gap-3">
              <span className="text-[15px] font-bold tracking-tight">
                JOBPILOT
              </span>
              <span className="hidden font-mono text-[10px] tracking-[0.22em] text-neutral-500 sm:inline">
                CADE KUKK — PERSONAL BUILD
              </span>
            </Link>
            <NavLinks />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10 print:max-w-none print:p-0">
          {children}
        </main>

        <footer className="border-t border-neutral-800 print:hidden">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-500">
              © 2026 CADE KUKK
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-500">
              POWERED BY FABLE 5
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
