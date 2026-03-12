import { AdminCollaboratorDashboard } from "../../../components/admin/admin-collaborator-dashboard";
import { auth } from "../../../lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  // Server-side route protection:
  // unauthenticated users and non-admin users are redirected before rendering.
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "COLLABORATOR" && session.user.mustChangePassword) {
    redirect("/cambiar-password");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return <AdminCollaboratorDashboard />;
}
