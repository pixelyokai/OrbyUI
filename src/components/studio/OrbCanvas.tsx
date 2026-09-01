import { memo, useEffect, useRef, useState } from "react";
import { ComposingLoader } from "@/components/studio/ComposingLoader";
import { useOrbStore } from "@/lib/orb/store";
import { STAGE_HEX, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { OrbRenderer } from "@/lib/orb/renderer";

const rendererMod =
  typeof window !== "undefined" ? import("@/lib/orb/renderer") : null;

let orbReady = false;
let liveRenderer: OrbRenderer | null = null;

export const OrbCanvas = memo(function OrbCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<OrbRenderer | null>(null);
  const darkRef = useRef(true);
  const cycleMood = useOrbStore((s) => s.cycleMood);
  const setPreviewReady = useOrbStore((s) => s.setPreviewReady);
  const { dark } = useTheme();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(orbReady);
  darkRef.current = dark;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let unsub = () => {};

    const markReady = () => {
      if (cancelled) return;
      orbReady = true;
      setPreviewReady(true);
      setReady(true);
    };

    const attach = (next: OrbRenderer) => {
      liveRenderer = next;
      rendererRef.current = next;
      next.setPreviewBg(darkRef.current ? STAGE_HEX.dark : STAGE_HEX.light);
      next.start();
      unsub();
      unsub = useOrbStore.subscribe((state) => {
        next.setConfig(state.config);
      });
    };

    if (liveRenderer && liveRenderer.canvas === canvas) {
      attach(liveRenderer);
      markReady();
    } else {
      liveRenderer?.destroy();
      liveRenderer = null;
      void (rendererMod ?? import("@/lib/orb/renderer"))
        .then(({ OrbRenderer }) => {
          if (cancelled || !canvasRef.current) return;
          try {
            const next = new OrbRenderer(canvasRef.current, useOrbStore.getState().config, {
              onReady: markReady,
            });
            attach(next);
          } catch (err) {
            console.error(err);
            if (!cancelled) {
              setFailed(true);
              markReady();
            }
          }
        })
        .catch((err) => {
          console.error(err);
          if (!cancelled) {
            setFailed(true);
            markReady();
          }
        });
    }

    return () => {
      cancelled = true;
      unsub();
      // Reads .current deliberately — null on unmount is what separates
      // "destroy" from "same canvas, just pause".
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (liveRenderer && liveRenderer.canvas !== canvasRef.current) {
        liveRenderer.destroy();
        liveRenderer = null;
        rendererRef.current = null;
      } else {
        liveRenderer?.stop();
      }
    };
  }, [setPreviewReady]);

  useEffect(() => {
    rendererRef.current?.setPreviewBg(dark ? STAGE_HEX.dark : STAGE_HEX.light);
  }, [dark]);

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className={cn(
          "block h-full w-full max-w-full touch-none bg-background",
          failed || !ready ? "opacity-0" : "opacity-100",
        )}
        style={{
          transitionProperty: "opacity",
          transitionDuration: ready && !failed ? "180ms" : "0ms",
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
        tabIndex={0}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
          const y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
          rendererRef.current?.setPointer(x, y, true);
        }}
        onPointerLeave={() => rendererRef.current?.setPointer(0, 0, false)}
        onClick={cycleMood}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            cycleMood();
          }
        }}
        aria-label="AI orb preview. Click or press Enter to cycle mood."
      />
      {failed ? <FallbackOrb /> : <ComposingLoader visible={!ready} />}
    </div>
  );
});

function FallbackOrb() {
  const config = useOrbStore.getState().config;
  return (
    <div
      className="absolute inset-0"
      role="img"
      aria-label="AI orb preview (WebGL unavailable)"
    >
      <div
        className="absolute left-1/2 top-1/2 size-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 32%, ${config.colorA}, ${config.colorB} 42%, ${config.colorC} 78%)`,
          boxShadow: `0 0 48px ${config.colorA}55`,
        }}
      />
    </div>
  );
}
