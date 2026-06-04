import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

/**
 * ProductImageGallery —— 产品详情页主图廊（issue #13），全站唯一图廊 island。
 *
 * 组件策略（AGENTS.md）：轮播用 Embla Carousel（轻量 headless），lightbox 用
 * yet-another-react-lightbox。两者都是选定的专项 headless 库，retheme 成品牌外观
 * （暖中性、克制，非 SaaS）。
 *
 * 行为：
 *  - 横向轮播，左右箭头 + 缩略图导航；点主图（或放大按钮）开 lightbox 全屏看图。
 *  - 键盘可操作：箭头按钮是真 <button>（Tab 可达、Enter/Space 触发）；
 *    缩略图是 <button>；lightbox 自带 ←/→/Esc 键盘支持与 focus trap。
 *  - 单图时不渲染箭头/缩略图（无意义的控件不出现）。
 *
 * 由 .astro 页以 client:visible 挂载（图廊在首屏下方，按需 hydrate）。
 */

export interface GalleryImage {
  url: string;
  alt: string | null;
}

interface Props {
  images: GalleryImage[];
  /** 产品名，用于无 alt 时给图片合理回落描述。 */
  productTitle: string;
}

export default function ProductImageGallery({ images, productTitle }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  const hasMultiple = images.length > 1;

  const onSelect = React.useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = React.useCallback(
    () => emblaApi?.scrollPrev(),
    [emblaApi]
  );
  const scrollNext = React.useCallback(
    () => emblaApi?.scrollNext(),
    [emblaApi]
  );
  const scrollTo = React.useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  // 无图：不渲染（页面侧也判空，这里是防御）。
  if (images.length === 0) return null;

  const altFor = (img: GalleryImage, index: number) =>
    img.alt ?? `${productTitle} — image ${index + 1}`;

  return (
    <div className="product-gallery">
      <div className="relative">
        <div
          className="overflow-hidden rounded-[var(--radius-cta)]"
          ref={emblaRef}
        >
          <div className="flex">
            {images.map((img, index) => (
              <div className="min-w-0 flex-[0_0_100%]" key={img.url}>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  aria-label={`View ${altFor(img, index)} full screen`}
                  className="group block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-cta)]"
                >
                  <img
                    src={img.url}
                    alt={altFor(img, index)}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="aspect-[4/3] w-full bg-[var(--color-bg-muted)] object-cover"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-[var(--radius-cta)] bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <Expand className="size-4" />
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={scrollPrev}
              aria-label="Previous image"
              className="absolute top-1/2 left-3 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--color-ink)] shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-cta)]"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              aria-label="Next image"
              className="absolute top-1/2 right-3 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--color-ink)] shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-cta)]"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <ul
          className="mt-4 flex flex-wrap gap-3"
          role="list"
          aria-label="Product image thumbnails"
        >
          {images.map((img, index) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => scrollTo(index)}
                aria-label={`Show image ${index + 1}`}
                aria-current={index === selectedIndex ? "true" : undefined}
                className={
                  "block size-16 overflow-hidden rounded-[var(--radius-cta)] border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-cta)] " +
                  (index === selectedIndex
                    ? "border-[var(--color-cta)]"
                    : "border-[var(--color-border-hairline)] hover:border-[var(--color-cta)]")
                }
              >
                <img
                  src={img.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={selectedIndex}
        on={{ view: ({ index }) => setSelectedIndex(index) }}
        slides={images.map((img, index) => ({
          src: img.url,
          alt: altFor(img, index),
        }))}
      />
    </div>
  );
}
