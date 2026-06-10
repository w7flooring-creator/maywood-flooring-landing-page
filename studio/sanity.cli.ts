import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || "",
    dataset: process.env.SANITY_STUDIO_DATASET || "production",
  },
  // 托管 Studio 地址：https://maywoodflooring.sanity.studio（`sanity deploy` 目标）。
  studioHost: "maywoodflooring",
});
