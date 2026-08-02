"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    try {
      localStorage.setItem("theme", nextTheme);
    } catch {
      // The theme still works when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    let savedTheme: string | null = null;
    try {
      savedTheme = localStorage.getItem("theme");
    } catch {
      // Use the dark default when browser storage is unavailable.
    }
    const initialTheme = savedTheme === "light" ? "light" : "dark";
    setThemeState(initialTheme);
    applyTheme(initialTheme);

    function syncTheme(event: StorageEvent) {
      if (
        event.key === "theme" &&
        (event.newValue === "light" || event.newValue === "dark")
      ) {
        setThemeState(event.newValue);
        applyTheme(event.newValue);
      }
    }
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
