import * as React from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import type { GalleryItem } from "@/lib/gallery";
import { sanityImageUrl, sanityImageSrcset } from "@/lib/sanity-image";

/**
 * GalleryLightbox —— Gallery 页（/gallery，issue #19）的图库网格 + lightbox island。
 *
 * 组件策略（AGENTS.md「图库 lightbox」）：复用 yet-another-react-lightbox
 * （已在 package.json，#13 引入），**不加新依赖**。retheme 成品牌外观（暖中性、
 * 克制 editorial，非 SaaS）。
 *
 * 为何网格也在 island 里：点击任一图开 lightbox 需要浏览器状态（open / index），
 * 把网格与 lightbox 放同一 island 最自然——每张图是真 <button>，点击在对应 index
 * 打开 lightbox。响应式 masonry（CSS columns）保持 editorial 留白。
 *
 * 行为 / a11y：
 *  - 每张图是 <button>（Tab 可达、Enter/Space 触发），有意义 aria-label / alt；
 *  - 缺 alt 时回落到「Maywood Flooring gallery image N」（绝不空 alt / 破图）；
 *  - lightbox 自带 ←/→/Esc 键盘支持与 focus trap，slides 带 alt 与 caption。
 *  - 生产不热链 Wix：url 由页面 build 时从 Sanity 投影（asset->url）。
 *
 * 由 gallery.astro 以 client:visible 挂载（图库在首屏下方，按需 hydrate）。
 */

interface Props {
  items: GalleryItem[];
}

export default function GalleryLightbox({ items }: Props) {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);

  // 无图：不渲染（页面侧另出优雅空态，这里是防御）。
  if (items.length === 0) return null;

  const altFor = (item: GalleryItem, i: number) =>
    item.alt ?? `Maywood Flooring gallery image ${i + 1}`;

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  return (
    <div className="gallery-grid">
      <ul
        className="m-0 list-none gap-4 p-0 [column-gap:1rem] sm:columns-2 lg:columns-4 xl:columns-5"
        role="list"
        aria-label="Gallery images"
      >
        {items.map((item, i) => (
          <li key={item._id} className="mb-4 break-inside-avoid">
            <button
              type="button"
              onClick={() => openAt(i)}
              aria-label={`View ${altFor(item, i)} full screen`}
              data-motion-layer="interactive"
              className="group block w-full cursor-zoom-in overflow-hidden rounded-[var(--radius-cta)] bg-[var(--color-bg-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-cta)]"
            >
              <img
                data-motion-layer="media"
                src={sanityImageUrl(item.url, { width: 768 })}
                srcSet={
                  sanityImageSrcset(item.url, [320, 480, 768, 1080]) ||
                  undefined
                }
                sizes="(min-width: 80rem) 20vw, (min-width: 64rem) 25vw, (min-width: 40rem) 50vw, 100vw"
                alt={altFor(item, i)}
                loading={i < 3 ? "eager" : "lazy"}
                decoding="async"
                className="block w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </button>
          </li>
        ))}
      </ul>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        on={{ view: ({ index: i }) => setIndex(i) }}
        slides={items.map((item, i) => ({
          src: sanityImageUrl(item.url, { width: 1600 }),
          alt: altFor(item, i),
          title: item.title ?? undefined,
          description: item.caption ?? undefined,
        }))}
      />
    </div>
  );
}
