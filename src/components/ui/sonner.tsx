import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/lib/theme";
import "sonner/dist/styles.css";

/**
 * Toasts traced from the Toasters artboards. The themes are not tints of one
 * another, so each palette is declared rather than derived.
 */
const ICON_PATHS = {
  success:
    "M7.999 1.333C4.317 1.333 1.332 4.318 1.332 8C1.332 11.682 4.317 14.666 7.999 14.666C11.681 14.666 14.665 11.682 14.665 8C14.665 4.318 11.681 1.333 7.999 1.333ZM10.515 6.755C10.748 6.47 10.706 6.05 10.421 5.817C10.136 5.584 9.716 5.626 9.483 5.911L6.949 9.007L6.137 8.195C5.876 7.935 5.454 7.935 5.194 8.195C4.934 8.455 4.934 8.877 5.194 9.138L6.527 10.471C6.66 10.604 6.844 10.675 7.032 10.665C7.22 10.656 7.395 10.568 7.515 10.422L10.515 6.755Z",
  error:
    "M7.999 1.333C11.681 1.333 14.665 4.318 14.665 8C14.665 11.682 11.681 14.666 7.999 14.666C4.317 14.666 1.332 11.682 1.332 8C1.332 4.318 4.317 1.333 7.999 1.333ZM7.999 9.733C7.557 9.733 7.199 10.091 7.199 10.533C7.199 10.975 7.557 11.333 7.999 11.333C8.44 11.333 8.799 10.975 8.799 10.533C8.799 10.091 8.441 9.733 7.999 9.733ZM7.999 4.666C7.468 4.666 7.057 5.132 7.123 5.659L7.437 8.17C7.472 8.454 7.713 8.666 7.999 8.666C8.284 8.666 8.525 8.454 8.561 8.17L8.875 5.659C8.941 5.132 8.53 4.666 7.999 4.666Z",
} as const;

function ToastIcon({ kind, color }: { kind: keyof typeof ICON_PATHS; color: string }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path fillRule="evenodd" clipRule="evenodd" d={ICON_PATHS[kind]} fill={color} />
      </svg>
    </span>
  );
}

export function Toaster() {
  const { dark } = useTheme();

  const successIcon = dark ? "#00D492" : "#00BC7D"; // emerald-400 / emerald-500
  const errorIcon = dark ? "#FF6467" : "#FB2C36"; // red-400 / red-500

  return (
    <SonnerToaster
      theme={dark ? "dark" : "light"}
      position="bottom-right"
      closeButton
      expand
      duration={2800}
      gap={10}
      offset={16}
      visibleToasts={3}
      icons={{
        success: <ToastIcon kind="success" color={successIcon} />,
        error: <ToastIcon kind="error" color={errorIcon} />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!w-[min(440px,calc(100vw-2rem))] !items-center !gap-2 !rounded-xl !border !p-3 !pr-10 !text-[13px] !leading-5 !font-medium !shadow-none",
          success: dark
            ? "!bg-[#002C22] !border-white/16 !text-neutral-50"
            : "!bg-[#D0FAE5] !border-black/10 !text-[#009966]",
          error: dark
            ? "!bg-[#460809] !border-white/16 !text-neutral-50"
            : "!bg-[#FFE2E2] !border-black/10 !text-[#FB2C36]",
          default: dark
            ? "!bg-[#262626] !border-white/16 !text-neutral-50"
            : "!bg-white !border-black/10 !text-neutral-800",
          closeButton: dark
            ? "!border-none !bg-transparent !text-white/72"
            : "!border-none !bg-transparent !text-black/72",
        },
      }}
    />
  );
}
