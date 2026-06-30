import type { Metadata } from "next";

import { APP_NAME, SUPPORT_EMAIL } from "@/lib/constants";
import { LegalLayout, type LegalSection } from "@/components/site/legal-layout";

export const metadata: Metadata = {
  title: "환불정책",
  description: `${APP_NAME} 유료 구독 환불정책`,
  robots: { index: true, follow: true },
};

const SECTIONS: LegalSection[] = [
  {
    heading: "1. 구독 결제 방식",
    body: [
      "프로 플랜은 월 단위 정기결제(자동 청구) 방식입니다. 결제일에 다음 1개월 이용요금이 청구됩니다.",
      "이용자는 서비스 내 결제 화면에서 언제든지 구독을 해지할 수 있으며, 해지 시 현재 결제 주기가 끝날 때까지 프로 기능을 이용한 뒤 무료 플랜으로 전환됩니다.",
    ],
  },
  {
    heading: "2. 청약철회 및 환불",
    body: [
      "「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련 법령에 따라 청약철회가 가능합니다.",
      "결제 후 서비스(프로 기능)를 실질적으로 사용하지 않은 경우, 결제일로부터 7일 이내 청약철회를 요청하면 전액 환불합니다.",
      "이미 서비스를 사용한 경우, 콘텐츠·디지털 서비스의 특성상 사용 사실이 확인되면 청약철회가 제한될 수 있습니다. 이 경우 사용 일수 등을 고려해 환불 여부·금액을 안내합니다.",
    ],
  },
  {
    heading: "3. 회사 귀책 사유로 인한 환불",
    body: [
      "회사의 귀책으로 서비스를 정상적으로 제공하지 못한 경우, 해당 기간에 상응하는 금액을 환불합니다.",
    ],
  },
  {
    heading: "4. 환불 처리 절차",
    body: [
      `환불 요청은 ${SUPPORT_EMAIL} 로 접수합니다. 본인 확인 및 결제 내역 확인 후 처리합니다.`,
      "환불은 원칙적으로 결제 수단과 동일한 방법으로 이루어지며, 결제대행사(PG) 처리 기간에 따라 영업일 기준 수일이 소요될 수 있습니다.",
    ],
  },
  {
    heading: "5. 유의사항",
    body: [
      "본 정책은 관련 법령에 우선하지 않으며, 법령과 상충하는 경우 법령이 우선합니다.",
      "구체적인 환불 기준은 출시 전 결제대행사 정책 및 법률 검토를 반영하여 확정합니다.",
    ],
  },
];

export default function RefundPage() {
  return (
    <LegalLayout
      title="환불정책"
      effectiveDate="(시행 예정 — 법률 검토 후 확정)"
      intro="유료 구독의 결제·해지·환불 기준을 안내합니다."
      sections={SECTIONS}
    />
  );
}
