"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Fits document content onto a single page by shrinking the font size just
// enough (11px down to a floor of 8px). Runs in the preview AND in the
// headless-Chrome PDF render (which waits for data-fitted), so screen and
// file are always identical. Height scales ~linearly with font size, so a
// proportional first guess converges in one or two passes.
export function OnePageFit({
  maxHeightPx,
  children,
}: {
  maxHeightPx: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(11);
  const [fitted, setFitted] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || fitted) return;
    const height = el.scrollHeight;
    if (height > maxHeightPx && size > 8) {
      const next = Math.max(8, Math.floor(size * (maxHeightPx / height) * 10) / 10);
      if (next < size) {
        setSize(next);
        return;
      }
    }
    setFitted(true);
  }, [size, fitted, maxHeightPx]);

  return (
    <div
      ref={ref}
      data-fitted={fitted ? "true" : undefined}
      style={{ fontSize: `${size}px`, lineHeight: 1.35 }}
    >
      {children}
    </div>
  );
}
