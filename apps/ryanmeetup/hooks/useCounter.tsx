import { useState, useRef, useEffect } from "react";

const useCounter = (target: number, { duration = 1100 } = {}) => {
  const [value, setValue] = useState<number>(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef<number>(0);
  const toRef = useRef(target);

  useEffect(() => {
    fromRef.current = value;
    toRef.current = target;
    startRef.current = null;
    let frame: number;

    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const next = Math.round(
        fromRef.current + (toRef.current - fromRef.current) * eased,
      );

      setValue(next);
      if (p < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [target, duration, value]);

  return value;
};

export default useCounter;
