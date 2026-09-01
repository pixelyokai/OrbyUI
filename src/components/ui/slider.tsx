import { memo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const EASE = 0.18;

interface SliderProps {
  min: number;
  max: number;
  step: number;
  value: number[];
  onValueChange: (value: number[]) => void;
  className?: string;
  "aria-label"?: string;
}

function toPct(value: number, min: number, max: number) {
  const span = max - min;
  if (span === 0) return 0;
  return Math.max(0, Math.min(100, ((value - min) / span) * 100));
}

function fromPct(pct: number, min: number, max: number, step: number) {
  const span = max - min;
  const raw = min + (pct / 100) * span;
  const stepped = Math.round(raw / step) * step;
  const digits = step >= 1 ? 0 : String(step).split(".")[1]?.length ?? 2;
  const rounded = Number(stepped.toFixed(digits));
  return Math.max(min, Math.min(max, rounded));
}

const Slider = memo(function Slider({
  min,
  max,
  step,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel,
}: SliderProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(toPct(value[0] ?? min, min, max));
  const currentRef = useRef(targetRef.current);
  const rafRef = useRef(0);
  const draggingRef = useRef(false);
  const valueRef = useRef(value[0] ?? min);
  valueRef.current = value[0] ?? min;

  function paint(stretch = 0) {
    const fill = fillRef.current;
    const blob = blobRef.current;
    if (!fill || !blob) return;
    const current = currentRef.current;
    fill.style.width = `${current}%`;
    blob.style.left = `${current}%`;
    const s = Math.max(-1, Math.min(1, stretch));
    blob.style.transform = `translate(-50%, -50%) scale(${1 + Math.abs(s) * 0.18}, ${1 - Math.abs(s) * 0.1})`;
  }

  function tick() {
    const delta = targetRef.current - currentRef.current;
    currentRef.current += delta * EASE;
    paint(delta * 0.045);
    if (Math.abs(targetRef.current - currentRef.current) < 0.06) {
      currentRef.current = targetRef.current;
      paint(0);
      rafRef.current = 0;
      return;
    }
    rafRef.current = window.requestAnimationFrame(tick);
  }

  function kick() {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(tick);
  }

  function setTargetFromClientX(clientX: number) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    targetRef.current = pct;
    const next = fromPct(pct, min, max, step);
    if (next !== valueRef.current) onValueChange([next]);
    kick();
  }

  useEffect(() => {
    if (draggingRef.current) return;
    targetRef.current = toPct(value[0] ?? min, min, max);
    kick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value[0], min, max]);

  useEffect(() => {
    paint(0);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={wrapRef}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value[0] ?? min}
      className={cn(
        "relative h-4 w-full cursor-pointer touch-none select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onPointerDown={(e) => {
        draggingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        setTargetFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current) return;
        setTargetFromClientX(e.clientX);
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
      onKeyDown={(e) => {
        const dir =
          e.key === "ArrowRight" || e.key === "ArrowUp"
            ? 1
            : e.key === "ArrowLeft" || e.key === "ArrowDown"
              ? -1
              : 0;
        if (dir) {
          e.preventDefault();
          const next = fromPct(
            toPct((value[0] ?? min) + dir * step * (e.shiftKey ? 10 : 1), min, max),
            min,
            max,
            step,
          );
          onValueChange([next]);
          return;
        }
        if (e.key === "Home") {
          e.preventDefault();
          onValueChange([min]);
        } else if (e.key === "End") {
          e.preventDefault();
          onValueChange([max]);
        }
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-track" />
      <div
        ref={fillRef}
        className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-fill"
        style={{ width: `${targetRef.current}%` }}
      />
      <div
        ref={blobRef}
        className="absolute top-1/2 size-4 rounded-full border border-thumb-ring bg-thumb shadow-[inset_0_-1px_0_rgb(0_0_0/0.05)] drop-shadow-[0_1px_1px_rgb(0_0_0/0.04)]"
        style={{
          left: `${targetRef.current}%`,
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
});

export { Slider };
