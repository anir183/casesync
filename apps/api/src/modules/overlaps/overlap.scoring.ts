// Public facade for overlap merge scoring. Routes and jobs import from here;
// the seam modules below are internal to the overlaps feature.

export type { MergeResult, ScoringRelationship } from './overlap-merge-support'
export {
  clearReMergeSuppression,
  evaluateAutoMerge,
  mergeRelationship,
  revertMerge,
} from './overlap-merge'
