import { useEffect, useRef, type RefObject } from "react";
import type Lenis from "lenis";

/**
 * Attach Lenis smooth scrolling to a scroll container.
 *
 * `enabled` exists because refs are stable objects: with only the refs in the
 * dependency array the effect runs exactly once, on mount. That is fine for a
 * container that is present from the start (the control panel), but silently
 * does nothing for one mounted later — the export dialog's code pane, whose
 * <pre> does not exist until the dialog opens. The effect saw two null refs,
 * returned early, and never re-ran. Pass the open state so it retries.
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
