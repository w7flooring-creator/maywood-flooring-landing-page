import { createClient, type SanityClient } from "@sanity/client";

/**
 * Build-time Sanity client。
 * 决策：public dataset → build 时无需 read token（见 AGENTS.md「已敲定决策」）。
 * 惰性构造，避免在缺少 env 时于 import 阶段抛错。
 */
let client: SanityClient | undefined;

export function getSanityClient(): SanityClient {
  if (!client) {
    client = createClient({
      projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
      dataset: import.meta.env.PUBLIC_SANITY_DATASET ?? "production",
      apiVersion: "2025-01-01",
      useCdn: true,
    });
  }
  return client;
}
