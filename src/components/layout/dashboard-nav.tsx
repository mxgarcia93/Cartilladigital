"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Admin" },
  { href: "/aprobador", label: "Aprobador" },
  { href: "/colaborador", label: "Colaborador" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="dashboard-nav" aria-label="Dashboard navigation">
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? "dashboard-link is-active" : "dashboard-link"}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
