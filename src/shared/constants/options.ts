import { scenarioMeta } from '@domain/procurement/meta';
import type { ExecutionScenario } from '@domain/procurement/types';

export const scenarioOptions = (Object.keys(scenarioMeta) as ExecutionScenario[])
  .slice(0, 5)
  .map((value) => ({ value, label: scenarioMeta[value].label }));

export const acceptanceOptions = [
  { value: 'PASS', label: '验收通过' },
  { value: 'CONDITIONAL', label: '有条件通过' },
  { value: 'REJECT', label: '验收不通过' },
];
