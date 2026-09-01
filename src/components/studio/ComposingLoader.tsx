import { cn } from "@/lib/utils";

const DOTS = Array.from({ length: 25 }, (_, i) => {
  const row = Math.floor(i / 5);
  const col = i % 5;
  const path = (row + (4 - col)) / 8;
  return { i, path };
});

export function ComposingLoader({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background transition-opacity duration-300 ease-soft",
        visible ? "opacity-100" : "opacity-0",
      )}
      aria-hidden={!visible}
      aria-busy={visible}
    >
      <div className="flex flex-col items-center gap-3">
        <span className="square-matrix" aria-hidden>
          {DOTS.map(({ i, path }) => (
            <span key={i} className="square-dot" style={{ animationDelay: `${(-path * 1.2).toFixed(3)}s` }} />
          ))}
        </span>
        <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
          Loading
        </p>
      </div>
    </div>
  );
}
