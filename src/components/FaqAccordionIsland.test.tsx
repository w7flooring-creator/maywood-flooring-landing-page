// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FaqAccordionIsland, {
  type FaqAccordionItem,
} from "@/components/FaqAccordionIsland";

/**
 * jsdom RTL：折叠/展开交互、键盘可操作、a11y（按钮语义 + aria-expanded + 区域关联）。
 * 答案以预序列化 HTML 字符串传入（island 保持简单），断言其作为 HTML 渲染（非转义文本）。
 */

const items: FaqAccordionItem[] = [
  {
    id: "f1",
    question: "How do I order samples?",
    answerHtml: "<p>Request them <strong>online</strong>.</p>",
  },
  {
    id: "f2",
    question: "Do you deliver across Melbourne?",
    answerHtml: "<p>Yes, across Melbourne and VIC.</p>",
  },
];

describe("FaqAccordionIsland —— 交互 / 键盘 / a11y", () => {
  it("每个问题渲染为按钮（trigger 语义），初始全部收起", () => {
    render(<FaqAccordionIsland items={items} />);
    const triggers = screen.getAllByRole("button");
    expect(triggers).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: /How do I order samples\?/ })
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("点击 trigger 展开对应答案，再点收起（单开模式）", async () => {
    const user = userEvent.setup();
    render(<FaqAccordionIsland items={items} />);

    const trigger = screen.getByRole("button", {
      name: /How do I order samples\?/,
    });

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // 答案作为 HTML 渲染（<strong> 真为元素，而非转义文本）
    expect(screen.getByText("online").tagName).toBe("STRONG");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("展开一项后再展开另一项，前一项自动收起（type=single collapsible）", async () => {
    const user = userEvent.setup();
    render(<FaqAccordionIsland items={items} />);

    const first = screen.getByRole("button", {
      name: /How do I order samples\?/,
    });
    const second = screen.getByRole("button", {
      name: /Do you deliver across Melbourne\?/,
    });

    await user.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");

    await user.click(second);
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("键盘可操作：Tab 聚焦 trigger，Enter / Space 切换展开", async () => {
    const user = userEvent.setup();
    render(<FaqAccordionIsland items={items} />);

    const first = screen.getByRole("button", {
      name: /How do I order samples\?/,
    });

    await user.tab();
    expect(first).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(first).toHaveAttribute("aria-expanded", "true");

    await user.keyboard(" ");
    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("trigger 经 aria-controls 关联其展开后的内容区域（a11y）", async () => {
    const user = userEvent.setup();
    render(<FaqAccordionIsland items={items} />);

    const trigger = screen.getByRole("button", {
      name: /How do I order samples\?/,
    });
    await user.click(trigger);

    const controls = trigger.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    const region = document.getElementById(controls as string);
    expect(region).toBeInTheDocument();
    expect(region).toHaveTextContent("Request them online.");
  });

  it("空 items → 不渲染任何 trigger（由 Astro 侧决定空状态）", () => {
    const { container } = render(<FaqAccordionIsland items={[]} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(container.querySelector("[data-slot='accordion']")).toBeTruthy();
  });
});
