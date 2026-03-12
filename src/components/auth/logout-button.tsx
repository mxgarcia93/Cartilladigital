"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export function LogoutButton() {
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignOut() {
    setIsSubmitting(true);

    try {
      // Keep the shared header thin: NextAuth owns session termination and
      // redirects the user back to the login screen.
      await signOut({
        callbackUrl: "/login",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="session-actions" aria-live="polite">
      <span className="subtle small-text">
        {status === "loading"
          ? "Cargando sesion..."
          : session?.user?.email ?? "Sin sesion activa"}
      </span>
      <button
        className="ghost-button"
        type="button"
        onClick={() => void handleSignOut()}
        disabled={isSubmitting || status !== "authenticated"}
      >
        {isSubmitting ? "Saliendo..." : "Cerrar sesion"}
      </button>
    </div>
  );
}
