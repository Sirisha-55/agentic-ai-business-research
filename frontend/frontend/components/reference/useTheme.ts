import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";

  try {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }
  } catch {
    // Fall back to the server-rendered default if storage is unavailable.
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // ignore (e.g. private browsing storage restrictions)
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return [theme, toggle];
}
