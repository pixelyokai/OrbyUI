import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { GlyphInfo } from "@/components/studio/glyphs";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  hint?: ReactNode;
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const ColorField = memo(function ColorField({
  label,
  value,
  onChange,
  hint,
}: ColorFieldProps) {
  const [draft, setDraft] = useState(value);
  const colorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commitText(raw: string) {
    setDraft(raw);
    const v = raw.startsWith("#") ? raw : `#${raw}`;
    if (HEX_RE.test(v.trim())) onChange(v.trim());
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="flex items-center gap-1 text-[12px] leading-4 font-medium text-muted-foreground">
        {label}
        {hint ? (
          <Tooltip content={hint}>
            <button
              type="button"
              aria-label={`About ${label}`}
              className="flex size-4 items-center justify-center text-icon transition-colors duration-150 ease-soft hover:text-foreground"
            >
              <GlyphInfo size={16} />
            </button>
          </Tooltip>
        ) : null}
      </span>
      {/* The colour input stays rendered at 0×0 — browsers ignore .click() on a
          display:none input. Both children stop propagation: the input to avoid
          recursing into this handler, the hex field to stay typeable. */}
      <div
        onClick={() => colorRef.current?.click()}
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-hair-strong bg-panel px-2 py-1.5 transition-colors duration-150 ease-soft hover:border-thumb-ring"
      >
        <span
          className="size-4 shrink-0 rounded-full border border-thumb-ring"
          style={{ backgroundColor: value }}
          aria-hidden
        />
        <input
          ref={colorRef}
          type="color"
          value={normalizeHex(value)}
          onInput={(e) => onChange(e.currentTarget.value)}
          onChange={(e) => onChange(e.currentTarget.value)}
          onClick={(e) => e.stopPropagation()}
          className="absolute size-0 opacity-0"
          tabIndex={-1}
          aria-label={`${label} colour picker`}
        />
        <input
          value={draft}
          onChange={(e) => commitText(e.target.value)}
          onBlur={() => setDraft(value)}
          onClick={(e) => e.stopPropagation()}
          spellCheck={false}
          aria-label={`${label} hex value`}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-[13px] leading-5 font-medium text-row uppercase outline-none",
          )}
        />
      </div>
    </div>
  );
});

function normalizeHex(value: string) {
  const v = value.startsWith("#") ? value : `#${value}`;
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#000000";
}

export function SwitchRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2.5 pt-4 pb-1 pl-1">
      <span className="min-w-0 text-[13px] leading-5 font-medium text-row">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-5 w-10 shrink-0 rounded-full transition-colors duration-200 ease-soft",
          checked
            ? "bg-accent-on shadow-[inset_0_1px_2px_rgb(24_24_27/0.24)] hover:bg-switch-on-hover"
            : "bg-switch-off shadow-[0_1px_2px_rgb(24_24_27/0.16),0_0_0_1px_rgb(0_0_0/0.1)] hover:bg-switch-off-hover",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] size-3.5 rounded-full transition-transform duration-200 ease-soft",
            checked
              ? "translate-x-5 bg-switch-knob-on shadow-[inset_0_0.5px_0_#fff,inset_0_-0.75px_0_rgb(24_24_27/0.24),0_2px_3px_rgb(56_109_77/0.8)]"
              : "translate-x-0 bg-thumb shadow-[0_1px_2px_rgb(24_24_27/0.24)]",
          )}
        />
      </button>
    </div>
  );
}
