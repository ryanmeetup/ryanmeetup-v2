"use client";

import { useEffect, useMemo, useState } from "react";

export function useProximityOptions<
  T extends { value: string; group?: { label: string } },
>(options: T[], proximityValue?: string, proximityGroup?: string) {
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
    const proximityOptions = proximityValue
      ? options.filter((option) => option.value === proximityValue)
      : proximityGroup
        ? options.filter((option) => option.group?.label === proximityGroup)
        : [];
    if (proximityOptions.length === 0) return options;
    const proximityValues = new Set(
      proximityOptions.map((option) => option.value),
    );
    const remainingOptions = options.filter(
      (option) => !proximityValues.has(option.value),
    );
    return opensUpward
      ? [...remainingOptions, ...proximityOptions]
      : [...proximityOptions, ...remainingOptions];
  }, [opensUpward, options, proximityGroup, proximityValue]);

  return { opensUpward, orderedOptions, setAnchorElement };
}
