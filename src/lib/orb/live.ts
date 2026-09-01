let live = 0;

export function acquireOrb() {
  live += 1;
  return live;
}

export function releaseOrb() {
  live = Math.max(0, live - 1);
  return live;
}

export function liveOrbCount() {
  return live;
}

/** Browsers typically allow ~8–16 WebGL contexts. Stay conservative. */
export function orbBudgetTight() {
  return live > 4;
}
