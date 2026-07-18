import { describe, expect, it } from "vitest";

import {
  captureScrollPosition,
  createHomeMotionLifecycle,
  observeMediaChanges,
  resolveActiveScrollMode,
  resolveRequestedScrollMode,
  resolveRestoredScrollY,
} from "./home-motion";

describe("resolveRequestedScrollMode", () => {
  it.each([
    ["", "native"],
    ["?scroll=native", "native"],
    ["?scroll=lenis", "lenis"],
    ["?scroll=unknown", "native"],
    ["?other=value", "native"],
  ] as const)("maps %s to %s", (search, expected) => {
    expect(resolveRequestedScrollMode(search)).toBe(expected);
  });
});

describe("resolveActiveScrollMode", () => {
  it("enables Lenis only for an eligible desktop experience", () => {
    expect(
      resolveActiveScrollMode({
        requestedMode: "lenis",
        reducedMotion: false,
        coarsePointer: false,
        compactViewport: false,
      })
    ).toBe("lenis");
  });

  it.each([
    ["reduced motion", true, false, false],
    ["a coarse pointer", false, true, false],
    ["a compact viewport", false, false, true],
  ] as const)(
    "falls back to native scrolling for %s",
    (_label, reducedMotion, coarsePointer, compactViewport) => {
      expect(
        resolveActiveScrollMode({
          requestedMode: "lenis",
          reducedMotion,
          coarsePointer,
          compactViewport,
        })
      ).toBe("native");
    }
  );
});

describe("createHomeMotionLifecycle", () => {
  it("starts once, cleans up once, and can be started again", () => {
    let setupCount = 0;
    let cleanupCount = 0;
    const lifecycle = createHomeMotionLifecycle(() => {
      setupCount += 1;
      return () => {
        cleanupCount += 1;
      };
    });

    lifecycle.start();
    lifecycle.start();
    expect(setupCount).toBe(1);
    expect(lifecycle.active).toBe(true);

    lifecycle.destroy();
    lifecycle.destroy();
    expect(cleanupCount).toBe(1);
    expect(lifecycle.active).toBe(false);

    lifecycle.start();
    expect(setupCount).toBe(2);
    expect(lifecycle.active).toBe(true);
  });
});

describe("scroll position restoration", () => {
  it("preserves normalized page progress when scene geometry changes", () => {
    const snapshot = captureScrollPosition(4500, 10000, 1000);

    expect(snapshot).toEqual({ y: 4500, progress: 0.5 });
    expect(resolveRestoredScrollY(snapshot, 7000, 1000)).toBe(3000);
  });

  it("clamps invalid or out-of-range positions", () => {
    expect(captureScrollPosition(-100, 500, 800)).toEqual({
      y: 0,
      progress: 0,
    });
    expect(resolveRestoredScrollY({ y: 9999, progress: 1.5 }, 3000, 1000)).toBe(
      2000
    );
  });
});

describe("observeMediaChanges", () => {
  it("removes every registered listener during controller cleanup", () => {
    const listeners = [new Set<EventListener>(), new Set<EventListener>()];
    const queries = listeners.map(
      (registered) =>
        ({
          addEventListener: (_type: string, listener: EventListener) =>
            registered.add(listener),
          removeEventListener: (_type: string, listener: EventListener) =>
            registered.delete(listener),
        }) as unknown as MediaQueryList
    );
    const listener = () => {};

    const cleanup = observeMediaChanges(queries, listener);
    expect(listeners.every((registered) => registered.size === 1)).toBe(true);

    cleanup();
    cleanup();
    expect(listeners.every((registered) => registered.size === 0)).toBe(true);
  });
});
