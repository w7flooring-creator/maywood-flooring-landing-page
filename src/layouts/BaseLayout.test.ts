import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer } from "@astrojs/react/container-renderer";

import BaseLayout from "@/layouts/BaseLayout.astro";

const renderers = await loadRenderers([getContainerRenderer()]);

async function renderLayout(motionProfile: string | undefined) {
  const container = await AstroContainer.create({ renderers });
  return container.renderToString(BaseLayout, {
    props: {
      title: "Motion profile test",
      description: "A stable description used to render the layout.",
      path: "/motion-profile-test",
      motionProfile,
    },
    request: new Request(
      "https://www.maywoodflooring.com.au/motion-profile-test"
    ),
  });
}

describe("BaseLayout motion profile", () => {
  it("loads the inner-page controller for a public motion profile", async () => {
    const html = await renderLayout("catalog");

    expect(html).toContain("data-page-motion");
    expect(html).toContain('data-motion-profile="catalog"');
    expect(html).toContain("PageMotionController");
  });

  it("keeps internal pages controller-free when the profile is none", async () => {
    const html = await renderLayout("none");

    expect(html).not.toContain("data-page-motion");
    expect(html).not.toContain("data-motion-profile");
    expect(html).not.toContain("PageMotionController");
  });
});
