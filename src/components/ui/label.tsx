import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Label —— shadcn/ui 标签（Radix Label primitive）。
 *
 * 用品牌 token 重写，去掉 shadcn 默认中性灰：小号、轻字距、克制 editorial。
 * Radix Label 自带 htmlFor → 控件关联（点击 label 聚焦控件，屏幕阅读器朗读）。
 * 仅作样式 + 行为薄封装，不引入额外逻辑。
 */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium text-foreground select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Label };
