import { memo, useCallback, useRef, useState, type ReactNode } from "react";
import { ColorField, SwitchRow } from "@/components/studio/ColorField";
import {
  GlyphChevronDown,
  GlyphGithub,
  GlyphGlass,
  GlyphMaterial,
  GlyphMoon,
  GlyphMotion,
  GlyphNoise,
  GlyphPalette,
  GlyphPresets,
  GlyphReset,
  GlyphShape,
  GlyphShuffle,
  GlyphState,
  GlyphStyle,
  GlyphSun,
} from "@/components/studio/glyphs";
import { usePanelLenis } from "@/components/studio/use-panel-lenis";
import { Slider } from "@/components/ui/slider";
import { Tooltip } from "@/components/ui/tooltip";
import { EASING_META, SPRING_META } from "@/lib/orb/mood";
import { MATERIALS, MOOD_META, NOISE_META, PRESETS, STYLE_META } from "@/lib/orb/presets";
import { useOrbStore } from "@/lib/orb/store";
import { ORB_MOODS, ORB_STYLES, type OrbConfig } from "@/lib/orb/types";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const SPRING_CHIPS = SPRING_META.filter((s) => s.id !== "snappy");
const STYLE_CHIPS = ORB_STYLES.map((id) => ({ id, label: STYLE_META[id].label }));
const MATERIAL_CHIPS = MATERIALS.map((m) => ({ id: m.id, label: m.label }));
const PRESET_CHIPS = PRESETS.map((p) => ({ id: p.id, label: p.name }));
const MOOD_CHIPS = ORB_MOODS.map((id) => ({ id, label: MOOD_META[id].label }));
const NOISE_CHIPS = NOISE_META.map((n) => ({ id: n.id, label: n.label }));

/** Copy shown on the palette info tooltips, from the design file. */
const PALETTE_HINTS = {
  colorA: "Bright inner glow, rim highlights, glass tint, iridescence, fluid dye. The “alive” color.",
  colorB: "Body of the orb, second light, cooler or contrasting wash next to Light.",
  colorC: "Dark interior, the volume behind the glow. Keeps it from looking flat.",
} as const;

const TABS = [
  { id: "style", label: "Style", Icon: GlyphStyle },
  { id: "material", label: "Material", Icon: GlyphMaterial },
  { id: "presets", label: "Presets", Icon: GlyphPresets },
  { id: "state", label: "State", Icon: GlyphState },
  { id: "palette", label: "Palette", Icon: GlyphPalette },
  { id: "shape", label: "Shape", Icon: GlyphShape },
  { id: "glass", label: "Glass", Icon: GlyphGlass },
  { id: "noise", label: "Noise", Icon: GlyphNoise },
  { id: "motion", label: "Motion", Icon: GlyphMotion },
] as const;

type TabId = (typeof TABS)[number]["id"];
type NumKey = {
  [K in keyof OrbConfig]: OrbConfig[K] extends number ? K : never;
}[keyof OrbConfig];

