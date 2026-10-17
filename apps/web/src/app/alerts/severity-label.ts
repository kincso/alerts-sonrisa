import type { Severity } from '@alerts/shared';

const LABELS: Record<Severity, string> = { low: 'Low', medium: 'Medium', high: 'High' };

export function severityLabel(severity: Severity): string {
  return LABELS[severity];
}
