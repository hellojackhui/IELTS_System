export * from './types';
export * from './words';
export * from './srs';
export * from './quiz';
export * from './course';
export * from './challenge';

// Scenarios: the auto-generated list PLUS hand-authored extras, merged into one
// SCENARIOS export so every consumer sees one unified phrasebook.
import { SCENARIOS as GEN_SCENARIOS, type Scenario, type ScenarioSentence } from './data/scenarios';
import { EXTRA_SCENARIOS } from './data/scenarios-extra';
export type { Scenario, ScenarioSentence };
export const SCENARIOS: Scenario[] = [...GEN_SCENARIOS, ...EXTRA_SCENARIOS];
export { EXTRA_SCENARIOS };

export * from './data/redalert';
export * from './data/redalert-sentences';
export * from './data/redalert-factions';
export * from './data/hoc-scripts';
export * from './data/hoc-quotes';

export * from './api';
