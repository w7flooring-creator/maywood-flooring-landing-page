export type NavigationDirection = "forward" | "back";

interface NavigationTransitionRuntimeOptions {
  document?: Document;
  loadingDelay?: number;
}

interface AstroPreparationEvent extends Event {
  direction?: NavigationDirection;
}

interface AstroBeforeSwapEvent extends Event {
  newDocument?: Document;
}

/** Install the single global adapter for Astro's client-navigation lifecycle. */
export function installNavigationTransitionRuntime({
  document: currentDocument = document,
  loadingDelay = 240,
}: NavigationTransitionRuntimeOptions = {}): () => void {
  let loadingTimer: ReturnType<typeof setTimeout> | null = null;
  let direction: NavigationDirection = "forward";

  const clearLoading = () => {
    if (loadingTimer !== null) {
      clearTimeout(loadingTimer);
      loadingTimer = null;
    }
    currentDocument.documentElement.classList.remove("is-navigation-loading");
  };

  const startPreparation = (event: Event) => {
    clearLoading();
    direction =
      (event as AstroPreparationEvent).direction === "back"
        ? "back"
        : "forward";
    loadingTimer = setTimeout(() => {
      loadingTimer = null;
      currentDocument.documentElement.classList.add("is-navigation-loading");
    }, loadingDelay);
  };

  const prepareIncomingDocument = (event: Event) => {
    clearLoading();
    const incoming = (event as AstroBeforeSwapEvent).newDocument;
    if (!incoming) return;
    incoming.documentElement.dataset.navigationEntry = "client";
    incoming.documentElement.dataset.transitionFrom =
      currentDocument.body.dataset.transitionProfile ?? "minimal";
    incoming.documentElement.dataset.transitionTo =
      incoming.body.dataset.transitionProfile ?? "minimal";
    incoming.documentElement.dataset.transitionDirection = direction;
  };

  currentDocument.addEventListener(
    "astro:before-preparation",
    startPreparation
  );
  currentDocument.addEventListener("astro:after-preparation", clearLoading);
  currentDocument.addEventListener(
    "astro:before-swap",
    prepareIncomingDocument
  );
  currentDocument.addEventListener("astro:page-load", clearLoading);

  return () => {
    clearLoading();
    currentDocument.removeEventListener(
      "astro:before-preparation",
      startPreparation
    );
    currentDocument.removeEventListener(
      "astro:after-preparation",
      clearLoading
    );
    currentDocument.removeEventListener(
      "astro:before-swap",
      prepareIncomingDocument
    );
    currentDocument.removeEventListener("astro:page-load", clearLoading);
  };
}
