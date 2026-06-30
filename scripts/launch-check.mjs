#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  출시 가능 자가점검 (Launch readiness self-check)
//
//  launch.config.json 의 게이트 + 저장소 신호를 점검해 GO / NO-GO 를 출력한다.
//  ★ 전문가 검수(expertReviewComplete) 등 blocker 가 미완료이면 '출시 불가'.
//  NO-GO 면 종료 코드 1 (CI 게이트로 사용 가능).
// ─────────────────────────────────────────────────────────────
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};
const mark = (ok) => (ok ? `${C.green}✔${C.reset}` : `${C.red}✘${C.reset}`);

// ── 1) 수동 게이트 (launch.config.json) ──────────────────────────
let gates = {};
try {
  gates = JSON.parse(read("launch.config.json")).gates ?? {};
} catch {
  console.error(`${C.red}launch.config.json 을 읽을 수 없습니다.${C.reset}`);
  process.exit(1);
}

// blocker = true 여야 출시 가능. label + 설명.
const GATES = [
  ["expertReviewComplete", true, "★ 산출물(PDF) 양식 산업안전 전문가 검수 완료"],
  ["legalReviewComplete", true, "약관·개인정보·환불정책 변호사 검토 완료"],
  ["paymentLiveTested", true, "결제(PortOne) 실거래 테스트 완료"],
  ["demoDataRemoved", true, "프로덕션 DB 데모/시드 데이터 제거"],
  ["marginQuotaVerified", true, "플랜별 마진·AI 쿼터 검증(cogs)"],
  ["productionEnvConfigured", true, "프로덕션 환경변수(Vercel/Supabase) 설정"],
  ["cronRegistered", false, "크론(알림·정기결제) 등록 확인"],
];

// ── 2) 자동 신호 (저장소에서 확인 가능한 것) ──────────────────────
function check(fn) { try { return !!fn(); } catch { return false; } }

const migrationsCount = check(() =>
  readdirSync(path.join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).length > 0,
);
const vercelHasBothCrons = check(() => {
  const v = JSON.parse(read("vercel.json"));
  const paths = (v.crons ?? []).map((c) => c.path);
  return paths.includes("/api/cron/reminders") && paths.includes("/api/cron/billing");
});
const legalPagesExist = ["terms", "privacy", "refund"].every((p) =>
  existsSync(path.join(root, "src/app", p, "page.tsx")),
);
const ogImageExists = existsSync(path.join(root, "src/app/opengraph-image.tsx"));
const billingAdapterExists = existsSync(path.join(root, "src/lib/billing/portone.ts"));

const AUTO = [
  ["DB 마이그레이션 존재", migrationsCount],
  ["크론 2종(vercel.json: reminders + billing) 등록", vercelHasBothCrons],
  ["법무 페이지(약관·개인정보·환불) 존재", legalPagesExist],
  ["OG 이미지 라우트 존재", ogImageExists],
  ["결제 어댑터(PortOne) 존재", billingAdapterExists],
];

// ── 출력 ──────────────────────────────────────────────────────
console.log(`\n${C.bold}${C.cyan}안전지도 — 출시 가능 자가점검${C.reset}\n`);

console.log(`${C.bold}자동 점검 (저장소)${C.reset}`);
for (const [label, ok] of AUTO) console.log(`  ${mark(ok)} ${label}`);

console.log(`\n${C.bold}수동 게이트 (launch.config.json)${C.reset}`);
const blockers = [];
for (const [key, isBlocker, label] of GATES) {
  const ok = gates[key] === true;
  const tag = isBlocker ? `${C.dim}(blocker)${C.reset}` : `${C.dim}(권장)${C.reset}`;
  console.log(`  ${mark(ok)} ${label} ${tag}`);
  if (isBlocker && !ok) blockers.push(label);
}

const autoFail = AUTO.filter(([, ok]) => !ok).map(([l]) => l);
const go = blockers.length === 0 && autoFail.length === 0;

console.log(`\n${"─".repeat(56)}`);
if (go) {
  console.log(`${C.green}${C.bold}GO — 출시 가능${C.reset}\n`);
  process.exit(0);
} else {
  console.log(`${C.red}${C.bold}NO-GO — 출시 불가${C.reset}`);
  if (blockers.length) {
    console.log(`${C.red}미완료 blocker:${C.reset}`);
    for (const b of blockers) console.log(`   • ${b}`);
  }
  if (autoFail.length) {
    console.log(`${C.red}자동 점검 실패:${C.reset}`);
    for (const a of autoFail) console.log(`   • ${a}`);
  }
  console.log("");
  process.exit(1);
}
