import * as React from "react";

import "./SignatureCollectionsGallery.css";

export interface SignatureCollectionGalleryItem {
  title: string;
  href: string;
  description: string | null;
  image: {
    src: string;
    srcSet: string | null;
    alt: string;
  } | null;
}

interface Props {
  items: SignatureCollectionGalleryItem[];
}

/**
 * SignatureCollectionsGallery —— React Bits Accordion Gallery 的 Maywood 版本。
 *
 * 桌面端用 hover / focus / 方向键选择一个展开的系列；每张卡仍是真链接，点击直接
 * 进入系列落地页。移动端由 CSS 降级为完整的纵向图文卡，避免把横向折叠互动压缩到
 * 触屏上。动画以轻量 CSS transition 完成，不再引入 React Bits 示例所需的 GSAP。
 */
export default function SignatureCollectionsGallery({ items }: Props) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const itemRefs = React.useRef<Array<HTMLAnchorElement | null>>([]);

  if (items.length === 0) return null;

  const select = (index: number, moveFocus = false) => {
    const nextIndex = (index + items.length) % items.length;
    setActiveIndex(nextIndex);
    if (moveFocus) itemRefs.current[nextIndex]?.focus();
  };

  const onKeyDown = (
    event: React.KeyboardEvent<HTMLAnchorElement>,
    index: number
  ) => {
    const nextKeys = ["ArrowRight", "ArrowDown"];
    const previousKeys = ["ArrowLeft", "ArrowUp"];

    if (nextKeys.includes(event.key)) {
      event.preventDefault();
      select(index + 1, true);
    } else if (previousKeys.includes(event.key)) {
      event.preventDefault();
      select(index - 1, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      select(0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      select(items.length - 1, true);
    }
  };

  return (
    <ul
      className="signature-gallery"
      role="list"
      aria-label="Signature collections"
    >
      {items.map((item, index) => {
        const active = index === activeIndex;

        return (
          <li className="signature-gallery__item" key={item.href}>
            <a
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              className="signature-gallery__card"
              data-active={active ? "true" : "false"}
              href={item.href}
              onFocus={() => setActiveIndex(index)}
              onPointerEnter={(event) => {
                if (event.pointerType !== "touch") setActiveIndex(index);
              }}
              onKeyDown={(event) => onKeyDown(event, index)}
              aria-label={`Explore ${item.title}`}
            >
              <span className="signature-gallery__frame">
                {item.image ? (
                  <img
                    className="signature-gallery__image"
                    src={item.image.src}
                    srcSet={item.image.srcSet ?? undefined}
                    sizes="(min-width: 60rem) 42vw, 100vw"
                    alt={item.image.alt}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span
                    className="signature-gallery__image signature-gallery__image--empty"
                    aria-hidden="true"
                  />
                )}
                <span className="signature-gallery__veil" aria-hidden="true" />
              </span>
              <span className="signature-gallery__content">
                <span className="signature-gallery__rule" aria-hidden="true" />
                <span className="signature-gallery__copy">
                  <span className="signature-gallery__title">{item.title}</span>
                  {item.description && (
                    <span className="signature-gallery__description">
                      {item.description}
                    </span>
                  )}
                  <span className="signature-gallery__link">
                    Explore collection
                  </span>
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
