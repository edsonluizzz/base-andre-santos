"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <h2 className="text-xl font-bold">Algo deu errado</h2>
          <p className="text-sm text-gray-500">O erro foi registrado automaticamente.</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
