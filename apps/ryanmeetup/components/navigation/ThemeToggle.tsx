"use client";

import { useState, useEffect } from "react";

// Components
import { FaSun as Sun, FaMoon as Moon } from "react-icons/fa";

// Utilities
import { useTheme } from "next-themes";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const iconStyles = "fill-black w-5 h-5 dark:fill-white";

  if (!mounted) return null;

  return (
    <button
      className="rounded p-2 min-h-10 min-w-10 timing hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30"
      onClick={toggleTheme}
      aria-label={
        theme === "dark" ? "Change to Light Mode" : "Change to Dark Mode"
      }
    >
      {theme === "dark" ? (
        <Sun className={iconStyles} />
      ) : (
        <Moon className={iconStyles} />
      )}
    </button>
  );
};

export { ThemeToggle };
