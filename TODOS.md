- [x] generate logo and update app for this
- [ ] fix editor for complex react components
- [ ] add borders as a feature
- [ ] make the color pickers look better
- [ ] add support for gradients as well
- [ ] make key bindings work for the visual editor

this is not working, revamp the entire @src/app/preview/[id]/page.tsx which is the react web editor it should be react sandbox with visual editing features as well like in v0 use any packages you think you'll need to do this this is an app that can preview any react component I can copy paste into it and allow me to edit the component visually by selecting elements inside it and making the change. the color palette is red and black with hints of green. maintaining the existing feature of auto saving the component.

```typescript
import React, { useEffect, useRef, useState } from "react";

type Product = {
  id: string;
  title: string;
  subtitle?: string;
  price: string;
  image: string;
};

const defaultProducts: Product[] = [
  {
    id: "1",
    title: "Aurora Headphones",
    subtitle: "Immersive sound, all day",
    price: "$199",
    image: "https://picsum.photos/seed/p1/800/600",
  },
  {
    id: "2",
    title: "Nimbus Smartwatch",
    subtitle: "Track, connect, achieve",
    price: "$249",
    image: "https://picsum.photos/seed/p2/800/600",
  },
    {
    id: "3",
    title: "Solstice Camera",
    subtitle: "Capture the moment",
    price: "$899",
    image: "https://picsum.photos/seed/p3/800/600",
  },
  {
    id: "4",
    title: "Vortex Speaker",
    subtitle: "Bold bass, crisp highs",
    price: "$149",
    image: "https://picsum.photos/seed/p4/800/600",
  },
  {
    id: "5",
    title: "Stratus Laptop",
    subtitle: "Power meets portability",
    price: "$1,299",
    image: "https://picsum.photos/seed/p5/800/600",
  },
];

export function ProductCarousel({ products = defaultProducts }: { products?: Product[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const gap = 16; // keep in sync with CSS

  // Update index based on scroll position
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => {
      const firstCard = el.children[0] as HTMLElement | undefined;
      if (!firstCard) return;
      const slideW = firstCard.offsetWidth + gap;
      const i = Math.round(el.scrollLeft / slideW);
      setIndex(Math.max(0, Math.min(products.length - 1, i)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [products.length]);

  const scrollToIndex = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.children[i] as HTMLElement | undefined;
    if (!card) return;
    el.scrollTo({ left: card.offsetLeft - (el.clientLeft || 0), behavior: "smooth" });
  };

  const next = () => scrollToIndex(Math.min(products.length - 1, index + 1));
  const prev = () => scrollToIndex(Math.max(0, index - 1));

  // Keyboard navigation on container
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    c.addEventListener("keydown", onKey);
    return () => c.removeEventListener("keydown", onKey);
  });

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Product carousel"
      style={{ position: "relative", width: "100%", maxWidth: 1200, margin: "0 auto" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Featured Products</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <IconButton onClick={prev} disabled={index === 0} ariaLabel="Previous slide">
            <ArrowLeft />
          </IconButton>
          <IconButton onClick={next} disabled={index === products.length - 1} ariaLabel="Next slide">
            <ArrowRight />
          </IconButton>
        </div>
      </div>

      <div className="carousel-track" ref={trackRef}>
        {products.map((p, i) => (
          <div className="card" key={p.id} aria-roledescription="slide" aria-label={`${p.title} (${i + 1} of ${products.length})`}>
            <div className="media">
              <img src={p.image} alt={p.title} loading="lazy" />
              <div className="badge">New</div>
              <div className="glow" />
            </div>
            <div className="body">
              <div className="title-row">
                <h3 className="title">{p.title}</h3>
                <span className="price">{p.price}</span>
              </div>
              {p.subtitle && <p className="subtitle">{p.subtitle}</p>}
              <div className="actions">
                <button className="btn primary">Add to cart</button>
                <button className="btn ghost">Details</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="dots" role="tablist" aria-label="Carousel Pagination">
        {products.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={index === i}
            aria-label={`Go to slide ${i + 1}`}
            className={`dot${index === i ? " active" : ""}`}
            onClick={() => scrollToIndex(i)}
          />
        ))}
      </div>

      <style>{`
        .carousel-track {
          display: flex;
          gap: ${gap}px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          padding: 6px 6px 18px 6px;
          -webkit-overflow-scrolling: touch;
        }
        .carousel-track::-webkit-scrollbar { height: 8px; }
        .carousel-track::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #bbb, #999);
          border-radius: 99px;
        }
        .card {
          position: relative;
          flex: 0 0 auto;
          width: clamp(260px, 60vw, 360px);
          scroll-snap-align: start;
          background: white;
          border-radius: 14px;
          box-shadow:
            0 1px 2px rgba(0,0,0,.05),
            0 8px 24px rgba(0,0,0,.08);
          overflow: hidden;
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .card:hover {
          transform: translateY(-3px);
          box-shadow:
            0 2px 8px rgba(0,0,0,.06),
            0 16px 36px rgba(0,0,0,.12);
        }
        .media {
          position: relative;
          height: 200px;
          background: linear-gradient(135deg, #eef1ff, #f7f9ff);
          overflow: hidden;
        }
        .media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          mix-blend-mode: multiply;
          filter: saturate(1.05) contrast(1.02);
        }
        .badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(17, 24, 39, .85);
          color: white;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 999px;
          letter-spacing: .2px;
        }
        .glow {
          position: absolute;
          inset: -30%;
          background: radial-gradient(600px 200px at 20% 0%, rgba(59,130,246,.25), transparent 60%),
                      radial-gradient(400px 180px at 80% 20%, rgba(99,102,241,.25), transparent 60%);
          pointer-events: none;
          filter: blur(8px);
        }
        .body {
          padding: 14px 14px 16px;
        }
        .title-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }
        .title {
          margin: 0;
          font-size: 16px;
          line-height: 1.2;
        }
        .subtitle {
          margin: 6px 0 0 0;
          color: #4b5563;
          font-size: 14px;
        }
        .price {
          font-weight: 700;
          color: #111827;
        }
        .actions {
          margin-top: 12px;
          display: flex;
          gap: 8px;
        }
        .btn {
          appearance: none;
          border: 0;
          border-radius: 10px;
          padding: 10px 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: transform .1s ease, background .2s ease, box-shadow .2s ease;
        }
        .btn.primary {
          background: linear-gradient(135deg, #111827, #1f2937);
          color: white;
          box-shadow: 0 4px 14px rgba(0,0,0,.15);
        }
        .btn.primary:hover { transform: translateY(-1px); }
        .btn.ghost {
          background: #f3f4f6;
          color: #111827;
        }
        .btn.ghost:hover {
          background: #e5e7eb;
        }
        .dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 10px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #d1d5db;
          border: 0;
          cursor: pointer;
          transition: transform .15s ease, background .2s ease, width .2s ease;
        }
        .dot.active {
          background: #111827;
          width: 18px;
          border-radius: 999px;
        }

        /* Responsive sizing */
        @media (min-width: 640px) {
          .card { width: clamp(280px, 40vw, 360px); }
        }
        @media (min-width: 1024px) {
          .card { width: 320px; }
        }
      `}</style>
    </div>
  );
}

function IconButton({
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        border: 0,
        display: "grid",
        placeItems: "center",
        background: disabled ? "#e5e7eb" : "#111827",
        color: disabled ? "#9ca3af" : "white",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 6px 18px rgba(0,0,0,.15)",
        transition: "transform .1s ease, opacity .2s ease",
      }}
      onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
      onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
    >
      {children}
    </button>
  );
}

function ArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```
