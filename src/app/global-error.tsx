"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#0a1220", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "16px", fontFamily: "sans-serif", color: "#fff" }}>
        <p style={{ fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase", color: "rgba(212,175,55,0.6)", margin: 0 }}>Base de Apoio · 2026</p>
        <h2 style={{ margin: 0, fontSize: "24px" }}>Algo deu errado</h2>
        <button
          onClick={() => reset()}
          style={{ padding: "10px 20px", borderRadius: "10px", background: "#d4af37", color: "#0a1220", fontWeight: 600, border: "none", cursor: "pointer", fontSize: "14px" }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
