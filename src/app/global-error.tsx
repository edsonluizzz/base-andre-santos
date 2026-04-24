"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "16px" }}>
          <h2>Algo deu errado</h2>
          <button onClick={() => reset()} style={{ padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}>Tentar novamente</button>
        </div>
      </body>
    </html>
  );
}
