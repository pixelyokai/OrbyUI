import { useCallback, useSyncExternalStore, type ReactNode } from "react";

/** Stage surface behind the orb — matches --stage in styles.css. */
export const STAGE_HEX = {
  dark: "#171717",
  light: "#ffffff",
} as const;

const KEY = "orbyui-theme";

export function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  try {
    window.localStorage.setItem(KEY, dark ? "dark" : "light");
  } catch {
    /* quota */
  }
}

/*
 * The applied theme lives on <html class="dark">, set by the blocking script in
 * __root.tsx before paint. Reading it straight from the DOM (rather than React
 * context) keeps every consumer in agreement even when the bundler duplicates
 * this module across chunks, and matches what the user actually sees.
 */

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

/** SSR renders the same default the inline script falls back to. */
function getServerSnapshot() {
  return true;
}

/** Kept so callers can wrap a subtree; the theme itself needs no provider. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useTheme() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => {
    applyTheme(!document.documentElement.classList.contains("dark"));
  }, []);
  return { dark, toggle };
}
