export interface IntentWeights {
  novelty: number
  connection: number
  surrender: number
}

export const INTENT_PRESETS: Record<string, IntentWeights> = {
  novelty: { novelty: 0.8, connection: 0.1, surrender: 0.1 },
  connection: { novelty: 0.1, connection: 0.8, surrender: 0.1 },
  surrender: { novelty: 0.1, connection: 0.1, surrender: 0.8 },
  balanced: { novelty: 0.34, connection: 0.33, surrender: 0.33 },
}

export function normalizeWeights(w: IntentWeights): IntentWeights {
  const sum = w.novelty + w.connection + w.surrender
  if (sum <= 0) return INTENT_PRESETS.balanced
  return { novelty: w.novelty / sum, connection: w.connection / sum, surrender: w.surrender / sum }
}
