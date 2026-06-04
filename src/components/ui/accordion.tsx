import * as React from "react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * shadcn/ui Accordion（基于 Radix Accordion）—— 见 AGENTS.md「组件策略：FaqAccordion =
 * shadcn Accordion (Radix)」。retheme 到品牌 token：hairline 分隔线、serif-free 克制
 * trigger、深色 ink 文本、chevron 旋转指示。
 *
 * 取用 `radix-ui` 伞包（与 sheet.tsx 一致，全站单一 primitive 系统），不另加 Radix 子包依赖。
 * 进出场（展开/收起）动画走 FaqAccordion.astro 的 scoped CSS（消费 Radix 注入的
 * --radix-accordion-content-height，并尊重 prefers-reduced-motion），不引入 tw-animate-css。
 *
 * 键盘可操作 / 焦点可见由 Radix + globals.css :focus-visible 提供。
 */

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b border-border", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 items-start justify-between gap-4 py-5 text-left text-base font-medium text-foreground transition-colors outline-none hover:text-foreground/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none mt-0.5 size-5 shrink-0 text-muted-foreground transition-transform duration-200"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="accordion-content overflow-hidden text-sm"
      {...props}
    >
      <div className={cn("pt-0 pb-5", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
