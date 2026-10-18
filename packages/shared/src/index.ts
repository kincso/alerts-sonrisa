/** Severity levels, lowest first. The only place this order is defined. */
export const SEVERITIES = ['low', 'medium', 'high'] as const;

export type Severity = (typeof SEVERITIES)[number];

/** GET /api/health (decisions.md S0-6). */
export interface HealthResponse {
  status: 'ok';
  severities: readonly Severity[];
}

export * from './identity';
export * from './channels';
export * from './errors';
export * from './sources';
export * from './alerts';
export * from './deliveries';
