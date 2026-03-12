export default function NotFoundPage() {
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
        <h1 style={{ marginTop: 0 }}>Pagina no encontrada</h1>
        <p style={{ color: "#475569" }}>
          La ruta solicitada no existe o no esta disponible.
        </p>
      </section>
    </main>
  );
}
