import { lazy, memo, Suspense, useEffect, useMemo } from "react";
import { ControlPanel } from "@/components/studio/ControlPanel";
import { OrbCanvas } from "@/components/studio/OrbCanvas";
import { OrbMark, Wordmark } from "@/components/studio/OrbMark";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MATERIALS, MOOD_META, STYLE_META } from "@/lib/orb/presets";
import { useOrbStore } from "@/lib/orb/store";
import { ThemeProvider } from "@/lib/theme";

const ExportDialog = lazy(() => import("@/components/studio/ExportDialog"));

export function Studio() {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200} skipDelayDuration={300}>
        <StudioShell />
      </TooltipProvider>
    </ThemeProvider>
  );
}

function StudioShell() {
  useEffect(() => {
    useOrbStore.getState().hydrate();
  }, []);

  const exportSlot = useMemo(
    () => (
      <Suspense fallback={<span className="skel inline-block h-7 w-[86px] rounded-md" />}>
        <ExportDialog />
      </Suspense>
    ),
    [],
  );

  return (
    <div className="h-dvh overflow-hidden bg-page p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-shell text-foreground shadow-[0_0_0_0.5px_var(--hair)] lg:flex-row">
        <Stage />
        <div className="min-h-0 flex-1 p-2 lg:w-[440px] lg:flex-none">
          <aside className="h-full min-h-0 overflow-hidden rounded-lg bg-panel outline outline-hair -outline-offset-1">
            <ControlPanel exportSlot={exportSlot} />
          </aside>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

const Stage = memo(function Stage() {
  const style = useOrbStore((s) => s.config.style);
  const material = useOrbStore((s) => s.config.material);
  const mood = useOrbStore((s) => s.config.mood);
  const ready = useOrbStore((s) => s.previewReady);

  return (
    <section className="flex min-h-0 min-w-0 shrink-0 flex-col bg-stage lg:h-auto lg:min-h-full lg:flex-1 lg:shrink">
      <header className="relative flex shrink-0 items-center p-4">
        <div className="flex items-center gap-1.5">
          <OrbMark size={24} />
          <Wordmark />
        </div>
        {/* Centered on desktop, trailing on mobile — as drawn in the design. */}
        <div className="ml-auto lg:absolute lg:top-1/2 lg:left-1/2 lg:ml-0 lg:-translate-x-1/2 lg:-translate-y-1/2">
          {ready ? (
            <p className="font-mono text-[14px] leading-5 whitespace-nowrap text-icon">
              {`${STYLE_META[style].label} / ${MATERIALS.find((m) => m.id === material)?.label} / ${MOOD_META[mood].label}`}
            </p>
          ) : (
            <span className="skel block h-5 w-52 rounded-full" aria-hidden />
          )}
        </div>
      </header>
      <div className="relative h-[237px] min-h-0 overflow-hidden lg:h-auto lg:flex-1">
        <OrbCanvas />
      </div>
    </section>
  );
});
