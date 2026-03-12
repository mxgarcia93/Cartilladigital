import type { ReactNode } from "react";
import { LogoutButton } from "../../components/auth/logout-button";
import { DashboardNav } from "../../components/layout/dashboard-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // Shared layout for dashboard pages only.
  // It provides lightweight navigation while each page keeps its own data flow.
  return (
    <div className="dashboard-layout">
      <div className="dashboard-layout-inner">
        <div className="dashboard-topbar">
          <DashboardNav />
          <LogoutButton />
        </div>
        {children}
      </div>
    </div>
  );
}
