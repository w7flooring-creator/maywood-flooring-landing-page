import * as React from "react";
import { Menu } from "lucide-react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PRIMARY_NAV, SAMPLE_REQUEST, SITE, isNavLinkActive } from "@/lib/site";

/**
 * MobileNav —— 移动端主导航抽屉，全站唯一的交互 island。
 *
 * 用 shadcn Sheet（Radix Dialog）作抽屉：自带 focus trap、Esc 关闭、
 * 点遮罩关闭、`aria-modal` 等无障碍语义。导航数据复用 site.ts 的
 * PRIMARY_NAV（与桌面 PrimaryNav 同一来源）。整体 retheme 成黑底品牌外观
 * （.on-ink 反相语义变量），非 shadcn 默认中性灰。
 *
 * currentPath 由 SiteHeader 在构建时注入，用于激活态高亮。
 */
type Props = {
  currentPath: string;
};

export default function MobileNav({ currentPath }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="inline-flex size-10 items-center justify-center rounded-[var(--radius-cta)] text-white transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-hidden"
      >
        <Menu className="size-6" aria-hidden="true" />
      </SheetTrigger>

      <SheetContent
        side="right"
        className="on-ink w-[84%] max-w-sm border-l border-white/15 bg-[var(--color-ink)] text-white"
      >
        <SheetHeader className="border-b border-white/15 pb-4">
          <SheetTitle className="font-serif text-xl text-white">
            {SITE.name}
          </SheetTitle>
        </SheetHeader>

        <nav aria-label="Mobile" className="flex flex-1 flex-col px-6">
          <ul className="flex flex-col">
            {PRIMARY_NAV.map((link) => {
              const active = isNavLinkActive(link.href, currentPath);
              return (
                <li key={link.href}>
                  <SheetClose asChild>
                    <a
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={
                        "block border-b border-white/12 py-4 font-serif text-2xl text-white transition-opacity hover:opacity-70 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" +
                        (active ? " italic" : "")
                      }
                    >
                      {link.label}
                    </a>
                  </SheetClose>
                </li>
              );
            })}
          </ul>

          <SheetClose asChild>
            <a
              href={SAMPLE_REQUEST.href}
              className="mt-8 inline-flex w-full items-center justify-center rounded-[var(--radius-cta)] bg-white px-5 py-3 text-xs font-medium tracking-[0.08em] text-[var(--color-ink)] uppercase transition-colors hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {SAMPLE_REQUEST.label}
            </a>
          </SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
