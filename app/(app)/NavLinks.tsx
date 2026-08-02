"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NavLinks.module.css";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <rect x="1" y="1" width="6" height="6" rx="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/rounds",
    label: "Rounds",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.4" fill="none" aria-hidden>
        <line x1="2" y1="4" x2="14" y2="4" />
        <line x1="2" y1="8" x2="14" y2="8" />
        <line x1="2" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
  {
    href: "/compare",
    label: "Compare",
    hidden: true, // Phase 3 — not built yet
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <rect x="2" y="6" width="4" height="8" rx="1" />
        <rect x="10" y="2" width="4" height="12" rx="1" />
      </svg>
    ),
  },
  {
    href: "/hole-analysis",
    label: "Hole analysis",
    hidden: true, // Phase 4 — not built yet
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.4" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="6" />
        <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/courses",
    label: "Courses",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.4" fill="none" aria-hidden>
        <line x1="4" y1="1.5" x2="4" y2="14.5" />
        <path d="M4 2.5 L12 4.5 L4 6.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav>
      {NAV_ITEMS.filter((item) => !item.hidden).map(({ href, label, icon }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={active ? styles.navItemActive : styles.navItem}
          >
            {icon}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
