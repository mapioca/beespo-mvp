"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppTheme = "light" | "dark";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const STORAGE_KEY = "beespo-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizeTheme(theme: string | null): AppTheme {
  if (theme === "dark") return "dark";
  return "light";
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window === "undefined") return "light";
    return normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
  });

  useEffect(() => {
    const initialTheme = normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
    setThemeState(initialTheme);
    window.localStorage.setItem(STORAGE_KEY, initialTheme);
    applyTheme(initialTheme);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: (nextTheme) => {
        setThemeState(nextTheme);
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
        applyTheme(nextTheme);
      },
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return value;
}
