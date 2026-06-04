import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Textarea —— shadcn/ui 多行输入，retheme 到品牌 token（与 Input 同语言）。
 *
 * 发丝描边 + 深色 focus ring + 品牌圆角；aria-invalid 切危险色。
 * 默认给一个克制最小高度，纵向可拉伸。纯样式封装的原生 <textarea>。
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-28 w-full rounded-[var(--radius-cta)] border border-input bg-background px-3 py-2 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/30 aria-invalid:focus-visible:ring-destructive/30",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
