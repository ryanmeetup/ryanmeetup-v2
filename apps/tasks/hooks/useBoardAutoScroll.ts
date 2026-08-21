"use client";

import { useEffect, type RefObject } from "react";
import { boardDragScrollSpeed } from "@/lib/tasks/board-drag";

export function useBoardAutoScroll(
  active: boolean,
  boardRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!active) return;
    let pointer = { x: 0, y: 0 };
    let animationFrame = 0;
    const rememberPointer = (event: DragEvent) => {
      if (event.clientX || event.clientY)
        pointer = { x: event.clientX, y: event.clientY };
    };
    const scrollAtEdges = () => {
      const verticalSpeed = boardDragScrollSpeed(
        pointer.y,
        0,
        window.innerHeight,
      );
      if (verticalSpeed) window.scrollBy(0, verticalSpeed);
      const board = boardRef.current;
      if (board) {
        const bounds = board.getBoundingClientRect();
        const left = Math.max(0, bounds.left);
        const right = Math.min(window.innerWidth, bounds.right);
        if (
          pointer.y >= bounds.top &&
          pointer.y <= bounds.bottom &&
          pointer.x >= left &&
          pointer.x <= right
        )
          board.scrollLeft += boardDragScrollSpeed(pointer.x, left, right);
      }
      animationFrame = window.requestAnimationFrame(scrollAtEdges);
    };
    window.addEventListener("dragover", rememberPointer);
    animationFrame = window.requestAnimationFrame(scrollAtEdges);
    return () => {
      window.removeEventListener("dragover", rememberPointer);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [active, boardRef]);
}