export const ControlPanel = memo(function ControlPanel({
  exportSlot,
}: {
  exportSlot: ReactNode;
}) {
  const randomize = useOrbStore((s) => s.randomize);
  const reset = useOrbStore((s) => s.reset);
  const randomizePalette = useOrbStore((s) => s.randomizePalette);
  const randomizeShape = useOrbStore((s) => s.randomizeShape);
  const randomizeGlass = useOrbStore((s) => s.randomizeGlass);
  const randomizeMotion = useOrbStore((s) => s.randomizeMotion);
  const { dark, toggle: toggleTheme } = useTheme();

  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TABS.map((t) => [t.id, true])),
  );
  const [tab, setTab] = useState<TabId>("style");
  const wrapRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lenisRef = usePanelLenis(wrapRef, bodyRef);

  const toggle = useCallback((id: string) => {
    setOpen((s) => ({ ...s, [id]: !s[id] }));
  }, []);

  const jump = useCallback(
    (id: TabId) => {
      setTab(id);
      setOpen((s) => ({ ...s, [id]: true }));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = bodyRef.current?.querySelector(`[data-section="${id}"]`) as HTMLElement | null;
          const lenis = lenisRef.current;
          if (el && lenis) lenis.scrollTo(el, { offset: -8, duration: 0.7 });
          else el?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    },
    [lenisRef],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar: theme, reset, randomize — then GitHub and Export */}
      <div className="relative z-10 flex shrink-0 flex-col gap-3 border-b border-header-border p-3">
        <div className="flex min-h-[30px] items-center">
          <div className="flex flex-1 items-center gap-3">
            <IconBtn
              label={dark ? "Switch to light theme" : "Switch to dark theme"}
              onClick={toggleTheme}
            >
              {dark ? <GlyphMoon size={16} /> : <GlyphSun size={16} />}
            </IconBtn>
            <IconBtn label="Reset" onClick={reset}>
              <GlyphReset size={16} />
            </IconBtn>
            <IconBtn label="Randomize" onClick={randomize}>
              <GlyphShuffle size={16} />
            </IconBtn>
          </div>
          <div className="flex items-center gap-3">
            <Tooltip content="View source on GitHub">
              <a
                href="https://github.com/pixelyokai/OrbyUI"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="View source on GitHub"
                className="flex size-7 items-center justify-center rounded-lg text-foreground transition-opacity duration-150 ease-soft hover:opacity-70"
              >
                <GlyphGithub size={16} />
              </a>
            </Tooltip>
            {exportSlot}
          </div>
        </div>

        {/* Segmented section jump-bar */}
        <div className="flex items-center justify-between rounded-lg bg-seg p-0.5">
          {TABS.map(({ id, label, Icon }) => {
            const on = tab === id;
            return (
              <Tooltip key={id} content={label}>
                <button
                  type="button"
                  onClick={() => jump(id)}
                  aria-label={label}
                  aria-current={on || undefined}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-md px-2 py-1 transition-colors duration-200 ease-soft",
                    on
                      ? "bg-raised text-raised-fg shadow-raised ring-1 ring-raised-ring"
                      : "text-icon hover:text-foreground",
                  )}
                >
                  <Icon size={18} />
                  {on ? (
                    <span className="px-0.5 text-[13px] leading-5 font-medium">{label}</span>
                  ) : null}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      <div ref={wrapRef} className="min-h-0 flex-1 overflow-hidden">
        <div ref={bodyRef}>
          <PanelSection
            id="style"
            icon={<GlyphStyle size={18} />}
            title="Style"
            open={open.style !== false}
            onToggle={() => toggle("style")}
          >
            <BoundChips field="style" items={STYLE_CHIPS} />
          </PanelSection>

          <PanelSection
            id="material"
            icon={<GlyphMaterial size={18} />}
            title="Material"
            open={open.material !== false}
            onToggle={() => toggle("material")}
          >
            <MaterialChips />
          </PanelSection>

          <PanelSection
            id="presets"
            icon={<GlyphPresets size={18} />}
            title="Presets"
            open={open.presets !== false}
            onToggle={() => toggle("presets")}
          >
            <PresetChips />
            <SliderGroup>
              <FieldSlider label="Intensity" field="intensity" min={0} max={3} step={0.01} last />
            </SliderGroup>
          </PanelSection>

          <PanelSection
            id="state"
            icon={<GlyphState size={18} />}
            title="State"
            open={open.state !== false}
            onToggle={() => toggle("state")}
          >
            <MoodChips />
            <div className="mt-3 border-t border-hair pt-3">
              <div className="text-[13px] leading-5 font-medium text-row">Animation</div>
            </div>
            <SliderGroup>
              <MoodSpeedSlider last />
            </SliderGroup>
            <InlineChipRow label="Easing">
              <BoundChips field="easing" items={EASING_META} variant="accent" inline />
            </InlineChipRow>
            <InlineChipRow label="Spring">
              <BoundChips field="spring" items={SPRING_CHIPS} variant="accent" inline />
            </InlineChipRow>
          </PanelSection>

          <PanelSection
            id="palette"
            icon={<GlyphPalette size={18} />}
            title="Palette"
            open={open.palette !== false}
            onToggle={() => toggle("palette")}
            action={<ShuffleBtn label="Randomize palette" onClick={randomizePalette} />}
          >
            <div className="flex gap-2 pt-3">
              <BoundColor label="Light" field="colorA" />
              <BoundColor label="Body" field="colorB" />
              <BoundColor label="Core" field="colorC" />
            </div>
            <SliderGroup>
              <FieldSlider
                label="Hue"
                field="hue"
                min={-180}
                max={180}
                step={1}
                format={(n) => `${Math.round(n)}°`}
                last
              />
            </SliderGroup>
          </PanelSection>

          <PanelSection
            id="shape"
            icon={<GlyphShape size={18} />}
            title="Shape"
            open={open.shape !== false}
            onToggle={() => toggle("shape")}
            action={<ShuffleBtn label="Randomize shape" onClick={randomizeShape} />}
          >
            <SliderGroup>
              <FieldSlider label="Scale" field="scale" min={0.2} max={2} step={0.01} />
              <FieldSlider label="Intensity" field="intensity" min={0} max={3} step={0.01} />
              <FieldSlider label="Glow" field="glow" min={0} max={3} step={0.01} />
              <FieldSlider label="Bloom" field="bloom" min={0} max={2} step={0.01} />
              <FieldSlider label="Chromatic" field="aberration" min={0} max={2} step={0.01} />
              <FieldSlider label="Inner radius" field="innerRadius" min={0} max={1} step={0.01} />
              <FieldSlider label="Grain" field="grain" min={0} max={0.5} step={0.005} last />
            </SliderGroup>
          </PanelSection>

          <PanelSection
            id="glass"
            icon={<GlyphGlass size={18} />}
            title="Glass"
            open={open.glass !== false}
            onToggle={() => toggle("glass")}
            action={<ShuffleBtn label="Randomize glass" onClick={randomizeGlass} />}
          >
            <SliderGroup>
              <FieldSlider label="Refraction" field="refraction" min={0} max={2} step={0.01} />
              <FieldSlider label="Depth" field="depth" min={0} max={1} step={0.01} />
              <FieldSlider label="Dispersion" field="dispersion" min={0} max={2} step={0.01} />
              <FieldSlider label="Frost" field="frost" min={0} max={1} step={0.01} />
              <FieldSlider label="Splay" field="splay" min={0} max={2} step={0.01} />
              <FieldSlider label="Fresnel" field="fresnel" min={0} max={2} step={0.01} last />
            </SliderGroup>
          </PanelSection>

          <PanelSection
            id="noise"
            icon={<GlyphNoise size={18} />}
            title="Noise"
            open={open.noise !== false}
            onToggle={() => toggle("noise")}
          >
            <BoundChips field="noiseAlgo" items={NOISE_CHIPS} />
          </PanelSection>

          <PanelSection
            id="motion"
            icon={<GlyphMotion size={18} />}
            title="Motion"
            open={open.motion !== false}
            onToggle={() => toggle("motion")}
            action={<ShuffleBtn label="Randomize motion" onClick={randomizeMotion} />}
          >
            <SliderGroup>
              <FieldSlider label="Speed" field="speed" min={0} max={3} step={0.01} />
              <FieldSlider label="Rotate" field="rotationSpeed" min={-3} max={3} step={0.01} />
              <FieldSlider label="Noise" field="noiseScale" min={0.1} max={4} step={0.01} />
              <FieldSlider label="Flow" field="noiseSpeed" min={0} max={4} step={0.01} />
              <FieldSlider label="Fluid" field="distortion" min={0} max={2} step={0.01} />
              <FieldSlider label="Iridescence" field="iridescence" min={0} max={2} step={0.01} last />
            </SliderGroup>
            <div className="border-t border-hair">
              <BoundSwitch label="Pointer follow" field="interactivity" />
            </div>
          </PanelSection>
        </div>
      </div>
    </div>
  );
});

