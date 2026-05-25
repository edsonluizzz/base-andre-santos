"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-foreground/[0.04] border border-foreground/[0.08] overflow-hidden">
      <span className="flex-1 min-w-0 text-xs text-muted-foreground font-mono truncate">{value}</span>
      <button onClick={handleCopy} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
