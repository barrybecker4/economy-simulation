import { REGISTRY_VERSION } from './limits.js';
import { listSliders, type Slider } from './registry.js';

export function renderAssumptions(): string {
  const lines = [
    '# Assumptions',
    '',
    'Generated from the slider registry. Do not edit by hand.',
    '',
    'Regenerate with `pnpm sim assumptions --out docs/assumptions.md`.',
    '',
    `Registry version: ${REGISTRY_VERSION}.`,
    '',
  ];
  const sliders = [...listSliders()].sort((left, right) => compareIds(left.id, right.id));
  for (const slider of sliders) {
    lines.push(`## ${slider.id}`, '', ...sliderLines(slider), '');
  }
  return lines.join('\n');
}

function compareIds(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function sliderLines(slider: Slider): string[] {
  const lines = [
    `- Label: ${slider.label}`,
    `- Group: ${slider.group}`,
    `- Unit: ${slider.unit}`,
    `- Default: ${slider.default}`,
  ];
  if (slider.kind === 'number') {
    lines.push(`- Range: ${slider.min} to ${slider.max}`);
  } else {
    lines.push(`- Options: ${slider.options.join(', ')}`);
  }
  lines.push(
    `- Status: ${slider.status}`,
    `- Source: ${slider.source}`,
    `- Description: ${slider.description}`,
  );
  return lines;
}
