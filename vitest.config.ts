/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// 用 Astro 的 getViteConfig，保证测试与 Astro 构建共享同一套别名（@/*）、
// env 处理与插件链。默认 node 环境（纯逻辑 / Astro Container 测试无需 DOM）；
// 需要 DOM 的组件测试（如 ContactForm RTL）在文件顶部用
// `// @vitest-environment jsdom` 局部切换，无需全局引入 DOM。
export default getViteConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
});
