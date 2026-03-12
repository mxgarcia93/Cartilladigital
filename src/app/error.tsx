"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
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
        }}
      >
        <h1 style={{ marginTop: 0 }}>Ocurrio un error</h1>
        <p style={{ color: "#475569" }}>
          {error.message || "Ha ocurrido un error inesperado."}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            border: 0,
            borderRadius: "10px",
            padding: "0.85rem 1rem",
            background: "#0f172a",
            color: "#ffffff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Reintentar
        </button>
      </section>
    </main>
  );
}
