import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { serverEnv } from "@/lib/env.server";
import type { TokenUsage } from "@/lib/pricing/cogs";

/**
 * ★ AI 위험요인 '예시' 추출 모듈 (무역/세무 추출 모듈 패턴 재활용).
 *
 *  - Claude(Haiku 4.5 고정)로 작업/공정 설명에서 '일반적으로 거론되는 유해위험요인 예시'를
 *    JSON only 로 생성한다.
 *  - 저신뢰(confidence: low)·실패·빈 결과면 Sonnet 4.6 으로 1회만 폴백.
 *  - 시스템 프롬프트는 고정(stable) → prompt caching(cache_control: ephemeral).
 *
 *  ※ 절대 금지 (책임 격리): 출력 스키마에 위험도/등급/가능성/중대성/법 적합 여부가 없다.
 *     모델에게도 위험도·법 판정을 금지한다. 위험요인의 '이름·설명 예시'까지만.
 */

const HAIKU = "claude-haiku-4-5";
const SONNET = "claude-sonnet-4-6";

export interface HazardExample {
  category: string;
  name: string;
  description: string;
}

export interface ExtractResult {
  items: HazardExample[];
  confidence: "low" | "medium" | "high";
  /** 폴백 포함, 실제 발생한 모델 호출들 (원가 계산용) */
  attempts: { model: string; usage: TokenUsage }[];
}

// ── 출력 검증 스키마 (위험도/법 판정 필드 없음) ─────────────────────────────
const OutputSchema = z.object({
  confidence: z.enum(["low", "medium", "high"]),
  hazards: z
    .array(
      z.object({
        category: z.string().trim().max(40),
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().min(1).max(300),
      }),
    )
    .max(12),
});

// API 에 보낼 JSON 스키마 (구조적으로 위험도 필드 자체를 받지 않음)
const OUTPUT_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    hazards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
        },
        required: ["category", "name", "description"],
      },
    },
  },
  required: ["confidence", "hazards"],
};

// 고정 시스템 프롬프트 (캐시 대상) ───────────────────────────────────────────
const SYSTEM_PROMPT = `당신은 50인 미만 소규모 사업장(제조·건설 등)의 사장이 위험성평가를 작성할 때,
"이런 작업에서 일반적으로 거론되는 유해·위험요인 예시"를 떠올리도록 돕는 보조자입니다.
한국산업안전보건공단(KOSHA)의 일반적인 안전 상식을 바탕으로 '예시'를 제시합니다.

[반드시 지킬 규칙 — 매우 중요]
1. 당신은 위험도/안전 여부/법 적합 여부를 절대 판정하지 않습니다.
   - 위험도, 위험성, 등급, 점수, 가능성, 중대성, "높음/보통/낮음", "안전/위험", "적합/부적합",
     법 충족 여부 등을 출력에 절대 포함하지 마세요.
2. 당신이 주는 것은 '위험요인의 이름과 한 줄 설명 예시'뿐입니다.
   실제 해당 여부와 모든 위험 판단은 사업주가 직접 합니다.
3. 한국어로, 비전문가(사장)도 이해할 쉬운 표현을 씁니다.
4. 입력이 작업/공정 설명이 아니거나 모호하면, confidence 를 "low" 로 하고
   hazards 는 비우거나 최소화합니다.
5. 일반적으로 거론되는 항목 위주로 6~10개 내외. 과장·단정 금지.

[자주 쓰는 분류(category) 예]
기계, 전기, 화재·폭발, 추락, 끼임, 넘어짐, 부딪힘, 소음, 분진, 화학물질, 유해광선,
근골격계, 고온·저온, 밀폐공간, 중량물 취급.

[confidence 기준]
- high: 입력이 구체적이고 흔한 작업이라 일반적 예시를 자신 있게 제시
- medium: 어느 정도 제시 가능하나 정보가 부족
- low: 작업/공정으로 보기 어렵거나 너무 모호

오직 지정된 JSON 형식으로만 답합니다.`;

function buildUserPrompt(description: string): string {
  return `다음 작업/공정에 대해 일반적으로 거론되는 유해·위험요인 '예시'를 제시해 주세요.

작업/공정: "${description}"

각 항목은 분류(category), 짧은 이름(name), 한 줄 설명(description)만 포함합니다.
위험도·등급·가능성·중대성·법 적합 여부는 절대 포함하지 마세요. 예시 제공까지만 합니다.`;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!serverEnv.ANTHROPIC_API_KEY) {
    throw new Error("AI is disabled (ANTHROPIC_API_KEY missing)");
  }
  client ??= new Anthropic({ apiKey: serverEnv.ANTHROPIC_API_KEY });
  return client;
}

function mapUsage(u: Anthropic.Usage): TokenUsage {
  return {
    inputTokens: u.input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
  };
}

async function callOnce(
  model: string,
  description: string,
): Promise<{ items: HazardExample[]; confidence: "low" | "medium" | "high"; usage: TokenUsage }> {
  const resp = await getClient().messages.create({
    model,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" }, // 고정 프리픽스 캐싱
      },
    ],
    output_config: { format: { type: "json_schema", schema: OUTPUT_JSON_SCHEMA } },
    messages: [{ role: "user", content: buildUserPrompt(description) }],
  });

  const usage = mapUsage(resp.usage);

  if (resp.stop_reason === "refusal") {
    throw new Error("model refused");
  }

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const parsed = OutputSchema.parse(JSON.parse(text)); // 형식 위반 시 throw → 폴백
  return { items: parsed.hazards, confidence: parsed.confidence, usage };
}

export async function extractHazardExamples(description: string): Promise<ExtractResult> {
  const attempts: { model: string; usage: TokenUsage }[] = [];
  let result: { items: HazardExample[]; confidence: "low" | "medium" | "high" } | null = null;

  // 1차: Haiku 고정
  try {
    const r = await callOnce(HAIKU, description);
    attempts.push({ model: HAIKU, usage: r.usage });
    if (r.confidence !== "low" && r.items.length > 0) {
      result = { items: r.items, confidence: r.confidence };
    }
  } catch (err) {
    console.error("[ai] Haiku 호출 실패:", err instanceof Error ? err.message : err);
  }

  // 2차(폴백): Sonnet 1회 — 저신뢰/실패/빈 결과일 때만
  if (!result) {
    try {
      const r = await callOnce(SONNET, description);
      attempts.push({ model: SONNET, usage: r.usage });
      result = { items: r.items, confidence: r.confidence };
    } catch (err) {
      console.error("[ai] Sonnet 폴백 실패:", err instanceof Error ? err.message : err);
      result = { items: [], confidence: "low" };
    }
  }

  return { items: result.items, confidence: result.confidence, attempts };
}
