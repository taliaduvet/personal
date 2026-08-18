"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "studio-os:theme";

function isDaytime() {
  const h = new Date().getHours();
  return h >= 7 && h < 20; // 7am–8pm = light
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
  } else if (theme === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    // Auto: time-based
    root.setAttribute("data-theme", isDaytime() ? "light" : "dark");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme) ?? "system";
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  return { theme, setTheme };
}
