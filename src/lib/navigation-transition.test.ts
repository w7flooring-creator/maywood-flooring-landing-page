// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { installNavigationTransitionRuntime } from "./navigation-transition";

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.className = "";
  document.body.removeAttribute("data-transition-profile");
});

describe("navigation transition runtime", () => {
  it("shows loading only for slow navigation and marks the incoming document before swap", () => {
    vi.useFakeTimers();
    document.body.dataset.transitionProfile = "editorial";
    const incoming = document.implementation.createHTMLDocument("Product");
    incoming.body.dataset.transitionProfile = "catalog";
    const cleanup = installNavigationTransitionRuntime();

    const preparation = new Event("astro:before-preparation");
    Object.assign(preparation, { direction: "back" });
    document.dispatchEvent(preparation);
    vi.advanceTimersByTime(239);
    expect(document.documentElement).not.toHaveClass("is-navigation-loading");
    vi.advanceTimersByTime(1);
    expect(document.documentElement).toHaveClass("is-navigation-loading");

    document.dispatchEvent(new Event("astro:after-preparation"));
    expect(document.documentElement).not.toHaveClass("is-navigation-loading");

    const beforeSwap = new Event("astro:before-swap");
    Object.assign(beforeSwap, { newDocument: incoming });
    document.dispatchEvent(beforeSwap);

    expect(incoming.documentElement.dataset.navigationEntry).toBe("client");
    expect(incoming.documentElement.dataset.transitionFrom).toBe("editorial");
    expect(incoming.documentElement.dataset.transitionTo).toBe("catalog");
    expect(incoming.documentElement.dataset.transitionDirection).toBe("back");
    expect(
      incoming.documentElement.style.getPropertyValue(
        "--maywood-page-exit-duration"
      )
    ).toBe("420ms");
    expect(
      incoming.documentElement.style.getPropertyValue(
        "--maywood-page-enter-delay"
      )
    ).toBe("500ms");
    expect(
      incoming.documentElement.style.getPropertyValue(
        "--maywood-page-enter-duration"
      )
    ).toBe("760ms");

    cleanup();
  });
});
