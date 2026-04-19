"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

if (typeof window !== "undefined" && key) {
  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage",
  });
}

function PostHogIdentify() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!key) return;
    if (session?.user?.id) {
      posthog.identify(session.user.id, {
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
        role: session.user.role,
        establishmentId: session.user.establishmentId,
        isSuperAdmin: session.user.isSuperAdmin,
      });
    } else {
      posthog.reset();
    }
  }, [session]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!key) return <>{children}</>;
  return (
    <PHProvider client={posthog}>
      <PostHogIdentify />
      {children}
    </PHProvider>
  );
}
