"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No se pudo cambiar la contrasena.",
        );
      }

      router.replace("/colaborador");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ocurrio un error al cambiar la contrasena.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}
    >
      <label style={{ display: "grid", gap: "0.4rem" }}>
        <span>Contrasena actual</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          required
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            padding: "0.75rem 0.875rem",
          }}
        />
      </label>

      <label style={{ display: "grid", gap: "0.4rem" }}>
        <span>Nueva contrasena</span>
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          required
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            padding: "0.75rem 0.875rem",
          }}
        />
      </label>

      <label style={{ display: "grid", gap: "0.4rem" }}>
        <span>Confirmar nueva contrasena</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
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
        {isSubmitting ? "Guardando..." : "Cambiar contrasena"}
      </button>
    </form>
  );
}
