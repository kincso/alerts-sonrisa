/** An admin on/off switch while its PATCH runs, or after it failed. */
export type SwitchState =
  { kind: 'pending'; enabled: boolean } | { kind: 'error'; message: string };

export type SwitchStates = Partial<Record<string, SwitchState>>;

/** Returns `states` with `id` set to `state`, or removed when `state` is undefined. */
export function withSwitchState(
  states: SwitchStates,
  id: string,
  state: SwitchState | undefined,
): SwitchStates {
  const others = Object.fromEntries(Object.entries(states).filter(([key]) => key !== id));
  return state ? { ...others, [id]: state } : others;
}

/** While pending the switch shows the requested value; after a failure the saved one. */
export function shownValue(saved: boolean, state: SwitchState | undefined): boolean {
  return state?.kind === 'pending' ? state.enabled : saved;
}
