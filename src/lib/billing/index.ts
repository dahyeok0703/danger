import "server-only";

import { isBillingEnabled, serverEnv } from "@/lib/env.server";
import { PortOneAdapter } from "./portone";
import type { BillingAdapter } from "./types";

/** 결제 어댑터 (키 없으면 null → 결제 '준비중') */
export function getBillingAdapter(): BillingAdapter | null {
  if (!isBillingEnabled()) return null;
  return new PortOneAdapter(serverEnv.PORTONE_API_SECRET!, serverEnv.PORTONE_WEBHOOK_SECRET);
}

/** 클라이언트 빌링키 발급 SDK 에 넘길 공개 설정 (키 없으면 null) */
export function billingClientConfig(): { storeId: string; channelKey: string } | null {
  if (!isBillingEnabled()) return null;
  return {
    storeId: serverEnv.PORTONE_STORE_ID!,
    channelKey: serverEnv.PORTONE_CHANNEL_KEY!,
  };
}

export type { BillingAdapter } from "./types";
