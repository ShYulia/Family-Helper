export interface PacingOptions {
  minMs?: number;
  maxMs?: number;
}

// Deliberately vague, human-scale defaults — this is the project's chosen
// bot-detection mitigation (see docs/mvp-scope.md's "Operational
// Considerations": human-like pacing, not stealth tooling).
const DEFAULT_MIN_MS = 500;
const DEFAULT_MAX_MS = 1500;

export async function humanPacingDelay(
  options: PacingOptions = {},
): Promise<void> {
  const min = options.minMs ?? DEFAULT_MIN_MS;
  const max = options.maxMs ?? DEFAULT_MAX_MS;
  const delay = min + Math.random() * (max - min);
  await new Promise((resolve) => setTimeout(resolve, delay));
}
