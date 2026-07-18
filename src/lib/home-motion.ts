export type RequestedScrollMode = "native" | "lenis";

interface ScrollExperienceCapabilities {
  requestedMode: RequestedScrollMode;
  reducedMotion: boolean;
  coarsePointer: boolean;
  compactViewport: boolean;
}

export interface HomeMotionLifecycle {
  readonly active: boolean;
  start(): void;
  destroy(): void;
}

export interface ScrollPositionSnapshot {
  y: number;
  progress: number;
}

export interface RevealMotionPolicy {
  fade: boolean;
  distance: number;
  duration: number;
  amount: number;
  margin: "0px 0px -8% 0px" | "0px 0px 160px 0px";
}

export function resolveRevealMotion(
  compactExperience: boolean,
  layer: string | null | undefined
): RevealMotionPolicy {
  if (!compactExperience) {
    return {
      fade: true,
      distance: 32,
      duration: 0.9,
      amount: 0.16,
      margin: "0px 0px -8% 0px",
    };
  }

  return {
    fade: layer !== "media" && layer !== "card",
    distance: 18,
    duration: 0.72,
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

export function observeMediaChanges(
  queries: MediaQueryList[],
  listener: () => void
): () => void {
  queries.forEach((query) => query.addEventListener("change", listener));
  return () => {
    queries.forEach((query) => query.removeEventListener("change", listener));
  };
}

export function createHomeMotionLifecycle(
  setup: () => (() => void) | void
): HomeMotionLifecycle {
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
