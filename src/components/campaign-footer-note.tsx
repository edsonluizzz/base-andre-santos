"use client";

import { useSyncExternalStore } from "react";
import {
  candidateStatusLabel,
  CAMPAIGN_ENTITY,
  subscribeCampaignPeriod,
  getCampaignPeriodServerSnapshot,
  getCampaignPeriodClientSnapshot,
} from "@/lib/campaign-identification";

type Props = {
  className?: string;
  lineClassName?: string;
};

/** Identificação legal exigida a partir do início da propaganda eleitoral (16/08/2026). */
export function CampaignFooterNote({ className, lineClassName }: Props) {
  const official = useSyncExternalStore(
    subscribeCampaignPeriod,
    getCampaignPeriodClientSnapshot,
    getCampaignPeriodServerSnapshot,
  );

  return (
    <div className={className}>
      <p className={lineClassName}>
        © {new Date().getFullYear()} André Santos — {candidateStatusLabel(official)}
      </p>
      {official && (
        <p className={lineClassName}>
          Material de campanha eleitoral · {CAMPAIGN_ENTITY.razaoSocial} · CNPJ {CAMPAIGN_ENTITY.cnpj}
        </p>
      )}
    </div>
  );
}
