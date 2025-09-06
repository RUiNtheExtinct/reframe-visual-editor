 
import React, { useCallback, useEffect, useRef, useState } from "react";

export function BoxOverlay({
  rect,
  container,
  colorClass,
}: {
  rect: DOMRect;
  container: HTMLDivElement | null;
  colorClass: string;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    const hostRect = container?.getBoundingClientRect();
    if (!hostRect) return;
    setStyle({
      position: "absolute",
      left: rect.left - hostRect.left,
      top: rect.top - hostRect.top,
      width: rect.width,
      height: rect.height,
      pointerEvents: "none",
    });
  }, [rect, container]);
  return <div className={`absolute ring-2 ${colorClass} rounded-sm`} style={style} />;
}

export function ResizeOverlay({
  rect,
  container,
  colorClass,
  onResizeStart,
  onResize,
  onResizeEnd,
  onDragStart,
  onDrag,
  onDragEnd,
  onRotateStart,
  onRotate,
  onRotateEnd,
  requestFreshRect,
}: {
  rect: DOMRect;
  container: HTMLDivElement | null;
  colorClass: string;
  onResizeStart: () => void;
  onResize: (nextW?: number, nextH?: number) => void;
  onResizeEnd: (finalW?: number, finalH?: number) => void;
  onDragStart: () => void;
  onDrag: (dx: number, dy: number) => void;
  onDragEnd: (dx?: number, dy?: number) => void;
  onRotateStart: () => void;
  onRotate: (angleDeg: number) => void;
  onRotateEnd: (angleDeg: number) => void;
  requestFreshRect: () => DOMRect | null;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const rafRef = useRef<number | null>(null);
  const pendingStyleRef = useRef<React.CSSProperties | null>(null);
  const scheduleStyleUpdate = useCallback((next: React.CSSProperties) => {
    pendingStyleRef.current = next;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (pendingStyleRef.current) setStyle(pendingStyleRef.current);
      pendingStyleRef.current = null;
    });
  }, []);
  useEffect(() => {
    const hostRect = container?.getBoundingClientRect();
    if (!hostRect) return;
    scheduleStyleUpdate({
      position: "absolute",
      left: rect.left - hostRect.left,
      top: rect.top - hostRect.top,
      width: rect.width,
      height: rect.height,
      pointerEvents: "none",
    });
  }, [rect, container, scheduleStyleUpdate]);

  useEffect(() => {
    const onResizeWindow = () => {
      const fresh = requestFreshRect?.();
      if (!fresh) return;
      const hostRect = container?.getBoundingClientRect();
      if (!hostRect) return;
      scheduleStyleUpdate({
        position: "absolute",
        left: fresh.left - hostRect.left,
        top: fresh.top - hostRect.top,
        width: fresh.width,
        height: fresh.height,
        pointerEvents: "none",
      });
    };
    window.addEventListener("resize", onResizeWindow);
    return () => window.removeEventListener("resize", onResizeWindow);
  }, [container, requestFreshRect]);

  const startRef = useRef<{ x: number; y: number; rect: DOMRect; mode: string } | null>(null);
  const startDrag = (e: React.PointerEvent, mode: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startRect = requestFreshRect?.() || rect;
    startRef.current = { x: e.clientX, y: e.clientY, rect: startRect, mode };
    onResizeStart?.();
    const onMove = (ev: PointerEvent) => {
      const st = startRef.current;
      if (!st) return;
      const dx = ev.clientX - st.x;
      const dy = ev.clientY - st.y;
      let nextW: number | undefined = undefined;
      let nextH: number | undefined = undefined;
      if (st.mode.includes("e")) nextW = Math.max(1, st.rect.width + dx);
      if (st.mode.includes("s")) nextH = Math.max(1, st.rect.height + dy);
      if (st.mode.includes("w")) nextW = Math.max(1, st.rect.width - dx);
      if (st.mode.includes("n")) nextH = Math.max(1, st.rect.height - dy);
      onResize?.(nextW, nextH);
      const fresh = requestFreshRect?.();
      const hostRect = container?.getBoundingClientRect();
      if (fresh && hostRect) {
        scheduleStyleUpdate({
          position: "absolute",
          left: fresh.left - hostRect.left,
          top: fresh.top - hostRect.top,
          width: fresh.width,
          height: fresh.height,
          pointerEvents: "none",
        });
      }
    };
    const onUp = () => {
      const st = startRef.current;
      if (st) {
        const fresh = requestFreshRect?.() || st.rect;
        const dx = fresh.width - st.rect.width;
        const dy = fresh.height - st.rect.height;
        let finalW: number | undefined = undefined;
        let finalH: number | undefined = undefined;
        if (st.mode.includes("e") || st.mode.includes("w")) finalW = st.rect.width + dx;
        if (st.mode.includes("s") || st.mode.includes("n")) finalH = st.rect.height + dy;
        onResizeEnd?.(finalW, finalH);
      }
      startRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  // Move support
  const moveRef = useRef<{ x: number; y: number } | null>(null);
  const startMove = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    moveRef.current = { x: e.clientX, y: e.clientY };
    onDragStart?.();
    const onMove = (ev: PointerEvent) => {
      const st = moveRef.current;
      if (!st) return;
      const dx = ev.clientX - st.x;
      const dy = ev.clientY - st.y;
      onDrag?.(dx, dy);
      const fresh = requestFreshRect?.();
      const hostRect = container?.getBoundingClientRect();
      if (fresh && hostRect) {
        scheduleStyleUpdate({
          position: "absolute",
          left: fresh.left - hostRect.left,
          top: fresh.top - hostRect.top,
          width: fresh.width,
          height: fresh.height,
          pointerEvents: "none",
        });
      }
    };
    const onUp = (ev: PointerEvent) => {
      const st = moveRef.current;
      if (st) {
        const dx = ev.clientX - st.x;
        const dy = ev.clientY - st.y;
        onDragEnd?.(dx, dy);
      }
      moveRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  // Rotate support
  const rotateRef = useRef<{ cx: number; cy: number } | null>(null);
  const startRotate = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hostRect = container?.getBoundingClientRect();
    if (!hostRect) return;
    const fresh = requestFreshRect?.() || rect;
    const cx = fresh.left + fresh.width / 2;
    const cy = fresh.top + fresh.height / 2;
    rotateRef.current = { cx, cy };
    onRotateStart?.();
    const calcAngle = (ev: PointerEvent) => {
      const st = rotateRef.current;
      if (!st) return 0;
      const dx = ev.clientX - st.cx;
      const dy = ev.clientY - st.cy;
      return (Math.atan2(dy, dx) * 180) / Math.PI;
    };
    const onMove = (ev: PointerEvent) => {
      const ang = calcAngle(ev);
      onRotate?.(ang);
      const freshNow = requestFreshRect?.();
      const host = container?.getBoundingClientRect();
      if (freshNow && host) {
        scheduleStyleUpdate({
          position: "absolute",
          left: freshNow.left - host.left,
          top: freshNow.top - host.top,
          width: freshNow.width,
          height: freshNow.height,
          pointerEvents: "none",
        });
      }
    };
    const onUp = (ev: PointerEvent) => {
      const ang = (() => {
        const st = rotateRef.current;
        if (!st) return 0;
        const dx = ev.clientX - st.cx;
        const dy = ev.clientY - st.cy;
        return (Math.atan2(dy, dx) * 180) / Math.PI;
      })();
      onRotateEnd?.(ang);
      rotateRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const handle = (pos: string, cursor: string, styleExtra: React.CSSProperties) => (
    <div
      onPointerDown={(e) => startDrag(e, pos)}
      style={{
        position: "absolute",
        width: 10,
        height: 10,
        background: "#16a34a",
        border: "2px solid white",
        borderRadius: 2,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
        pointerEvents: "auto",
        ...styleExtra,
        cursor,
      }}
    />
  );

  return (
    <div className={`absolute ring-2 ${colorClass} rounded-sm`} style={style}>
      {/* drag layer to capture pointer events */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      {/* move handle */}
      <div
        onPointerDown={startMove}
        style={{
          position: "absolute",
          left: -28,
          top: -28,
          width: 16,
          height: 16,
          background: "#6b7280",
          border: "2px solid white",
          borderRadius: 4,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
          cursor: "move",
          pointerEvents: "auto",
        }}
      />
      {/* rotate handle */}
      <div
        onPointerDown={startRotate}
        style={{
          position: "absolute",
          left: "50%",
          top: -28,
          marginLeft: -8,
          width: 16,
          height: 16,
          background: "#22c55e",
          border: "2px solid white",
          borderRadius: 9999,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
          cursor: "grab",
          pointerEvents: "auto",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: -12,
          marginLeft: -1,
          width: 2,
          height: 12,
          background: "#22c55e",
          pointerEvents: "none",
        }}
      />
      {/* corners */}
      {handle("nw", "nwse-resize", { left: -5, top: -5 })}
      {handle("ne", "nesw-resize", { right: -5, top: -5 })}
      {handle("sw", "nesw-resize", { left: -5, bottom: -5 })}
      {handle("se", "nwse-resize", { right: -5, bottom: -5 })}
      {/* edges */}
      {handle("n", "ns-resize", { left: "50%", top: -6, marginLeft: -5 })}
      {handle("s", "ns-resize", { left: "50%", bottom: -6, marginLeft: -5 })}
      {handle("w", "ew-resize", { top: "50%", left: -6, marginTop: -5 })}
      {handle("e", "ew-resize", { top: "50%", right: -6, marginTop: -5 })}
    </div>
  );
}
