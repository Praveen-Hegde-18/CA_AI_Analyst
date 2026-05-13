"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Video } from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Analyze Video", icon: Video },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[200px] shrink-0 flex-col border-r border-[rgba(255,255,255,0.07)] bg-surface">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 2L3 7v6l7 5 7-5V7L10 2z"
              fill="#0a0a0a"
              stroke="#0a0a0a"
              strokeWidth="1"
            />
            <path
              d="M7 10l2 2 4-4"
              stroke="#E8D600"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-frama text-sm font-black text-foreground">
            Cricket AI
          </span>
          <span className="font-machina text-[10px] font-[800] uppercase tracking-widest text-brand">
            Analyst
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/" || pathname === "/analyze"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150",
                isActive
                  ? "bg-[rgba(232,214,0,0.1)] text-brand"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              )}
            >
              <Icon
                size={16}
                className={clsx(isActive ? "text-brand" : "text-muted")}
              />
              <span className="font-machina font-[800] text-xs uppercase tracking-wide">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
