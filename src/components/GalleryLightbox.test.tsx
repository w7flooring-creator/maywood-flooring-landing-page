// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GalleryLightbox from "@/components/GalleryLightbox";
import type { GalleryItem } from "@/lib/gallery";

/**
 * GalleryLightbox island（issue #19）的 a11y / 交互测试。
 *
 * 该 island 既渲染响应式网格（每张图是 <button>），又承载点击开 lightbox 的浏览器
 * 状态。复用 yet-another-react-lightbox（已在 package.json，#13 引入），不加新依赖。
 * 验证：网格渲染全部图、按钮可键盘操作、有意义 alt、点击开 lightbox、不热链 Wix。
 */

const items: GalleryItem[] = [
  {
    _id: "g1",
    url: "https://cdn.sanity.io/g1.jpg",
    alt: "Spotted Gum living room",
    title: "Brighton project",
    caption: "Engineered oak throughout.",
  },
  {
    _id: "g2",
    url: "https://cdn.sanity.io/g2.jpg",
    alt: null,
    title: null,
    caption: null,
  },
];

describe("GalleryLightbox —— 网格渲染 / a11y", () => {
  it("为每张图渲染一个 <button>，包含可渲染的 <img>", () => {
    render(<GalleryLightbox items={items} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toHaveAttribute("src", "https://cdn.sanity.io/g1.jpg");
  });

  it("有 alt 时用编辑的 alt；缺 alt 时回落到有意义的描述（非空、非破图）", () => {
    render(<GalleryLightbox items={items} />);
    // 编辑填了 alt
    expect(screen.getByAltText("Spotted Gum living room")).toBeInTheDocument();
    // 缺 alt → 回落描述（含品牌 / 序号，绝不空 alt）
    const fallback = screen.getByRole("button", { name: /image 2/i });
    expect(fallback).toBeInTheDocument();
    const imgs = screen.getAllByRole("img");
    expect(imgs[1].getAttribute("alt")).toBeTruthy();
  });

  it("缩略图按钮键盘可达（真 <button>，可聚焦）", async () => {
    const user = userEvent.setup();
    render(<GalleryLightbox items={items} />);
    await user.tab();
    expect(screen.getAllByRole("button")[0]).toHaveFocus();
  });

  it("点击缩略图打开 lightbox（出现关闭控件）", async () => {
    const user = userEvent.setup();
    render(<GalleryLightbox items={items} />);
    // 初始无 lightbox 关闭按钮
    expect(
      screen.queryByRole("button", { name: /close/i })
    ).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button")[0]);
    // lightbox 打开后出现 Close 控件（yet-another-react-lightbox 默认 toolbar）
    expect(
      await screen.findByRole("button", { name: /close/i })
    ).toBeInTheDocument();
  });

  it("绝不热链 Wix（图片均来自传入的 Sanity url）", () => {
    const { container } = render(<GalleryLightbox items={items} />);
    expect(container.innerHTML).not.toContain("wixstatic");
    expect(container.innerHTML).not.toContain("parastorage");
  });

  it("空列表时不渲染（页面侧另出空态，这里是防御）", () => {
    const { container } = render(<GalleryLightbox items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
