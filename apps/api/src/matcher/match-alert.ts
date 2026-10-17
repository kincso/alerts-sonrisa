import { SEVERITIES, type Alert, type Event } from '@alerts/shared';

/** The fields of an alert the match depends on. */
export type MatchableAlert = Pick<Alert, 'sourceId' | 'keywords' | 'minSeverity'>;

const rank = (severity: Event['severity']) => SEVERITIES.indexOf(severity);

function hasKeyword(keywords: readonly string[], event: Event): boolean {
  if (keywords.length === 0) return true;
  const text = `${event.title}\n${event.summary}`.toLowerCase();
  return keywords.some((k) => text.includes(k.toLowerCase()));
}

/**
 * Pure (A1, D8): same source, any keyword (case-insensitive substring of title or
 * summary; none = all), and severity at or above the alert's minimum.
 */
export function matchAlert(alert: MatchableAlert, event: Event): boolean {
  return (
    alert.sourceId === event.sourceId &&
    rank(event.severity) >= rank(alert.minSeverity) &&
    hasKeyword(alert.keywords, event)
  );
}
