// Skill rating from decision-quality samples, with Bayesian shrinkage toward a
// neutral prior so a handful of decisions can't show as elite (or terrible).
// rating = (qualitySum + K*M) / (decisions + K): with few decisions it sits
// near M; it only approaches the true mean once the sample is large.
const PRIOR_WEIGHT = 40; // ≈ how many "neutral" decisions of prior belief
const PRIOR_MEAN = 50; // neutral baseline quality

export function shrunkRating(qualitySum: number, decisions: number): number {
  return (
    (qualitySum + PRIOR_WEIGHT * PRIOR_MEAN) / (decisions + PRIOR_WEIGHT)
  );
}

// How many more graded decisions until shrinkage is mostly gone (for UI hints).
export const RATING_PRIOR_WEIGHT = PRIOR_WEIGHT;
