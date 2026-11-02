"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useId,
  useRef,
} from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { BrandLogo } from "./brand";
type Preference = "light" | "dark" | "system";
const key = "mixermates-theme";
const ThemeContext = createContext<{
  preference: Preference;
  resolved: "light" | "dark";
  setTheme: (p: Preference) => void;
}>({ preference: "system", resolved: "dark", setTheme: () => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<Preference>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");
  const curtain = useRef<HTMLDivElement>(null);
  const change = useRef<(p: Preference) => void>(() => {});
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(key);
    } catch {}
    const initial = saved === "light" || saved === "dark" ? saved : "system";
    setPreference(initial);
    const media = matchMedia("(prefers-color-scheme: dark)");
    let generation = 0;
    let animation: Animation | undefined;
    const overlay = curtain.current;
    const apply = (p: Preference, animate = true) => {
      const next = p === "system" ? (media.matches ? "dark" : "light") : p;
      const id = ++generation;
      const opacity =
        overlay && !overlay.hidden ? getComputedStyle(overlay).opacity : "0";
      animation?.cancel();
      // Preference changes immediately, including while a previous fade is interrupted.
      document.documentElement.dataset.themePreference = p;
      const commit = () => {
        if (id !== generation) return;
        document.documentElement.dataset.theme = next;
        document.documentElement.style.colorScheme = next;
        document
          .querySelectorAll('meta[name="theme-color"]')
          .forEach((meta) => {
            meta.removeAttribute("media");
            meta.setAttribute(
              "content",
              document.querySelector(".coming-shell") || next === "dark"
                ? "#090B18"
                : "#FAFAFF",
            );
          });
        setResolved(next);
      };
      const shouldAnimate =
        animate &&
        overlay &&
        next !== document.documentElement.dataset.theme &&
        document.querySelector(".mm-platform, .customer-shell") &&
        !document.querySelector(".coming-shell") &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches &&
        typeof overlay.animate === "function";
      if (!shouldAnimate) {
        commit();
        if (overlay) overlay.hidden = true;
        return;
      }
      overlay.hidden = false;
      overlay.style.opacity = opacity;
      void (async () => {
        try {
          animation = overlay.animate([{ opacity }, { opacity: 1 }], {
            duration: 160,
            easing: "ease-out",
            fill: "forwards",
          });
          await animation.finished;
          if (id !== generation) return;
          // The layout changes only after the opaque brand curtain covers it.
          commit();
          animation = overlay.animate(
            [{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }],
            { duration: 520, easing: "ease-out", fill: "forwards" },
          );
          await animation.finished;
        } catch {
          // Cancellation is expected on rapid changes; a failed animation cannot lose a theme choice.
          if (id === generation) commit();
        } finally {
          if (id === generation) {
            overlay.hidden = true;
            animation?.cancel();
          }
        }
      })();
    };
    change.current = apply;
    apply(initial, false);
    const systemChange = () => {
      const p = document.documentElement.dataset.themePreference as Preference;
      apply(p || "system");
    };
    const storage = (event: StorageEvent) => {
      if (event.key !== key) return;
      const p =
        event.newValue === "light" || event.newValue === "dark"
          ? event.newValue
          : "system";
      setPreference(p);
      apply(p);
    };
    media.addEventListener("change", systemChange);
    window.addEventListener("storage", storage);
    return () => {
      generation++;
      animation?.cancel();
      if (overlay) overlay.hidden = true;
      change.current = () => {};
      media.removeEventListener("change", systemChange);
      window.removeEventListener("storage", storage);
    };
  }, []);
  function setTheme(p: Preference) {
    setPreference(p);
    try {
      localStorage.setItem(key, p);
    } catch {}
    change.current(p);
  }

  return (
    <ThemeContext.Provider value={{ preference, resolved, setTheme }}>
      {children}
      <div ref={curtain} className="theme-curtain" hidden aria-hidden="true">
        <BrandLogo theme="dark" decorative />
      </div>
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  return useContext(ThemeContext);
}
export function ThemeControl({ compact = false }: { compact?: boolean }) {
  const { preference, setTheme } = useTheme();
  const groupId = useId();
  return (
    <fieldset
      className={`theme-control ${compact ? "theme-control-compact" : ""}`}
    >
      <legend>Appearance</legend>
      <div className="theme-options">
        {(
          [
            ["light", "Light", Sun],
            ["dark", "Dark", Moon],
            ["system", "System", Monitor],
          ] as const
        ).map(([value, label, Icon]) => (
          <label
            key={value}
            title={label + " appearance"}
            className={preference === value ? "selected" : ""}
          >
            <input
              type="radio"
              name={`theme-${groupId}`}
              value={value}
              aria-label={label}
              checked={preference === value}
              onChange={() => setTheme(value)}
            />
            <Icon size={18} aria-hidden="true" />
            <span className="theme-label">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
