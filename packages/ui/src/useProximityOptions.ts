"use client";

import { useEffect, useMemo, useState } from "react";

export function useProximityOptions<T extends { value: string }>(
  options: T[],
  proximityValue?: string,
) {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [opensUpward, setOpensUpward] = useState(false);

  useEffect(() => {
    if (!anchorElement) return;
    const syncDirection = () =>
      setOpensUpward(anchorElement.dataset.anchor?.split(" ")[0] === "top");
    syncDirection();
    const observer = new MutationObserver(syncDirection);
    observer.observe(anchorElement, {
      attributeFilter: ["data-anchor"],
      attributes: true,
    });
    return () => observer.disconnect();
  }, [anchorElement]);

  const orderedOptions = useMemo(() => {
    if (!proximityValue) return options;
    const proximityOption = options.find(
      (option) => option.value === proximityValue,
    );
    if (!proximityOption) return options;
    const remainingOptions = options.filter(
      (option) => option.value !== proximityValue,
    );
    return opensUpward
      ? [...remainingOptions, proximityOption]
      : [proximityOption, ...remainingOptions];
  }, [opensUpward, options, proximityValue]);

  return { opensUpward, orderedOptions, setAnchorElement };
}
