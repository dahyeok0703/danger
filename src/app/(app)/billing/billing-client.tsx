"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { activateSubscription, cancelSubscription, resumeSubscription } from "./actions";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    PortOne?: {
      requestIssueBillingKey(req: {
        storeId: string;
        channelKey: string;
        billingKeyMethod: string;
        issueId: string;
        issueName: string;
        customer?: { customerId?: string };
      }): Promise<{ code?: string | null; message?: string; billingKey?: string } | undefined>;
    };
  }
}

export type BillingClientProps = {
  /** 결제 기능 활성(PortOne 키 존재) */
  enabled: boolean;
  config: { storeId: string; channelKey: string } | null;
  customerKey: string;
  isPro: boolean;
  cancelAtPeriodEnd: boolean;
  pastDue: boolean;
};

/**
 * 결제 액션 영역.
 * - 빌링키 발급은 PortOne 브라우저 SDK 로 클라이언트에서 수행하고,
 *   발급된 빌링키를 server action 으로 넘겨 서버가 결제·구독을 처리한다.
 * ★ 빌링키/카드정보는 서버로만 전달되며 화면·로그에 노출하지 않는다.
 */
export function BillingClient(props: BillingClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [issuing, setIssuing] = useState(false);

  // 결제 기능이 꺼져 있으면 '준비중' 안내만
  if (!props.enabled || !props.config) {
    return (
      <Button disabled className="w-full" variant="outline">
        결제 준비중
      </Button>
    );
  }

  const config = props.config;

  async function subscribe() {
    const sdk = window.PortOne;
    if (!sdk) {
      toast.error("결제 모듈을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setIssuing(true);
    try {
      const res = await sdk.requestIssueBillingKey({
        storeId: config.storeId,
        channelKey: config.channelKey,
        billingKeyMethod: "CARD",
        issueId: crypto.randomUUID(),
        issueName: "안전지도 프로 구독",
        customer: { customerId: props.customerKey },
      });
      if (!res || res.code != null || !res.billingKey) {
        toast.error(res?.message ?? "결제 수단 등록이 취소되었어요.");
        return;
      }
      const billingKey = res.billingKey;
      startTransition(async () => {
        const r = await activateSubscription({ billingKey });
        if (r.ok) {
          toast.success("프로 구독이 시작되었어요. 감사합니다!");
          router.refresh();
        } else {
          toast.error(r.error);
        }
      });
    } catch {
      toast.error("결제 처리 중 문제가 발생했어요.");
    } finally {
      setIssuing(false);
    }
  }

  function doCancel() {
    startTransition(async () => {
      const r = await cancelSubscription();
      if (r.ok) {
        toast.success("이번 결제주기가 끝나면 무료로 전환돼요.");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function doResume() {
    startTransition(async () => {
      const r = await resumeSubscription();
      if (r.ok) {
        toast.success("구독을 계속 이용해요.");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <>
      <Script src="https://cdn.portone.io/v2/browser-sdk.js" strategy="afterInteractive" />
      {!props.isPro ? (
        <Button className="w-full" onClick={subscribe} disabled={issuing || pending}>
          {issuing || pending ? "처리 중…" : "프로 구독하기"}
        </Button>
      ) : props.cancelAtPeriodEnd ? (
        <Button className="w-full" variant="outline" onClick={doResume} disabled={pending}>
          {pending ? "처리 중…" : "구독 계속하기"}
        </Button>
      ) : (
        <div className="space-y-2">
          {props.pastDue ? (
            <Button className="w-full" onClick={subscribe} disabled={issuing || pending}>
              {issuing || pending ? "처리 중…" : "결제 수단 다시 등록"}
            </Button>
          ) : null}
          <Button
            className="w-full"
            variant="outline"
            onClick={doCancel}
            disabled={pending}
          >
            {pending ? "처리 중…" : "구독 해지"}
          </Button>
        </div>
      )}
    </>
  );
}
