// Shot lengths and outgoing overlaps are shared by the edit and audio cue sheet.
// Preserve the reading time after each transition when changing its overlap.
export const SHOTS = [60, 100, 125, 110, 102, 105, 135, 112, 115, 105, 100];
// Horizontal / vertical sweeps are quick; mosaic reveals take 1.6 seconds.
export const TRANSITIONS = [18, 48, 20, 20, 48, 20, 20, 38];
export const INTRO_OVERLAP = 18;
export const STRATEGY_OVERLAP = 36;
export const STARTS = SHOTS.reduce<number[]>((starts, _duration, i) => {
  const overlap = i===1 ? INTRO_OVERLAP : i===4 ? STRATEGY_OVERLAP : i >= 2 ? TRANSITIONS[i > 4 ? i - 3 : i - 2] : 0;
  starts.push((starts[i - 1] ?? 0) + (i ? SHOTS[i - 1] : 0) - overlap);
  return starts;
}, []);
export const TOTAL_FRAMES = SHOTS.reduce((a, b) => a + b, 0) - TRANSITIONS.reduce((a, b) => a + b, 0) - INTRO_OVERLAP - STRATEGY_OVERLAP;
