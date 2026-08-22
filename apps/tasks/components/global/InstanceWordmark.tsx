"use client";

import { useInstance } from "./InstanceProvider";

/**
 * The instance's name in the header, sidebar, and sign-in card.
 *
 * Renders only the mark itself so each call site keeps owning its own size and
 * font classes. An instance that sets `NEXT_PUBLIC_INSTANCE_LOGO_PATH` gets an
 * image scaled to the surrounding text size; every other instance gets its name
 * in the display face.
 */
export function InstanceWordmark() {
  const instance = useInstance();
  if (!instance.logoPath) return <>{instance.name}</>;

  // The logo is an instance-configured path rather than a build-time import, so
  // its intrinsic dimensions are unknown and `next/image` has nothing to
  // optimize against. The surrounding type scale already sizes it.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={instance.logoPath}
      alt={instance.name}
      className="inline-block h-[1em] w-auto align-baseline"
    />
  );
}
