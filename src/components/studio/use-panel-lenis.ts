import { useEffect, useRef, type RefObject } from "react";
import type Lenis from "lenis";

/**
 * Attach Lenis smooth scrolling to a scroll container.
 *
 * Refs are stable objects, so without `enabled` the effect runs once on mount
 * and silently no-ops for a container mounted later (the export dialog's code
 * pane). Pass a value that changes when the element appears.
 */
export function usePanelLenis(
  wrapperRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  enabled = true,
) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;

    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled || !wrapperRef.current || !contentRef.current) return;
      const lenis = new Lenis({
        wrapper: wrapperRef.current,
        content: contentRef.current,
        eventsTarget: wrapperRef.current,
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        lerp: 0.12,
        autoRaf: true,
        overscroll: false,
      });
      lenisRef.current = lenis;
    });

    return () => {
      cancelled = true;
      lenisRef.current?.destroy();
      lenisRef.current = null;
    };
  }, [wrapperRef, contentRef, enabled]);

  return lenisRef;
}
