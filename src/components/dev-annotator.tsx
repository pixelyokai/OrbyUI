/**
 * Agentation's annotation toolbar, mounted once in `__root.tsx`.
 *
 * Keep the dynamic import inside the DEV ternary — hoisting it to a top-level
 * import ships the dev-only package to production. `mounted` keeps the toolbar
 * off the server render; it portals and touches `document` on first render.
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
      {/* The toolbar hard-codes bottom/right, parking it over the control panel.
          !important because its own rule is a single class. Scoped here so it
          disappears with the toolbar in production. */}
      <style>{`
        .orby-annotator { right: auto !important; left: 1.25rem !important; }
        .orby-annotator > * { margin-left: 0 !important; align-self: flex-start !important; }
      `}</style>
      <Toolbar className="orby-annotator" />
    </Suspense>
  );
}
