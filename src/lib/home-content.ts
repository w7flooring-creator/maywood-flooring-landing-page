/**
 * 首页配图数据层 —— 从 Sanity `homePage` 单例拉取 hero / 专业伙伴 / Accessories 配图。
 *
 * 首页文案是静态的（home.ts / home-narrative.ts）；配图则由编辑在 Studio 管理，
 * 生产走 Sanity CDN（不热链 Wix）。无图时各字段为 null，组件优雅降级（muted 回落）。
 * 只有 getHomePageImages() 真正发请求；页面只消费它。
 */
import { getSanityClient } from "@/lib/sanity";

/** 一张可渲染的首页图（asset->url + alt）。 */
export interface HomeImage {
  url: string;
  alt: string | null;
}

export interface HomePageImages {
  heroImage: HomeImage | null;
  partnerImage: HomeImage | null;
  accessoriesImage: HomeImage | null;
  sustainabilityImage: HomeImage | null;
}

/** homePage 单例投影：解引用各图 asset->url + alt。 */
export const HOME_PAGE_QUERY = `*[_type == "homePage"][0]{
  "heroImage": heroImage{ "url": asset->url, alt },
  "partnerImage": partnerImage{ "url": asset->url, alt },
  "accessoriesImage": accessoriesImage{ "url": asset->url, alt },
  "sustainabilityImage": sustainabilityImage{ "url": asset->url, alt }
}`;

interface RawImage {
  url?: unknown;
  alt?: unknown;
}

/** 归一化：无 url 视为无图（null）；alt 空串收敛为 null。 */
export function normaliseHomeImage(
  raw: RawImage | null | undefined
): HomeImage | null {
  if (!raw || typeof raw.url !== "string" || raw.url.length === 0) return null;
  const alt =
    typeof raw.alt === "string" && raw.alt.trim().length > 0 ? raw.alt : null;
  return { url: raw.url, alt };
}

export async function getHomePageImages(): Promise<HomePageImages> {
  const raw = await getSanityClient().fetch<{
    heroImage?: RawImage;
    partnerImage?: RawImage;
    accessoriesImage?: RawImage;
    sustainabilityImage?: RawImage;
  } | null>(HOME_PAGE_QUERY);
  return {
    heroImage: normaliseHomeImage(raw?.heroImage),
    partnerImage: normaliseHomeImage(raw?.partnerImage),
    accessoriesImage: normaliseHomeImage(raw?.accessoriesImage),
    sustainabilityImage: normaliseHomeImage(raw?.sustainabilityImage),
  };
}
