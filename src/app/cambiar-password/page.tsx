import { redirect } from "next/navigation";
import { ChangePasswordForm } from "../../components/auth/change-password-form";
import { auth } from "../../lib/auth";

export default async function ChangePasswordPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "COLLABORATOR") {
    redirect(
      session.user.role === "ADMIN"
        ? "/admin"
        : session.user.role === "APPROVER"
          ? "/aprobador"
          : "/colaborador",
    );
  }

  if (!session.user.mustChangePassword) {
    redirect("/colaborador");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "32rem",
          border: "1px solid #d6dce5",
          borderRadius: "16px",
          padding: "1.5rem",
          background: "#ffffff",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Cambiar contrasena</h1>
        <p style={{ marginTop: "0.75rem", color: "#475569" }}>
          Debes cambiar tu contrasena temporal antes de continuar.
        </p>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