/** Slider stacks sit 4px inside the section padding, per the design. */
function SliderGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-col px-1">{children}</div>;
}

/** "Easing" / "Spring" rows: a lead label with chips flowing beside it. */
function InlineChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 pt-3 pl-1">
      <span className="flex h-[26px] shrink-0 items-center text-[13px] leading-5 font-medium text-row">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function FieldSlider({
  field,
  label,
  min,
  max,
  step,
  format,
  last,
}: {
  field: NumKey;
  label: string;
  min: number;
  max: number;
  step: number;
  format?: (n: number) => string;
  last?: boolean;
}) {
  const value = useOrbStore((s) => s.config[field]);
  const patchLive = useOrbStore((s) => s.patchLive);
  return (
    <SliderRow
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      format={format}
      last={last}
      onChange={(v) => patchLive({ [field]: v } as Partial<OrbConfig>)}
    />
  );
}

function BoundChips<T extends string>({
  field,
  items,
  variant = "solid",
  inline,
}: {
  field: "style" | "noiseAlgo" | "easing" | "spring";
  items: { id: T; label: string }[];
  variant?: "solid" | "accent";
  inline?: boolean;
}) {
  const active = useOrbStore((s) => s.config[field]) as T;
  const patchLive = useOrbStore((s) => s.patchLive);
  return (
    <ChipRow
      items={items}
      active={active}
      onPick={(id) => patchLive({ [field]: id } as Partial<OrbConfig>)}
      variant={variant}
      inline={inline}
    />
  );
}

