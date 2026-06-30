import "server-only";

import crypto from "node:crypto";

import type { BillingAdapter, ChargeInput, ChargeResult, WebhookEvent } from "./types";

const API_BASE = "https://api.portone.io";

/**
 * PortOne V2 REST 어댑터.
 * - 빌링키 발급은 클라이언트(PortOne SDK)에서 수행하고, 서버는 빌링키로 결제만 한다.
 * - 웹훅은 Standard Webhooks 서명(HMAC-SHA256) 검증.
 */
export class PortOneAdapter implements BillingAdapter {
  constructor(
    private readonly apiSecret: string,
    private readonly webhookSecret: string | undefined,
  ) {}

  async chargeWithBillingKey(input: ChargeInput): Promise<ChargeResult> {
    try {
      const res = await fetch(
        `${API_BASE}/payments/${encodeURIComponent(input.paymentId)}/billing-key`,
        {
          method: "POST",
          headers: {
            Authorization: `PortOne ${this.apiSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            billingKey: input.billingKey,
            orderName: input.orderName,
            customer: { id: input.customerKey },
            amount: { total: input.amountKrw },
            currency: "KRW",
          }),
        },
      );
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          paymentId: input.paymentId,
          status: "failed",
          raw,
          error: (raw as { message?: string }).message ?? `HTTP ${res.status}`,
        };
      }
      // 동기 응답이면 결제 상태가 들어오고, 비동기면 웹훅으로 확정된다.
      const status =
        (raw as { payment?: { status?: string } }).payment?.status ?? "PAID";
      return { ok: true, paymentId: input.paymentId, status, raw };
    } catch (err) {
      return {
        ok: false,
        paymentId: input.paymentId,
        status: "failed",
        raw: null,
        error: err instanceof Error ? err.message : "charge error",
      };
    }
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent | null> {
    if (!this.webhookSecret) return null;
    const id = headers.get("webhook-id");
    const timestamp = headers.get("webhook-timestamp");
    const signatureHeader = headers.get("webhook-signature");
    if (!id || !timestamp || !signatureHeader) return null;

    // 비밀키: "whsec_" 접두 후 base64
    const secret = this.webhookSecret.startsWith("whsec_")
      ? this.webhookSecret.slice(6)
      : this.webhookSecret;
    const key = Buffer.from(secret, "base64");
    const signedContent = `${id}.${timestamp}.${rawBody}`;
    const expected = crypto.createHmac("sha256", key).update(signedContent).digest("base64");

    // 헤더는 "v1,<sig> v1,<sig2>" 형태일 수 있음 — 하나라도 일치하면 통과
    const candidates = signatureHeader.split(" ").map((p) => p.split(",").pop() ?? "");
    const ok = candidates.some((sig) => safeEqual(sig, expected));
    if (!ok) return null;

    try {
      const parsed = JSON.parse(rawBody) as {
        type?: string;
        data?: { paymentId?: string };
      };
      return {
        id,
        type: parsed.type ?? "unknown",
        paymentId: parsed.data?.paymentId,
        raw: parsed,
      };
    } catch {
      return null;
    }
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
