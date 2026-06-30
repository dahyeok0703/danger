/**
 * 결제 어댑터 인터페이스 (PG 의존성 분리).
 * 다른 PG(토스/스트라이프 등)로 교체하려면 이 인터페이스만 구현하면 된다.
 */

export interface ChargeInput {
  paymentId: string; // 우리가 만든 멱등 결제 ID
  billingKey: string;
  amountKrw: number;
  orderName: string;
  customerKey: string;
}

export interface ChargeResult {
  ok: boolean;
  paymentId: string;
  status: string;
  raw: unknown;
  error?: string;
}

export interface WebhookEvent {
  /** 멱등 키 (재전송 무시용) */
  id: string;
  type: string;
  paymentId?: string;
  raw: unknown;
}

export interface BillingAdapter {
  /** 빌링키로 즉시 결제(정기결제 1회분) */
  chargeWithBillingKey(input: ChargeInput): Promise<ChargeResult>;
  /** 웹훅 서명 검증 + 파싱. 실패 시 null. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent | null>;
}
