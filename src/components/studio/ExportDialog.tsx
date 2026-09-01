import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { usePanelLenis } from "@/components/studio/use-panel-lenis";
import { GlyphCheck, GlyphCopy, GlyphExport } from "@/components/studio/glyphs";
import { EXPORT_META, generateCode, type ExportKind } from "@/lib/orb/codegen";
import { tokenize } from "@/lib/highlight";
import { useOrbStore } from "@/lib/orb/store";
import { cn } from "@/lib/utils";

const KINDS: { id: ExportKind; label: string }[] = [
  { id: "react", label: "React" },
  { id: "js", label: "Javascript" },
  { id: "html", label: "HTML" },
  { id: "types", label: "Typescript" },
];

function copyFallback(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.setAttribute("aria-hidden", "true");
  ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

export function ExportDialog() {
  const [open, setOpen] = useState(false);
  const config = useOrbStore((s) => (open ? s.config : null));
  const [kind, setKind] = useState<ExportKind>("react");
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  /*
   * Element kept in state, not just a ref, so Lenis attaches reliably. Radix
   * mounts the dialog through a portal, and this component's effect can run
   * before that content commits — leaving both refs null, which is how the
   * code pane silently went un-smoothed. A state-backed callback ref re-runs
   * the effect at the moment the <pre> actually exists.
   */
  const [preEl, setPreEl] = useState<HTMLPreElement | null>(null);
  const attachPre = useCallback((el: HTMLPreElement | null) => {
    preRef.current = el;
    setPreEl(el);
  }, []);
  usePanelLenis(preRef, codeRef, open && preEl !== null);
  const code = useMemo(() => (config ? generateCode(kind, config) : ""), [kind, config]);
  const tokens = useMemo(() => tokenize(code, kind === "html"), [code, kind]);
  const meta = EXPORT_META[kind];

  function markCopied() {
    setCopied(true);
    toast.success("Code copied successfully.");
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function copy() {
    if (!code) {
      toast.error("Nothing to copy yet");
      return;
    }
    if (copyFallback(code)) {
      markCopied();
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      markCopied();
    } catch {
      const node = preRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      toast.error("Failed to copy the code. Try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-invert px-2 py-1 text-[13px] leading-5 font-medium text-invert-fg shadow-[inset_0_0.75px_0_rgb(255_255_255/0.24),0_1px_2px_rgb(0_0_0/0.4)] transition-opacity duration-150 ease-soft hover:opacity-90"
        >
          <GlyphExport size={15} />
          Export
        </button>
      </DialogTrigger>

      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          preRef.current?.focus();
        }}
        /*
         * Don't dismiss on an outside click. Copying is a deliberate task and
         * losing the snippet to a stray click is annoying — and because the
         * toast renders outside the dialog, clicking its close button counted
         * as an outside interaction and took the modal with it.
         * Escape and the ✕ button remain, so there's still a keyboard and a
         * pointer way out.
         */
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Export Orb</DialogTitle>
          <DialogDescription>
            Drop-in snippet with your current colors, motion, and style. No extra packages.
          </DialogDescription>
        </DialogHeader>

        {/*
         * min-h-0 the whole way down, or the 400px code panel refuses to shrink
         * and overflows the dialog's max-height — which is what was clipping the
         * snippet and stopping <pre> from ever scrolling.
         * overflow-hidden clips the tab row's bottom border to the rounded
         * corners; without it the divider ran square across them.
         */}
        <div className="flex min-h-0 flex-1 flex-col p-2.5">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-code shadow-[inset_0_0_0_1px_var(--hair),inset_0_0_0_1.5px_rgb(255_255_255/0.24)] outline outline-hair-strong -outline-offset-1 dark:shadow-none">
            <div className="flex shrink-0 items-center justify-between border-b border-hair-strong px-3">
              <div className="flex items-center gap-3" role="tablist" aria-label="Export format">
                {KINDS.map(({ id, label }) => {
                  const on = kind === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setKind(id)}
                      className={cn(
                        "flex min-h-10 items-center border-b-2 py-1.5 text-[14px] leading-5 font-medium transition-colors duration-150 ease-soft outline-none focus-visible:ring-2 focus-visible:ring-fill/40",
                        on
                          ? "border-accent-on text-foreground"
                          : "border-transparent text-icon hover:text-foreground",
                      )}
                    >
                      <span className="px-0.5">{label}</span>
                    </button>
                  );
                })}
              </div>
              <Tooltip content="Copy code">
                <button
                  type="button"
                  onClick={() => void copy()}
                  aria-label="Copy code"
                  className="flex size-6 items-center justify-center rounded-md text-icon transition-[color,transform] duration-150 ease-soft outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-fill/40 active:scale-95"
                >
                  {copied ? <GlyphCheck size={16} /> : <GlyphCopy size={16} />}
                </button>
              </Tooltip>
            </div>
            <pre
              ref={attachPre}
              tabIndex={0}
              aria-label={`${meta.filename} source`}
              className="code-scroll min-h-0 flex-1 overflow-auto p-4 font-mono text-[14px] leading-5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fill/40"
            >
              <code ref={codeRef} className="block">
                {tokens.map((t, i) =>
                  t.kind === "plain" ? (
                    t.text
                  ) : (
                    <span key={i} className={`tok-${t.kind}`}>
                      {t.text}
                    </span>
                  ),
                )}
              </code>
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExportDialog;