function MaterialChips() {
  const active = useOrbStore((s) => s.config.material);
  const applyMaterialId = useOrbStore((s) => s.applyMaterialId);
  return <ChipRow items={MATERIAL_CHIPS} active={active} onPick={applyMaterialId} />;
}

function PresetChips() {
  const style = useOrbStore((s) => s.config.style);
  const colorA = useOrbStore((s) => s.config.colorA);
  const applyPresetId = useOrbStore((s) => s.applyPresetId);
  const presetOn =
    PRESETS.find((p) => p.config.style === style && p.config.colorA === colorA)?.id ?? "";
  return <ChipRow items={PRESET_CHIPS} active={presetOn} onPick={applyPresetId} />;
}

function MoodChips() {
  const active = useOrbStore((s) => s.config.mood);
  const setMood = useOrbStore((s) => s.setMood);
  return <ChipRow items={MOOD_CHIPS} active={active} onPick={setMood} />;
}

/** Tempo for the state currently selected above. */
function MoodSpeedSlider({ last }: { last?: boolean }) {
  const mood = useOrbStore((s) => s.config.mood);
  const value = useOrbStore((s) => s.config.moodSpeed[mood]);
  const patchLive = useOrbStore((s) => s.patchLive);
  return (
    <SliderRow
      label="Speed"
      value={value}
      min={0}
      max={3}
      step={0.01}
      last={last}
      onChange={(v) => {
        const moodSpeed = { ...useOrbStore.getState().config.moodSpeed, [mood]: v };
        patchLive({ moodSpeed });
      }}
    />
  );
}

function BoundColor({
  field,
  label,
}: {
  field: "colorA" | "colorB" | "colorC";
  label: string;
}) {
  const value = useOrbStore((s) => s.config[field]);
  const patchLive = useOrbStore((s) => s.patchLive);
  return (
    <ColorField
      label={label}
      hint={PALETTE_HINTS[field]}
      value={value}
      onChange={(v) => patchLive({ [field]: v } as Partial<OrbConfig>)}
    />
  );
}

function BoundSwitch({
  field,
  label,
}: {
  field: "interactivity";
  label: string;
}) {
  const checked = useOrbStore((s) => s.config[field]);
  const patchLive = useOrbStore((s) => s.patchLive);
  return (
    <SwitchRow
      label={label}
      checked={checked}
      onCheckedChange={(v) => patchLive({ [field]: v } as Partial<OrbConfig>)}
    />
  );
}

