import { getViteConfig } from "astro/config";

// 用 Astro 的 getViteConfig，保证测试与 Astro 构建共享同一套别名（@/*）、
// env 处理与插件链。纯逻辑测试默认 node 环境即可，无需 DOM。
export default getViteConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts"],
  },
});
