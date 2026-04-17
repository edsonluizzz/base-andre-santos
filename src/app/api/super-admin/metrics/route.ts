import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { subWeeks, startOfWeek, endOfWeek, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.isSuperAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [allEstablishments, totalMembers] = await Promise.all([
      db.establishment.findMany({
        select: {
          id: true,
          createdAt: true,
          plan: true,
          stripeStatus: true,
          cancelAtPeriodEnd: true,
          suspended: true,
          nurturingStep: true,
        },
      }),
      db.member.count(),
    ]);

    // Growth: last 8 weeks
    const now = new Date();
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const weekStart = startOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 0 });
      const label = format(weekStart, "dd/MM", { locale: ptBR });
      const count = allEstablishments.filter(
        (e) => new Date(e.createdAt) >= weekStart && new Date(e.createdAt) <= weekEnd
      ).length;
      return { label, count };
    });

    const PRO_PRICE = 29.99;
    const total = allEstablishments.length;
    const free = allEstablishments.filter((e) => e.plan === "FREE").length;
    const trialing = allEstablishments.filter((e) => e.stripeStatus === "trialing").length;
    const proActive = allEstablishments.filter((e) => e.plan === "PRO" && e.stripeStatus === "active").length;
    const pastDue = allEstablishments.filter((e) => e.stripeStatus === "past_due").length;
    const canceled = allEstablishments.filter((e) => e.stripeStatus === "canceled").length;
    const cancelingSoon = allEstablishments.filter((e) => e.cancelAtPeriodEnd).length;
    const suspended = allEstablishments.filter((e) => e.suspended).length;

    const mrr = proActive * PRO_PRICE;
    const arr = mrr * 12;
    const conversionRate = trialing > 0 ? Math.round((proActive / (proActive + trialing + canceled)) * 100) : 0;
    const churnRate = (proActive + canceled) > 0 ? Math.round((canceled / (proActive + canceled)) * 100) : 0;

    // Nurturing funnel
    const nurturingByStep = [0, 1, 2, 3].map((step) => ({
      step,
      count: allEstablishments.filter((e) => e.nurturingStep === step).length,
    }));

    return NextResponse.json({
      summary: { total, free, trialing, proActive, pastDue, canceled, cancelingSoon, suspended, totalMembers },
      financial: { mrr, arr, conversionRate, churnRate },
      growth: weeks,
      nurturing: nurturingByStep,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
