import { CollaboratorBalanceLedger } from "../../../components/collaborator/collaborator-balance-ledger";
import { auth } from "../../../lib/auth";
import { redirect } from "next/navigation";

export default async function CollaboratorPage() {
  // Server-side route protection:
  // unauthenticated users and non-collaborator users are redirected before rendering.
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "COLLABORATOR" && session.user.mustChangePassword) {
    redirect("/cambiar-password");
  }

  if (session.user.role !== "COLLABORATOR") {
    redirect("/login");
  }

  return <CollaboratorBalanceLedger />;
}
