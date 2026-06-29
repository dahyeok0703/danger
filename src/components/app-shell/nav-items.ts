import type { Route } from "next";
import { ClipboardCheck, FileText, LayoutDashboard, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: Route;
  label: string;
  /** 비전문가용 한 줄 설명 */
  hint: string;
  icon: LucideIcon;
}

/** 앱 주 메뉴 — 사이드바(데스크톱)와 하단 탭(모바일)이 공유한다. */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "홈",
    hint: "오늘 할 일과 현황을 한눈에",
    icon: LayoutDashboard,
  },
  {
    href: "/assessments",
    label: "위험성평가",
    hint: "우리 일터의 위험을 찾고 기록",
    icon: ClipboardCheck,
  },
  {
    href: "/records",
    label: "기록·문서",
    hint: "작성한 평가와 서류 보관함",
    icon: FileText,
  },
  {
    href: "/settings",
    label: "설정",
    hint: "사업장 정보와 직원 관리",
    icon: Settings,
  },
];