const PanelSection = memo(function PanelSection({
  id,
  icon,
  title,
  open,
  onToggle,
  action,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  open: boolean;
  onToggle: () => void;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section data-section={id} className="scroll-mt-2 border-b border-hair p-3 last:border-b-0">
      <div className="flex items-center gap-2 py-1 pl-1">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          aria-expanded={open}
        >
          <span className="text-icon">{icon}</span>
          <span className="text-[14px] leading-5 font-medium">{title}</span>
        </button>
        {action}
        <button
          type="button"
          onClick={onToggle}
          aria-hidden
          tabIndex={-1}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-md transition-colors duration-200 ease-soft",
            open ? "text-chevron" : "text-icon",
          )}
        >
          <GlyphChevronDown
            size={16}
            className={cn("transition-transform duration-300 ease-drawer", !open && "-rotate-90")}
          />
        </button>
      </div>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-drawer",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="-mx-2 min-h-0 overflow-hidden px-2">{children}</div>
      </div>
    </section>
  );
});

const ShuffleBtn = memo(function ShuffleBtn({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex size-5 shrink-0 items-center justify-center rounded-md text-icon transition-[color,transform] duration-200 ease-soft hover:scale-110 hover:text-foreground active:scale-95"
      >
        <GlyphShuffle size={16} />
      </button>
    </Tooltip>
  );
});

const IconBtn = memo(function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex size-7 items-center justify-center rounded-lg text-icon transition-[color,background-color,transform] duration-200 ease-soft hover:bg-hover-fill hover:text-foreground active:scale-95"
      >
        {children}
      </button>
    </Tooltip>
  );
});

const ChipRow = memo(function ChipRow<T extends string>({
  items,
  active,
  onPick,
  variant = "solid",
  inline,
}: {
  items: { id: T; label: string }[];
  active: T | "";
  onPick: (id: T) => void;
  variant?: "solid" | "accent";
  inline?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-start gap-2", inline ? "pb-0" : "pt-3 pb-1")}>
      {items.map((item) => {
        const on = active === item.id;
        if (variant === "accent") {
          // Easing / Spring: bordered tint pills
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item.id)}
              className={cn(
                "rounded-full border border-hair p-1 text-[13px] leading-4 font-medium transition-[color,background-color,transform] duration-200 ease-soft",
                on
                  ? "chip-on bg-accent-tint text-accent-tint-fg"
                  : "bg-seg text-muted-foreground hover:scale-[1.04] hover:text-foreground active:scale-[0.96]",
              )}
            >
              <span className="px-0.5">{item.label}</span>
            </button>
          );
        }
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item.id)}
            className={cn(
              "rounded-full px-2 py-1 text-[13px] leading-5 font-medium transition-[color,background-color,box-shadow,transform] duration-200 ease-soft",
              on
                ? "chip-on bg-raised text-raised-fg shadow-raised ring-1 ring-raised-ring"
                : "text-muted-foreground hover:scale-[1.04] hover:text-foreground active:scale-[0.96]",
            )}
          >
            <span className="px-0.5">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}) as <T extends string>(props: {
  items: { id: T; label: string }[];
  active: T | "";
  onPick: (id: T) => void;
  variant?: "solid" | "accent";
  inline?: boolean;
}) => React.ReactElement;

const SliderRow = memo(function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  last,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (n: number) => string;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 first:pt-4 first:pb-2",
        last ? "pt-2 pb-4" : "py-2",
      )}
    >
      <span className="w-[72px] shrink-0 text-[13px] leading-5 font-medium whitespace-nowrap text-row">
        {label}
      </span>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v ?? min)}
        aria-label={label}
        className="min-w-0 flex-1"
      />
      <span className="w-8 shrink-0 text-right font-mono text-[13px] leading-5 text-row tabular-nums">
        {format ? format(value) : value.toFixed(2)}
      </span>
    </div>
  );
});

export default ControlPanel;
