"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  {
    href: "/jobs",
    label: "JOBS",
    isActive: (path: string) => path.startsWith("/jobs"),
  },
  {
    href: "/",
    label: "TRACKER",
    isActive: (path: string) => path === "/" || path.startsWith("/applications"),
  },
  {
    href: "/pilot",
    label: "PILOT",
    isActive: (path: string) => path.startsWith("/pilot"),
  },
  {
    href: "/profile",
    label: "PROFILE",
    isActive: (path: string) =>
      path.startsWith("/profile") || path.startsWith("/onboarding"),
  },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 sm:gap-6">
      {LINKS.map(({ href, label, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`font-mono text-[11px] tracking-[0.18em] transition ${
              active
                ? "text-neutral-950 underline decoration-2 underline-offset-4"
                : "text-neutral-400 hover:text-neutral-950"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
