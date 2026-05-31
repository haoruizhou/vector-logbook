import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";
export type Mode = "auto" | "dark" | "light";
const KEY = "vector-theme-mode";

interface ThemeCtx {
  /** The resolved theme actually applied (auto → system). */
  theme: Theme;
  /** The user's selected mode (auto follows the system, live). */
  mode: Mode;
  setMode: (m: Mode) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "dark", mode: "auto", setMode: () => {} });

function initialMode(): Mode {
  const param = new URLSearchParams(window.location.search).get("theme");
  if (param === "dark" || param === "light" || param === "auto") return param;
  const saved = localStorage.getItem(KEY);
  if (saved === "dark" || saved === "light" || saved === "auto") return saved;
  return "auto";
}

function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(initialMode);
  const [system, setSystem] = useState<Theme>(systemTheme);

  // Follow the OS setting live (matters while in auto mode).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const theme: Theme = mode === "auto" ? system : mode;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(KEY, mode);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#000000" : "#e9eff5");
  }, [theme, mode]);

  const value = useMemo(() => ({ theme, mode, setMode: setModeState }), [theme, mode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
