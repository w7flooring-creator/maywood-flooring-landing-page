/**
 * Vitest 全局 setup —— 注册 jest-dom 自定义匹配器并在每个测试后清理 DOM。
 *
 * node 环境的纯逻辑测试不触碰 DOM，故 cleanup 用可选链守卫；
 * jsdom 环境（组件 RTL 测试）下 @testing-library/react 的 cleanup 生效，
 * 避免测试间 DOM 泄漏。
 */
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
