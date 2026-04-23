"use client";
import { useState } from "react";

interface Props {
  image?: string | null;
  name?: string | null;
  className?: string;
}

export function UserAvatarImg({ image, name, className = "w-9 h-9" }: Props) {
  const [broken, setBroken] = useState(false);
  const initial = name?.[0]?.toUpperCase() ?? "?";

  if (!image || broken) {
    return (
      <div className={`${className} rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0`}>
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt=""
      referrerPolicy="no-referrer"
      className={`${className} rounded-full object-cover flex-shrink-0`}
      onError={() => setBroken(true)}
    />
  );
}
