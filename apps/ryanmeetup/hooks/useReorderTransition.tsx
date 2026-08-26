import { useCallback, useLayoutEffect, useRef } from "react";

type ReorderTransitionOptions = {
  duration?: number;
  easing?: string;
};

// A FLIP transition for a list that reorders in place. React swaps the rows on
// the next render with no motion of its own, which reads as a flicker on a
// table this dense: every row repaints at once and nothing tells a visitor
// which row went where. Measuring before the swap and playing the difference
// back as a transform keeps each row travelling to its new place.
//
// `capture` has to run in the click handler, before the state change, so the
// rects belong to the old order. The layout effect then measures the new
// positions and animates the gap closed.
const useReorderTransition = (
  key: unknown,
  {
    duration = 320,
    easing = "cubic-bezier(0.2, 0, 0, 1)",
  }: ReorderTransitionOptions = {},
) => {
  const nodes = useRef(new Map<string, HTMLElement>());
  const previous = useRef<Map<string, DOMRect> | null>(null);

  // Rendering a row hands its node over; unmounting one takes it back, so a
  // row that leaves the board cannot leave a stale node behind.
  const register = useCallback(
    (id: string) => (node: HTMLElement | null) => {
      if (node) {
        nodes.current.set(id, node);
        return;
      }

      nodes.current.delete(id);
    },
    [],
  );

  const capture = useCallback(() => {
    const rects = new Map<string, DOMRect>();

    nodes.current.forEach((node, id) => {
      rects.set(id, node.getBoundingClientRect());
    });

    previous.current = rects;
  }, []);

  useLayoutEffect(() => {
    const rects = previous.current;

    previous.current = null;

    if (!rects) return;
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    nodes.current.forEach((node, id) => {
      const before = rects.get(id);

      if (!before) return;

      const offset = before.top - node.getBoundingClientRect().top;

      if (!offset) return;

      node.animate(
        [
          { transform: `translateY(${offset}px)` },
          { transform: "translateY(0px)" },
        ],
        { duration, easing },
      );
    });
    // The key is whatever ordering the caller is transitioning between; the
    // refs it reads are deliberately outside React's dependency tracking.
  }, [key, duration, easing]);

  return { capture, register };
};

export default useReorderTransition;
