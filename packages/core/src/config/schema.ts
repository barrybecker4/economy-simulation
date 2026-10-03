import { z } from 'zod';
import { MAX_TICKS } from './limits.js';

export const scenarioSchema = z.object({
  name: z.string().min(1).optional(),
  seed: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  ticks: z.number().int().positive().max(MAX_TICKS).optional(),
  sliders: z.record(z.union([z.number(), z.string()])).optional(),
});

export type ScenarioJson = z.infer<typeof scenarioSchema>;
