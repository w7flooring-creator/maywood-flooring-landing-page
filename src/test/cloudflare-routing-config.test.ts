import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseConfigFileTextToJson } from "typescript";

describe("Cloudflare production routing", () => {
  it("runs the Worker before static assets so the apex redirect is observable", () => {
    const configUrl = new URL("../../wrangler.jsonc", import.meta.url);
    const configText = readFileSync(configUrl, "utf8");
    const parsed = parseConfigFileTextToJson("wrangler.jsonc", configText);

    expect(parsed.error).toBeUndefined();
    expect(parsed.config.assets?.run_worker_first).toBe(true);
  });
});
