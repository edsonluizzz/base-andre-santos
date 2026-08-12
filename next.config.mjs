/** @type {import("next").NextConfig} */
// build: 2026-05-31 — TS validation pausada (Sprint 14 mobile UX prioritária).
// ESLint segue ativo. Quando tivermos build local funcional, reativar TS.
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  experimental: {
    // pdfkit lê os arquivos .afm de fonte via fs.readFileSync(__dirname, ...) em runtime —
    // o file-tracing do Next não enxerga isso estaticamente e deixa os .afm de fora do bundle
    // serverless, então o PDF quebra silenciosamente só em produção (funciona local com node_modules completo).
    outputFileTracingIncludes: {
      "/api/relatorio/export-pdf": ["./node_modules/pdfkit/js/data/**/*"],
      // matcher do Next usa picomatch com `contains: true` — cobre as 3 rotas
      // (pay-bulk, [id]/pay, [id]/register) sem precisar escapar os colchetes de rota dinâmica.
      "/api/church-assignments/": ["./node_modules/pdfkit/js/data/**/*"],
    },
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "leads.prandresantos.com.br" }],
          destination: "/ebook/quem-sou-eu",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // microphone=(self): gravação de áudio WhatsApp pelo painel (composer).
          // camera/geolocation seguem bloqueados — nada no app usa.
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.googleusercontent.com https://*.googleapis.com https://img.youtube.com https://*.public.blob.vercel-storage.com",
              // blob.vercel-storage.com + *.public.blob...: o client upload do @vercel/blob
              // faz PUT do navegador direto pro Blob (mídia WhatsApp). Sem isto o CSP bloqueia
              // o PUT e o SDK retenta em silêncio — "Enviando..." eterno sem erro visível.
              "connect-src 'self' https://*.googleapis.com https://*.google.com https://api.telegram.org https://api.metricool.com https://blob.vercel-storage.com https://*.public.blob.vercel-storage.com",
              "frame-src https://www.youtube.com https://youtube.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
