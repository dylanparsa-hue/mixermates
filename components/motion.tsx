"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// Orchestration for the portable transitions.dev recipes. Touch stays scrollable.
export function TiltSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className="tilt-shell">
      <div className={className}>{children}</div>
    </article>
  );
}

export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.classList.add("is-shown");
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.classList.add("is-shown");
        observer.disconnect();
      },
      { threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`t-stagger ${className}`}>
      {children}
    </div>
  );
}

// One scroll listener, one pending frame. No scroll work outside the hero.
export function CinematicHero({ children }: { children: ReactNode }) {
  return <section className="mm-cinematic-hero">{children}</section>;
}

export function NightBand() {
  return <div className="mm-night-band">Good nights. Great company.</div>;
}

export function SlidingTabs({
  options,
  value,
  onChange,
  label,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const bar = useRef<HTMLDivElement>(null),
    pill = useRef<HTMLSpanElement>(null);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    const move = (animate: boolean) => {
      const tab = bar.current?.querySelector<HTMLElement>(
        '[aria-selected="true"]',
      );
      if (!tab || !pill.current) return;
      const p = pill.current,
        previous = p.style.transition;
      if (!animate) p.style.transition = "none";
      p.style.transform = `translateX(${tab.offsetLeft}px)`;
      p.style.width = `${tab.offsetWidth}px`;
      if (!animate) {
        void p.offsetWidth;
        p.style.transition = previous;
      }
    };
    move(mounted.current);
    mounted.current = true;
    const observer = new ResizeObserver(() => move(false));
    observer.observe(bar.current!);
    return () => observer.disconnect();
  }, [value, options.join("|")]);
  return (
    <div
      className="page-tabs motion-tabs t-tabs"
      role="tablist"
      aria-label={label}
      ref={bar}
    >
      <span className="t-tabs-pill" aria-hidden="true" ref={pill} />
      {options.map((option, index) => (
        <button
          className="t-tab"
          role="tab"
          aria-selected={option === value}
          tabIndex={option === value ? 0 : -1}
          key={option}
          onClick={() => onChange(option)}
          onKeyDown={(e) => {
            const next =
              e.key === "ArrowRight"
                ? (index + 1) % options.length
                : e.key === "ArrowLeft"
                  ? (index + options.length - 1) % options.length
                  : e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? options.length - 1
                      : -1;
            if (next < 0) return;
            e.preventDefault();
            onChange(options[next]);
            bar.current
              ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
              [next]?.focus();
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function MotionToast({
  message,
  dismiss,
}: {
  message: string;
  dismiss: () => void;
}) {
  const [shown, setShown] = useState(false),
    [text, setText] = useState(message);
  useEffect(() => {
    if (message) {
      setText(message);
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--toast-close",
          ),
        ) || 250;
    const timer = setTimeout(() => setText(""), duration);
    return () => clearTimeout(timer);
  }, [message]);
  if (!text) return null;
  return (
    <div className="toast-position">
      <div
        role="status"
        aria-live="polite"
        className={`toast t-toast ${shown ? "is-open" : ""}`}
        inert={!shown}
      >
        <span className="toast-spark" aria-hidden="true">
          ✦
        </span>
        {text}
        <button aria-label="Dismiss notification" onClick={dismiss}>
          ×
        </button>
      </div>
    </div>
  );
}
