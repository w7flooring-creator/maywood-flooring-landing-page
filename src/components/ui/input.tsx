import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input —— shadcn/ui 文本输入框，retheme 到品牌 token。
 *
 * 克制 editorial：发丝描边（--border）、深色 focus ring（--ring）、品牌圆角。
 * aria-invalid 时切换为危险色描边/ring，配合 react-hook-form 的校验态。
 * 无 client 逻辑，纯样式封装的原生 <input>。
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-[var(--radius-cta)] border border-input bg-background px-3 py-2 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/30 aria-invalid:focus-visible:ring-destructive/30",
        className
      )}
      {...props}
    />
  );
}

export { Input };
