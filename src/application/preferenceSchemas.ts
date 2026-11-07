import { z } from 'zod';

import { MOTION_PREFERENCES, NUMBER_FORMATS, SWITCH_VALUES } from '@/domain/settings';
import { TUTORIAL_STEPS } from '@/domain/tutorial';

export const tutorialProgress = z.object({
  completedSteps: z.array(z.enum(TUTORIAL_STEPS)),
  explanations: z.enum(['shown', 'skipped']),
});

export const settings = z.object({
  sound: z.enum(SWITCH_VALUES),
  haptics: z.enum(SWITCH_VALUES),
  reducedMotion: z.enum(MOTION_PREFERENCES),
  numberFormatting: z.enum(NUMBER_FORMATS),
});
