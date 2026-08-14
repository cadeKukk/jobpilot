"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  Search,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";

const LINKS: {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (path: string) => boolean;
}[] = [
  {
    href: "/jobs",
    label: "Jobs",
    icon: Search,
    isActive: (path) => path.startsWith("/jobs"),
  },
  {
    href: "/",
    label: "Tracker",
    icon: LayoutDashboard,
    isActive: (path) => path === "/" || path.startsWith("/applications"),
  },
  {
    href: "/pilot",
    label: "Pilot",
    icon: Sparkles,
    isActive: (path) => path.startsWith("/pilot"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: UserRound,
    isActive: (path) =>
      path.startsWith("/profile") || path.startsWith("/onboarding"),
  },
];

// Vertical navigation for the desktop sidebar.
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map(({ href, label, icon: Icon, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Icon
              className={`h-[18px] w-[18px] ${active ? "text-emerald-600" : "text-slate-400"}`}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// Bottom tab bar for mobile.
export function BottomNav() {
  const pathname = usePathname();
  const tabs = [
    ...LINKS,
    {
      href: "/applications/new",
      label: "Add",
      icon: Plus,
      isActive: (path: string) => path.startsWith("/applications/new"),
    },
  ];

  return (
    <div className="grid grid-cols-5">
      {tabs.map(({ href, label, icon: Icon, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
              active ? "text-emerald-600" : "text-slate-500"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
