import type { Source } from './source.ts';

/** The only place that knows which sources exist (A2). */
export interface SourceRegistry {
  get(id: string): Source | undefined;
  all(): readonly Source[];
}

export function createSourceRegistry(sources: readonly Source[]): SourceRegistry {
  const byId = new Map(sources.map((s) => [s.id, s]));
  return {
    get: (id) => byId.get(id),
    all: () => sources,
  };
}
