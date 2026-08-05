"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, UserRound } from "lucide-react";

const LINKS = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    isActive: (path: string) =>
      path === "/" || path.startsWith("/applications"),
  },
  {
    href: "/jobs",
    label: "Find jobs",
    icon: Search,
    isActive: (path: string) => path.startsWith("/jobs"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: UserRound,
    isActive: (path: string) =>
      path.startsWith("/profile") || path.startsWith("/onboarding"),
  },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map(({ href, label, icon: Icon, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition ${
              active
                ? "bg-slate-100 font-medium text-slate-900"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
