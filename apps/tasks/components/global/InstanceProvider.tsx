"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import {
  instanceDefaults,
  instancePageTitle,
  type InstanceSettings,
} from "@/lib/instance";

/**
 * Resolved branding for client components.
 *
 * The root layout loads `instance_settings` on the server and seeds this
 * provider, so client code reads branding synchronously without a second round
 * trip. The default keeps components renderable in isolation and in tests.
 */
const InstanceContext = createContext<InstanceSettings>(instanceDefaults);

export function InstanceProvider({
  settings,
  children,
}: {
  settings: InstanceSettings;
  children: ReactNode;
}) {
  return (
    <InstanceContext.Provider value={settings}>
      {children}
    </InstanceContext.Provider>
  );
}

export function useInstance() {
  return useContext(InstanceContext);
}

/** Absolute document title, matching the server-side `pageTitle`. */
export function useInstancePageTitle() {
  const settings = useInstance();
  // Stable across renders so effects can depend on it without re-firing.
  return useCallback(
    (title: string) => instancePageTitle(settings, title),
    [settings],
  );
}
