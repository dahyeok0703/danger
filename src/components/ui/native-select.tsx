import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 네이티브 <select> 기반 셀렉트.
 * 모바일에서 OS 기본 휠 피커가 떠 현장에서 쓰기 좋다(큰 터치 타깃).
 */
const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex h-11 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </div>
    );
  },
);
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
