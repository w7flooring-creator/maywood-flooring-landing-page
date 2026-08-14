// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import SignatureCollectionsGallery from "@/components/SignatureCollectionsGallery";

const items = [
  {
    title: "PureGrain",
    href: "/puregrain",
    description: "The purest expression of timber.",
    image: {
      src: "https://cdn.sanity.io/puregrain.jpg",
      srcSet: null,
      alt: "Light oak interior",
    },
  },
  {
    title: "Bushland",
    href: "/bushland",
    description: null,
    image: null,
  },
];

describe("SignatureCollectionsGallery", () => {
  it("保留每个系列的真实链接、图片 alt 与首个展开态", () => {
    render(<SignatureCollectionsGallery items={items} />);

    const puregrain = screen.getByRole("link", { name: "Explore PureGrain" });
    const bushland = screen.getByRole("link", { name: "Explore Bushland" });

    expect(puregrain).toHaveAttribute("href", "/puregrain");
    expect(bushland).toHaveAttribute("href", "/bushland");
    expect(puregrain).toHaveAttribute("data-active", "true");
    expect(bushland).toHaveAttribute("data-active", "false");
    expect(screen.getByAltText("Light oak interior")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Bushland" })
    ).not.toBeInTheDocument();
  });

  it("焦点和方向键切换展开态，链接仍保持原生导航语义", async () => {
    const user = userEvent.setup();
    render(<SignatureCollectionsGallery items={items} />);

    const puregrain = screen.getByRole("link", { name: "Explore PureGrain" });
    const bushland = screen.getByRole("link", { name: "Explore Bushland" });

    // 组件不拦截点击；href 保持为原生导航目标。
    expect(puregrain).toHaveAttribute("href", "/puregrain");

    puregrain.focus();
    await user.keyboard("{ArrowRight}");
    expect(bushland).toHaveFocus();
    expect(bushland).toHaveAttribute("data-active", "true");
    expect(puregrain).toHaveAttribute("data-active", "false");
  });
});
