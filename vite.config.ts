import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";
import { isMigrationFile } from "./scripts/migration-plan.mjs";

/** The files `src/lib/db.ts` globs — same directory, same non-recursive scope. */
function hasGlobbedMigrations(root: string): boolean {
  try {
    return readdirSync(join(root, "migrations")).some(isMigrationFile);
  } catch {
    return false;
  }
}

/**
 * Finish PGLite bootstrap during dev-server setup (before traffic). Vite awaits
 * async `configureServer` hooks. Production: `src/lib/db` kicks `ensureDbReady`
 * on import.
 *
 * Vite awaiting the hook puts this on time-to-first-render, so an app with no
 * migrations — no schema to apply — skips it entirely rather than paying for a
 * PGLite instance it never queries.
 */
function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "app-builder:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      if (!hasGlobbedMigrations(server.config.root)) return;
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[app-builder] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

/**
 * Live-preview OAuth popup — handled HERE so the agent never has to create a
 * `/auth/popup` route (and cannot break it by scaffolding a React page that
 * paints the full app shell in the popup).
 *
 * `signIn` (client.ts) opens `/auth/popup?providerId=…` in a top-level window.
 * This middleware runs before TanStack Start, calls `handleAuthPopupRequest`,
 * and returns the 302 / completion HTML. Deployed apps do not use the popup
 * (full-page OAuth redirect), so `apply: "serve"` is enough.
 */
function authPopupPlugin(): Plugin {
  return {
    name: "app-builder:auth-popup",
    apply: "serve",
    configureServer(server) {
      // Register immediately (not in a returned post-hook) so we run BEFORE
      // TanStack Start / the SPA HTML fallback. A model-authored
      // `src/routes/auth/popup.tsx` React page must never win this path.
      server.middlewares.use(async (req, res, next) => {
        try {
          const rawUrl = req.url ?? "";
          const pathOnly = rawUrl.split("?", 1)[0] ?? "";
          if (pathOnly !== "/auth/popup") {
            next();
            return;
          }
          if ((req.method ?? "GET").toUpperCase() !== "GET") {
            res.statusCode = 405;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("Method Not Allowed");
            return;
          }

          const host = String(
            req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:8080",
          );
          const proto = String(
            req.headers["x-forwarded-proto"] ??
              ((req.socket as { encrypted?: boolean } | undefined)?.encrypted ? "https" : "http"),
          );
          const requestHeaders = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
              for (const v of value) requestHeaders.append(key, v);
            } else {
              requestHeaders.set(key, value);
            }
          }
          // Ensure Host is the public preview host so Better Auth's dynamic
          // baseURL / redirect_uri match the popup origin.
          if (!requestHeaders.has("host")) requestHeaders.set("host", host);

          const request = new Request(`${proto}://${host}${rawUrl}`, {
            method: "GET",
            headers: requestHeaders,
          });

          const mod = (await server.ssrLoadModule("/src/lib/auth/popup.server.ts")) as {
            handleAuthPopupRequest: (req: Request) => Promise<Response>;
          };
          const response = await mod.handleAuthPopupRequest(request);

          res.statusCode = response.status;
          // Preserve multiple Set-Cookie headers (OAuth state + session).
          const setCookies =
            typeof response.headers.getSetCookie === "function"
              ? response.headers.getSetCookie()
              : [];
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === "set-cookie") return;
            res.setHeader(key, value);
          });
          for (const cookie of setCookies) {
            res.appendHeader("set-cookie", cookie);
          }
          const body = Buffer.from(await response.arrayBuffer());
          res.end(body);
        } catch (err) {
          console.error("[app-builder] /auth/popup handler failed:", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("auth popup failed");
          }
        }
      });
    },
  };
}

// `0.0.0.0:8080` is the live-preview contract — don't change host/port.
// The dev server starts once `src/router.tsx` and `src/routes/` exist — see
// AGENTS.md § "First scaffold".
/**
 * Mirrors the predicate in `src/lib/auth/{client,server}.ts`. Read here so the
 * document cache rule below can be withheld whenever sign-in is on.
 */
const authEnabled = process.env.VITE_AUTH_ENABLED !== "false";

export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  optimizeDeps: {
    include: [
      "zustand",
      "sonner",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      "@radix-ui/react-dialog",
      "@radix-ui/react-tabs",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
      "lenis",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconShuffle",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconArrowRotateCounterClockwise",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconCodeBrackets",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconBurst",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconLayersTwo",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconBookmark",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconAtom",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconColorPalette",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconBezier",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconFormCircle",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconDotGrid3x3",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconClock",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconChevronRightSmall",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconInfoSimple",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconSun",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconMoon",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconCheckmark1Small",
      "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconClipboard",
    ],
  },
  plugins: [
    pgliteBootstrapPlugin(),
    // Before tanstackStart so /auth/popup never falls through to the SPA.
    authPopupPlugin(),
    // Dev-only /__app-env, read by scripts/check-auth-invariant.mjs.
    appEnvPlugin(),
    // PWA head + ?install=1 tutorial page; runs before Start/Nitro.
    grokPwaPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: "vercel",
            // Auto-registers server/middleware/* (the PWA install page +
            // manifest + head-tag middleware). Nitro v3 defaults serverDir to
            // false, so removing this silently unwires /?install=1 on deploys.
            serverDir: "./server",
            routeRules: {
              // Baseline hardening. No X-Frame-Options / frame-ancestors here:
              // the app is deliberately embedded by the Grok preview host, and
              // AGENTS.md forbids blocking grok.com.
              "/**": {
                headers: {
                  "x-content-type-options": "nosniff",
                  "referrer-policy": "strict-origin-when-cross-origin",
                  "permissions-policy":
                    "camera=(), microphone=(), geolocation=(), payment=()",
                },
              },
              /*
               * Let the CDN absorb document traffic. Without this every hit —
               * including bot scans of /wp-admin and friends — costs a
               * serverless invocation, which is the app's only real abuse
               * vector (there is no DB, no API, no upload path).
               *
               * Gated on auth being OFF. With sign-in enabled the document
               * becomes per-user and a shared cache would serve one visitor's
               * HTML to another. `max-age=0` keeps browsers revalidating;
               * only the shared cache holds a copy.
               */
              ...(authEnabled
                ? {}
                : {
                    "/": {
                      headers: {
                        "cache-control":
                          "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
                      },
                    },
                  }),
              // Auth endpoints must never be cached, belt-and-braces.
              "/auth/**": { headers: { "cache-control": "no-store" } },
            },
          }),
        ]
      : []),
    viteReact(),
  ],
}));
