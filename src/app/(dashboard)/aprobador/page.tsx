import { ApproverBalanceSearch } from "../../../components/approver/approver-balance-search";
import { auth } from "../../../lib/auth";
import { redirect } from "next/navigation";

export default async function ApproverPage() {
  // Server-side route protection:
  // unauthenticated users and non-approver users are redirected before rendering.
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "COLLABORATOR" && session.user.mustChangePassword) {
    redirect("/cambiar-password");
  }

  if (session.user.role !== "APPROVER") {
    redirect("/login");
  }

  return <ApproverBalanceSearch />;
}
