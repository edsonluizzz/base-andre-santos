"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Star, Users, Copy, Check, ChevronRight, MapPin, BarChart2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState("");

  useEffect(() => {
    if (session?.user?.id) {
      setReferralLink(`${window.location.origin}/cadastro?ref=${session.user.id}`);
    }
  }, [session?.user?.id]);

  function copyLink() {
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const firstName = session?.user?.name?.split(" ")[0] ?? "colaborador";

  const steps = [
    {
      icon: Users,
      title: "Cadastre apoiadores",
      desc: "Adicione pessoas da sua rede na lista de colaboradores ou compartilhe seu link para elas se cadastrarem.",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: Star,
      title: "Suba de nível",
      desc: "Quanto mais pessoas ativas você cadastrar, maior o seu nível: Apoiador → Ativista → Líder de Célula.",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    {
      icon: MapPin,
      title: "Acompanhe o Mapa de Apoio",
      desc: "Veja em tempo real as lideranças por município e o status de apoio de cada uma.",
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      icon: BarChart2,
      title: "Consulte o Relatório",
      desc: "Analise a cobertura por município e exporte os dados em CSV para estratégia.",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
  ];

  return (
    <div className="max-w-lg space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 pt-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center">
            <Star className="w-8 h-8 text-primary fill-primary/30" />
          </div>
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold gradient-title">Bem-vindo, {firstName}!</h1>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Você agora faz parte do Ovile Eleitoral.<br />
            Veja como contribuir com a base de apoio.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-4 border border-white/[0.08] flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Link de convite */}
      {referralLink && (
        <div className="glass-card rounded-2xl p-5 border border-primary/20 bg-primary/[0.04] space-y-3">
          <div>
            <p className="font-semibold text-sm text-foreground">Seu link de cadastro</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compartilhe com pessoas que queiram apoiar André Santos. Elas ficam vinculadas à sua célula.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 bg-white/[0.05] border border-white/[0.1]">
            <span className="flex-1 text-xs text-muted-foreground font-mono truncate">{referralLink}</span>
            <button onClick={copyLink} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/minha-celula" className="flex-1">
          <Button className="w-full bg-primary text-primary-foreground gap-2">
            Ver Minha Célula <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
        <Link href="/colaboradores" className="flex-1">
          <Button variant="outline" className="w-full gap-2">
            <Users className="w-4 h-4" /> Cadastrar alguém
          </Button>
        </Link>
      </div>
    </div>
  );
}
