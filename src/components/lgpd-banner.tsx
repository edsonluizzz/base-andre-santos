"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "ovile_lgpd_consent";

export function LgpdBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-5">
      <div className="max-w-3xl mx-auto bg-[#0f1629] border border-white/10 rounded-2xl px-5 py-4 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
          Utilizamos cookies e armazenamos dados pessoais para oferecer a melhor experiência.
          Ao continuar, você concorda com nossa{" "}
          <Link href="/privacidade" target="_blank" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
            Política de Privacidade
          </Link>{" "}
          em conformidade com a LGPD.
        </p>
        <button
          onClick={accept}
          className="flex-shrink-0 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 transition-all"
        >
          Entendi e aceito
        </button>
      </div>
    </div>
  );
}
