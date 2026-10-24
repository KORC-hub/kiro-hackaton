export type Rating = 'again' | 'hard' | 'good' | 'easy';
export interface SchedulerState { ease: number; intervalDays: number; repetitions: number; dueAt: Date; }
export type Clock = () => Date;

const dayMs = 24 * 60 * 60 * 1000;
const rounded = (value: number) => Math.max(1, Math.round(value));

export function initialSchedulerState(now: Date): SchedulerState {
  return { ease: 2.5, intervalDays: 0, repetitions: 0, dueAt: new Date(now.getTime()) };
}

export function review(state: SchedulerState, rating: Rating, now: Date): SchedulerState {
  const next: SchedulerState = { ...state, dueAt: new Date(now.getTime()) };
  if (rating === 'again') {
    next.repetitions = 0;
    next.intervalDays = 1;
    next.ease = Math.max(1.3, state.ease - 0.2);
  } else if (rating === 'hard') {
    next.intervalDays = Math.max(1, rounded(state.intervalDays * 1.2));
    next.ease = Math.max(1.3, state.ease - 0.15);
  } else {
    const base = state.repetitions === 0 ? 1 : state.repetitions === 1 ? 3 : rounded(state.intervalDays * state.ease);
    next.intervalDays = rating === 'easy' ? rounded(base * 1.3) : base;
    next.repetitions = state.repetitions + 1;
    if (rating === 'easy') next.ease = state.ease + 0.15;
  }
  next.dueAt = new Date(now.getTime() + next.intervalDays * dayMs);
  return next;
}
