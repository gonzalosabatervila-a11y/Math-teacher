import type { PersonalStateV2, ReviewItem } from '../state/personal-state';

const REVIEW_DELAY_MS = 48 * 60 * 60 * 1_000;

export function scheduleReview(sourceSessionId: string, variantProblem: string, completedAt: number): ReviewItem | null {
  const problem = variantProblem.trim();
  if (!problem) return null;
  return {
    id: `review-${sourceSessionId}-${completedAt}`,
    sourceSessionId,
    variantProblem: problem,
    dueAt: new Date(completedAt + REVIEW_DELAY_MS).toISOString(),
    completedAt: null,
    status: 'pending',
  };
}

export function completeReview(state: PersonalStateV2, reviewId: string, now: number): PersonalStateV2 {
  const completedAt = new Date(now).toISOString();
  return {
    ...state,
    reviews: state.reviews.map((review) => review.id === reviewId && review.status === 'pending'
      ? { ...review, status: 'completed' as const, completedAt }
      : review),
    updatedAt: completedAt,
  };
}
