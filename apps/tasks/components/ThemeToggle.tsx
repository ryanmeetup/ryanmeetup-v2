"use client";

import { IconButton, Tooltip } from "@ryanmeetup/ui";
import { useTheme } from "next-themes";
import { FiMoon, FiSun } from "react-icons/fi";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <Tooltip content="Toggle color theme">
      <IconButton
        label="Toggle color theme"
        size="md"
        onClick={() =>
          setTheme(
            document.documentElement.classList.contains("dark")
              ? "light"
              : "dark",
          )
        }
      >
        <FiMoon className="block dark:hidden" aria-hidden />
        <FiSun className="hidden dark:block" aria-hidden />
      </IconButton>
    </Tooltip>
  );
}
