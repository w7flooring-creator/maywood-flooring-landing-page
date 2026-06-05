/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// 用 Astro 的 getViteConfig，保证测试与 Astro 构建共享同一套别名（@/*）、
// env 处理与插件链。默认 node 环境（纯逻辑 / Astro Container 测试无需 DOM）；
// 需要 DOM 的组件测试（如 ContactForm RTL）在文件顶部用
// `// @vitest-environment jsdom` 局部切换，无需全局引入 DOM。
export default getViteConfig({
  test: {
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      // Worker（Cloudflare）后端单测，见 worker/index.test.ts（#25）。
      "worker/**/*.{test,spec}.{ts,tsx}",
    ],
    setupFiles: ["src/test/setup.ts"],
    // 固定测试用的 Turnstile site key，让表单 island 测试稳定走 Phase 2 后端路径，
    // 不依赖本地 .env（git-ignored，CI 无此文件）。site key 为公开值，可直接写入。
    env: {
      PUBLIC_TURNSTILE_SITE_KEY: "0x4AAAAAADfHIQIwebzA9PP8",
    },
  },
});
