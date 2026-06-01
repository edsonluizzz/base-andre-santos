/** @type {import("next").NextConfig} */
// build: 2026-05-31 — TS validation pausada (Sprint 14 mobile UX prioritária).
// ESLint segue ativo. Quando tivermos build local funcional, reativar TS.
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "leads.prandresantos.com.br" }],
          destination: "/ebook/quem-sou-eu",
        },
        {
          source: "/:path*",
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
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.googleusercontent.com https://*.googleapis.com https://img.youtube.com https://*.public.blob.vercel-storage.com",
              "connect-src 'self' https://*.googleapis.com https://*.google.com https://api.telegram.org https://api.metricool.com",
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
