import { HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * 법/전문 용어 옆에 쉬운 설명을 병기한다. (카피는 비전문가 = 사장 눈높이)
 *
 * 사용 예:
 *   <Term word="위험성평가" plain="우리 일터에 어떤 위험이 있는지 찾아보고 어떻게 줄일지 적는 일" />
 */
export function Term({
  word,
  plain,
  className,
}: {
  word: string;
  plain: string;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex cursor-help items-center gap-0.5 underline decoration-dotted underline-offset-4",
              className,
            )}
            tabIndex={0}
          >
            {word}
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <span className="sr-only">— 쉬운 설명: {plain}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="leading-relaxed">{plain}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * 용어 + 쉬운 설명을 한 줄로 풀어 보여주는 블록형. (툴팁을 못 쓰는 맥락용)
 */
export function TermNote({ word, plain }: { word: string; plain: string }) {
  return (
    <span className="text-sm">
      <span className="font-medium text-foreground">{word}</span>
      <span className="text-muted-foreground"> — {plain}</span>
    </span>
  );
}
