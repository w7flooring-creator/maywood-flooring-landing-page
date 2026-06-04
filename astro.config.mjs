// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Phase 1：纯静态（SSG）。Cloudflare Pages 直接托管 dist/，无需 adapter。
// 若以后需要 SSR / on-demand 渲染，再加 @astrojs/cloudflare。
// 表单（Phase 2）走 Cloudflare Pages Functions（/functions 目录），与此独立。
export default defineConfig({
  site: 'https://www.maywoodflooring.com.au',
  output: 'static',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
