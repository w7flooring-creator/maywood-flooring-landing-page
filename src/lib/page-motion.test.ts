import { describe, expect, it } from "vitest";

import {
  canAnimatePageLayer,
  createMotionLifecycle,
  isInitiallyInViewport,
  resolvePageMotionExperience,
  resolvePageScrollMode,
  resolveRevealMotion,
} from "./motion";

describe("initial viewport reveal boundary", () => {
  it("keeps a product card visible when any part is already in the first viewport", () => {
    expect(
      isInitiallyInViewport({
        top: 850,
        bottom: 1095,
        viewportHeight: 900,
      })
    ).toBe(true);
  });
});

describe("page layer hydration safety", () => {
  it("never mutates a layer inside an unhydrated Astro island", () => {
    expect(
      canAnimatePageLayer({
        layer: "media",
        ownsInteractiveDescendant: false,
        insideUnhydratedIsland: true,
      })
    ).toBe(false);
  });

  it("still allows a stable visual media layer after hydration", () => {
    expect(
      canAnimatePageLayer({
        layer: "media",
        ownsInteractiveDescendant: false,
        insideUnhydratedIsland: false,
      })
    ).toBe(true);
  });
});

describe("inner-page scroll mode", () => {
  it.each(["", "?scroll=native", "?scroll=lenis", "?scroll=unknown"])(
    "always uses native scrolling for %s",
    (search) => {
      expect(resolvePageScrollMode(search)).toBe("native");
    }
  );
});

describe("page motion experience", () => {
  it("uses cinematic motion only on an eligible desktop", () => {
    expect(
      resolvePageMotionExperience({
        reducedMotion: false,
        coarsePointer: false,
        compactViewport: false,
      })
    ).toBe("cinematic");
  });

  it.each([
    ["reduced motion", true, false, false, "reduced"],
    ["a coarse pointer", false, true, false, "compact"],
    ["a compact viewport", false, false, true, "compact"],
  ] as const)(
    "degrades for %s",
    (_label, reducedMotion, coarsePointer, compactViewport, expected) => {
      expect(
        resolvePageMotionExperience({
          reducedMotion,
          coarsePointer,
          compactViewport,
        })
      ).toBe(expected);
    }
  );
});

describe("shared lifecycle", () => {
  it("is idempotent and restartable", () => {
    let starts = 0;
    let cleanups = 0;
    const lifecycle = createMotionLifecycle(() => {
      starts += 1;
      return () => {
        cleanups += 1;
      };
    });

    lifecycle.start();
    lifecycle.start();
    lifecycle.destroy();
    lifecycle.destroy();
    lifecycle.start();

    expect(starts).toBe(2);
    expect(cleanups).toBe(1);
    expect(lifecycle.active).toBe(true);
  });
});

describe("compact reveal policy", () => {
  it.each(["media", "card"] as const)(
    "never fades compact %s layers from opacity zero",
    (layer) => {
      expect(resolveRevealMotion(true, layer).fade).toBe(false);
    }
  );
});

describe("profile intensity", () => {
  it("keeps editorial motion strongest and minimal motion lightest", () => {
    const editorial = resolveRevealMotion(false, "heading", "editorial");
    const conversion = resolveRevealMotion(false, "heading", "conversion");
    const minimal = resolveRevealMotion(false, "heading", "minimal");

    expect(editorial.distance).toBeGreaterThan(conversion.distance);
    expect(conversion.distance).toBeGreaterThan(minimal.distance);
    expect(editorial.duration).toBeGreaterThan(minimal.duration);
  });
});
