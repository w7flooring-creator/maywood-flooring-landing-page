export type RequestedScrollMode = "native" | "lenis";
export type MotionProfile =
  | "editorial"
  | "catalog"
  | "conversion"
  | "minimal"
  | "none";
export type PageMotionExperience = "cinematic" | "compact" | "reduced";

interface ScrollExperienceCapabilities {
  requestedMode: RequestedScrollMode;
  reducedMotion: boolean;
  coarsePointer: boolean;
  compactViewport: boolean;
}

interface PageMotionCapabilities {
  reducedMotion: boolean;
  coarsePointer: boolean;
  compactViewport: boolean;
}

export interface MotionLifecycle {
  readonly active: boolean;
  start(): void;
  destroy(): void;
}

export interface ScrollPositionSnapshot {
  y: number;
  progress: number;
}

export interface BrowserScrollRestoration {
  read(): ScrollPositionSnapshot;
  restore(snapshot: ScrollPositionSnapshot): void;
  cancel(): void;
}

export interface RevealMotionPolicy {
  fade: boolean;
  distance: number;
  duration: number;
  amount: number;
  margin: "0px 0px -8% 0px" | "0px 0px 160px 0px";
}

export interface PageLayerEligibility {
  layer: string | null | undefined;
  ownsInteractiveDescendant: boolean;
  insideUnhydratedIsland: boolean;
}

export interface InitialViewportBounds {
  top: number;
  bottom: number;
  viewportHeight: number;
}

/** Initial pixels already on screen stay visible instead of replaying a reveal. */
export function isInitiallyInViewport({
  top,
  bottom,
  viewportHeight,
}: InitialViewportBounds): boolean {
  return bottom > 0 && top < viewportHeight;
}

/** Do not mutate server-rendered island markup before React has hydrated it. */
export function canAnimatePageLayer({
  layer,
  ownsInteractiveDescendant,
  insideUnhydratedIsland,
}: PageLayerEligibility): boolean {
  return (
    layer !== "interactive" &&
    !ownsInteractiveDescendant &&
    !insideUnhydratedIsland
  );
}

export function resolveRevealMotion(
  compactExperience: boolean,
  layer: string | null | undefined,
  profile: MotionProfile = "editorial"
): RevealMotionPolicy {
  if (!compactExperience) {
    const profileMotion = {
      editorial: { distance: 32, duration: 0.9 },
      catalog: { distance: 24, duration: 0.76 },
      conversion: { distance: 20, duration: 0.66 },
      minimal: { distance: 14, duration: 0.55 },
      none: { distance: 0, duration: 0 },
    }[profile];
    return {
      fade: profile !== "none",
      ...profileMotion,
      amount: 0.16,
      margin: "0px 0px -8% 0px",
    };
  }

  return {
    fade: layer !== "media" && layer !== "card",
    distance: profile === "minimal" ? 10 : 18,
    duration: profile === "minimal" ? 0.5 : 0.72,
    amount: 0.01,
    margin: "0px 0px 160px 0px",
  };
}

export function captureScrollPosition(
  scrollY: number,
  scrollHeight: number,
  viewportHeight: number
): ScrollPositionSnapshot {
  const maxScroll = Math.max(0, scrollHeight - viewportHeight);
  const y = Math.min(maxScroll, Math.max(0, scrollY));
  return {
    y,
    progress: maxScroll === 0 ? 0 : y / maxScroll,
  };
}

export function resolveRestoredScrollY(
  snapshot: ScrollPositionSnapshot,
  scrollHeight: number,
  viewportHeight: number
): number {
  const maxScroll = Math.max(0, scrollHeight - viewportHeight);
  return Math.min(maxScroll, Math.max(0, snapshot.progress * maxScroll));
}

/** Shared browser adapter for resize and BFCache scroll restoration. */
export function createBrowserScrollRestoration(): BrowserScrollRestoration {
  let restoreFrame = 0;

  return {
    read() {
      return captureScrollPosition(
        window.scrollY,
        document.documentElement.scrollHeight,
        window.innerHeight
      );
    },
    restore(snapshot) {
      cancelAnimationFrame(restoreFrame);
      restoreFrame = requestAnimationFrame(() => {
        restoreFrame = requestAnimationFrame(() => {
          window.scrollTo(
            0,
            resolveRestoredScrollY(
              snapshot,
              document.documentElement.scrollHeight,
              window.innerHeight
            )
          );
        });
      });
    },
    cancel() {
      cancelAnimationFrame(restoreFrame);
    },
  };
}

/** Bind one controller lifecycle to BFCache without duplicating event wiring. */
export function observePageTransitions(
  lifecycle: MotionLifecycle,
  scrollRestoration: BrowserScrollRestoration
): () => void {
  let snapshot: ScrollPositionSnapshot | null = null;
  const destroyOnPageHide = () => {
    snapshot = scrollRestoration.read();
    lifecycle.destroy();
  };
  const restartOnPageShow = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    lifecycle.start();
    if (snapshot) scrollRestoration.restore(snapshot);
  };

  window.addEventListener("pagehide", destroyOnPageHide);
  window.addEventListener("pageshow", restartOnPageShow);
  return () => {
    scrollRestoration.cancel();
    window.removeEventListener("pagehide", destroyOnPageHide);
    window.removeEventListener("pageshow", restartOnPageShow);
  };
}

export function observeMediaChanges(
  queries: MediaQueryList[],
  listener: () => void
): () => void {
  queries.forEach((query) => query.addEventListener("change", listener));
  return () => {
    queries.forEach((query) => query.removeEventListener("change", listener));
  };
}

export function createMotionLifecycle(
  setup: () => (() => void) | void
): MotionLifecycle {
  let cleanup: (() => void) | null = null;

  return {
    get active() {
      return cleanup !== null;
    },
    start() {
      if (cleanup !== null) return;
      cleanup = setup() ?? (() => {});
    },
    destroy() {
      if (cleanup === null) return;
      const destroy = cleanup;
      cleanup = null;
      destroy();
    },
  };
}

export function resolveRequestedScrollMode(
  search: string
): RequestedScrollMode {
  const requested = new URLSearchParams(search).get("scroll");
  return requested === "lenis" ? "lenis" : "native";
}

export function resolveActiveScrollMode({
  requestedMode,
  reducedMotion,
  coarsePointer,
  compactViewport,
}: ScrollExperienceCapabilities): RequestedScrollMode {
  if (reducedMotion || coarsePointer || compactViewport) return "native";
  return requestedMode;
}

/** Inner pages deliberately ignore the homepage Lenis comparison switch. */
export function resolvePageScrollMode(_search: string): "native" {
  return "native";
}

export function resolvePageMotionExperience({
  reducedMotion,
  coarsePointer,
  compactViewport,
}: PageMotionCapabilities): PageMotionExperience {
  if (reducedMotion) return "reduced";
  if (coarsePointer || compactViewport) return "compact";
  return "cinematic";
}
