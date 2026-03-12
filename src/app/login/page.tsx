"use client";

import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type RoleCode = "ADMIN" | "APPROVER" | "COLLABORATOR";

function getRoleRedirectPath(role: RoleCode): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "APPROVER":
      return "/aprobador";
    case "COLLABORATOR":
      return "/colaborador";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // The page stays thin: credentials are sent to NextAuth, then the
      // session is re-read to determine the role-based redirect.
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setErrorMessage("Correo o contrasena incorrectos.");
        return;
      }

      const session = await getSession();
      const role = session?.user?.role;
      const mustChangePassword = session?.user?.mustChangePassword;

      if (!role) {
        setErrorMessage("No se pudo resolver el rol del usuario autenticado.");
        return;
      }

      if (role === "COLLABORATOR" && mustChangePassword) {
        router.replace("/cambiar-password");
        router.refresh();
        return;
      }

      router.replace(getRoleRedirectPath(role));
      router.refresh();
    } catch {
      setErrorMessage("Ocurrio un error inesperado al iniciar sesion.");
    } finally {
      setIsSubmitting(false);
    }
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
          maxWidth: "28rem",
          border: "1px solid #d6dce5",
          borderRadius: "16px",
          padding: "1.5rem",
          background: "#ffffff",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Iniciar sesion</h1>
        <p style={{ marginTop: "0.75rem", color: "#475569" }}>
          Accede con tu correo y contrasena de desarrollo.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}
        >
          <label style={{ display: "grid", gap: "0.4rem" }}>
            <span>Correo</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "0.75rem 0.875rem",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.4rem" }}>
            <span>Contrasena</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "0.75rem 0.875rem",
              }}
            />
          </label>

          {errorMessage ? (
            <p
              style={{
                margin: 0,
                color: "#b91c1c",
                background: "#fee2e2",
                borderRadius: "10px",
                padding: "0.75rem 0.875rem",
              }}
            >
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              border: 0,
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              background: isSubmitting ? "#94a3b8" : "#0f172a",
              color: "#ffffff",
              cursor: isSubmitting ? "wait" : "pointer",
              fontWeight: 600,
            }}
          >
            {isSubmitting ? "Ingresando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
