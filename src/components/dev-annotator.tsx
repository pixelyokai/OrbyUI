/**
 * Agentation's annotation toolbar, mounted once in `__root.tsx`.
 *
 * Two guards, each load-bearing:
 *
 * 1. `import.meta.env.DEV` is statically replaced with `false` in a production
 *    build, so `Toolbar` folds to `null` and the `import("agentation")` below
 *    becomes unreachable — Rollup then drops the dependency from the bundle
 *    entirely. AGENTS.md calls out dev-only deps as a Vercel failure mode, so
 *    the import must not survive into the deployed graph. Keep the dynamic
 *    import inside this ternary; hoisting it to a top-level `import` would
 *    ship the package to production.
 *
 * 2. `mounted` keeps it off the server render. The toolbar returns a React
 *    portal and touches `document` on first render, which would throw during
 *    TanStack Start's SSR pass.
 */

import { lazy, Suspense, useEffect, useState } from "react";

const Toolbar = import.meta.env.DEV
  ? lazy(() => import("agentation").then((m) => ({ default: m.Agentation })))
  : null;

export function DevAnnotator() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!Toolbar || !mounted) return null;

  return (
    <Suspense fallback={null}>
      {/*
       * The toolbar hard-codes `bottom/right: 1.25rem`, which parks it on top of
       * the control panel — the surface most worth annotating. Move it over the
       * stage instead. `!important` is required: its own rule is a single class,
       * so equal specificity would leave the winner up to stylesheet order.
       * Scoped here rather than in styles.css so it disappears with the toolbar
       * in a production build.
       */}
      <style>{`
        .orby-annotator { right: auto !important; left: 1.25rem !important; }
        .orby-annotator > * { margin-left: 0 !important; align-self: flex-start !important; }
      `}</style>
      <Toolbar className="orby-annotator" />
    </Suspense>
  );
}
