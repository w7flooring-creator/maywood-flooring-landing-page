import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

/**
 * FaqAccordionIsland —— FAQ 折叠列表（交互 island，client:visible）。
 *
 * 组件策略（见 AGENTS.md「组件需求映射：FaqAccordion = shadcn Accordion (Radix)」）：
 * 行为/无障碍全部由 shadcn Accordion（Radix）提供 —— 键盘可操作（Tab/Enter/Space/方向键）、
 * aria-expanded / aria-controls 关联、焦点可见。本 island 只负责把数据映射成 Accordion 结构。
 *
 * 答案以**预序列化 HTML 字符串**（answerHtml）传入，保持 island 简单且无需在客户端引入
 * Portable Text 渲染器：HTML 由 Astro 侧用 faq.ts 的 portableTextToHtml 在 build 时生成
 * （已转义，防 XSS），这里只 dangerouslySetInnerHTML 注入。
 *
 * type="single" + collapsible：一次只展开一个，符合 FAQ 阅读节奏；可全部收起。
 * 视觉走品牌 token（accordion.tsx 已 retheme）；答案排版交给 .faq-answer 容器的 scoped CSS
 * （定义在 FaqAccordion.astro）。
 */

/** 单条 FAQ（answer 已序列化为安全 HTML 字符串）。 */
export interface FaqAccordionItem {
  /** 稳定唯一值（用作 Radix item value 与 React key）。 */
  id: string;
  question: string;
  /** 预序列化、已转义的答案 HTML。 */
  answerHtml: string;
}

interface Props {
  items: FaqAccordionItem[];
}

export default function FaqAccordionIsland({ items }: Props) {
  return (
    <Accordion type="single" collapsible className="faq-accordion">
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>
            <div
              className="faq-answer"
              // 答案 HTML 由 build 时 portableTextToHtml 生成并转义（见 faq.ts），非用户输入。
              dangerouslySetInnerHTML={{ __html: item.answerHtml }}
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
