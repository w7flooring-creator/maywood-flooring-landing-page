import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sanityImageUrl, sanityImageSrcset } from "@/lib/sanity-image";

/**
 * ProductCarousel —— About 页「Explore Our Products」缩略图轮播（对齐 Wix 底部轮播）。
 *
 * 组件策略（AGENTS.md「轮播 → Embla Carousel」）：复用 embla-carousel-react
 * （已在 package.json，ProductImageGallery 已用），**不加新依赖**。retheme 成品牌外观
 * （暖中性、克制 editorial）。每张缩略图是链向 /product-page/<slug> 的真实链接。
 *
 * 数据：build 时由 about-us.astro 从 Sanity 取精选产品（getFeaturedProducts），
 * 仅含有主图的已发布产品。无产品 → 不渲染（页面侧另判空），绝不空轮播 / 破图。
 *
 * a11y：左右按钮为真 <button>（aria-label + disabled 边界态）；视口 role="region"；
 * 缩略图链接含产品名 alt。生产不热链 Wix：图片走 Sanity CDN（sanityImageUrl 优化）。
 */

export interface CarouselProduct {
  _id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
}

interface Props {
  items: CarouselProduct[];
}

export default function ProductCarousel({ items }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    containScroll: "trimSnaps",
  });
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);

  const onSelect = React.useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
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

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <div
        className="overflow-hidden"
        ref={emblaRef}
        role="region"
        aria-label="Explore our products"
      >
        <ul className="m-0 flex list-none gap-4 p-0">
          {items.map((item) => (
            <li
              key={item._id}
              className="min-w-0 shrink-0 grow-0 basis-[60%] sm:basis-[40%] lg:basis-[24%]"
            >
              <a
                href={`/product-page/${item.slug}`}
                className="group block text-inherit no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-cta)]"
              >
                {item.imageUrl ? (
                  <img
                    src={sanityImageUrl(item.imageUrl, { width: 480 })}
                    srcSet={
                      sanityImageSrcset(item.imageUrl, [240, 360, 480, 640]) ||
                      undefined
                    }
                    sizes="(min-width: 64rem) 24vw, (min-width: 40rem) 40vw, 60vw"
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="block aspect-square w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                    style={{
                      border: "1px solid var(--color-border-hairline, #e5e2dd)",
                    }}
                  />
                ) : (
                  <span
                    className="block aspect-square w-full bg-[var(--color-bg-muted)]"
                    aria-hidden="true"
                  />
                )}
                <span
                  className="mt-3 block group-hover:underline"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "1.05rem",
                    color: "var(--color-ink)",
                  }}
                >
                  {item.title}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!canPrev}
          aria-label="Previous products"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-cta)] border border-[var(--color-cta)] bg-transparent text-[var(--color-ink)] transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          disabled={!canNext}
          aria-label="Next products"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-cta)] border border-[var(--color-cta)] bg-transparent text-[var(--color-ink)] transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
