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

type SignaturePanelStyle = React.CSSProperties & {
  "--signature-panel-grow": number;
  "--signature-panel-tilt": string;
  "--signature-media-shift": string;
};

const EXPAND_RATIO = 0.52;
const TILT_DEGREES = 8;
const PARALLAX_PIXELS = 16;

/**
 * SignatureCollectionsGallery —— React Bits Accordion Gallery 的 Maywood 版本。
 *
 * 桌面与平板端用 hover / focus / 方向键选择一个展开的系列；展开比例、3D 倾斜、
 * 图片视差与文案 stagger 对齐 React Bits Accordion Gallery 的默认运动语言。每张卡
 * 仍是真链接。窄手机由 CSS 降级为完整的纵向图文卡，避免压缩横向互动。动画复用
 * 项目已有的 CSS / Motion 节奏，不额外引入 React Bits 示例所需的 GSAP。
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

  const expandedGrow =
    items.length > 1
      ? (EXPAND_RATIO * (items.length - 1)) / (1 - EXPAND_RATIO)
      : 1;

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
        const position = active
          ? "active"
          : index < activeIndex
            ? "before"
            : "after";
        const drift = Math.max(-1.5, Math.min(1.5, activeIndex - index));
        const panelStyle: SignaturePanelStyle = {
          "--signature-panel-grow": active ? expandedGrow : 1,
          "--signature-panel-tilt": active
            ? "0deg"
            : `${index < activeIndex ? TILT_DEGREES : -TILT_DEGREES}deg`,
          "--signature-media-shift": active
            ? "0px"
            : `${drift * PARALLAX_PIXELS}px`,
        };

        return (
          <li
            className="signature-gallery__item"
            data-position={position}
            key={item.href}
            style={panelStyle}
          >
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
              aria-current={active ? "true" : undefined}
              aria-label={`Explore ${item.title}`}
            >
              <span className="signature-gallery__frame">
                <span className="signature-gallery__media">
                  {item.image ? (
                    <img
                      className="signature-gallery__image"
                      src={item.image.src}
                      srcSet={item.image.srcSet ?? undefined}
                      sizes="(min-width: 60rem) 38rem, 63vw"
                      alt={item.image.alt}
                      loading="lazy"
                      decoding="async"
                      draggable="false"
                    />
                  ) : (
                    <span
                      className="signature-gallery__image signature-gallery__image--empty"
                      aria-hidden="true"
                    />
                  )}
                </span>
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
