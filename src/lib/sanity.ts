import { createClient, type SanityClient } from "@sanity/client";

/**
 * Build-time Sanity client。
 * 该项目的 production dataset 虽为 public，但匿名（无 token）读取实测返回空，
 * 故 build 时用只读 token 拉取内容（见 docs/adr/0003）。token 仅服务端可见
 * （非 PUBLIC_ 前缀，不进客户端 bundle），来自 .env / CI Secret / Cloudflare Secret。
 * 惰性构造，避免在缺少 env 时于 import 阶段抛错。
 */
let client: SanityClient | undefined;

export function getSanityClient(): SanityClient {
  if (!client) {
    const token = import.meta.env.SANITY_API_READ_TOKEN;
    client = createClient({
      projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
      dataset: import.meta.env.PUBLIC_SANITY_DATASET ?? "production",
      apiVersion: "2025-01-01",
      token: token || undefined,
      // 有 token → 走 live API（apicdn 对 token 读取有缓存）；无 token → 回退 CDN。
      useCdn: !token,
    });
  }
  return client;
}
