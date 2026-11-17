// Public facade for the cases module. Routes, jobs, and other features import
// from here; the seam modules below are internal to the feature.

export type {
  AssignmentInput,
  CaseDto,
  CaseFilters,
  CaseListQuery,
  CreateCaseInput,
  NextActionInput,
  StatusChangeInput,
} from './case-shared'

export { appendCaseAction } from './case-audit'
export { requireCase } from './case-shared'

export {
  exportCasesCsv,
  getCase,
  getCaseDetail,
  listCaseActions,
  listCaseAssignments,
  listCases,
  listRelatedCases,
} from './case-query'

export {
  addRemark,
  assignCase,
  changeCaseStatus,
  createCase,
  disposeCase,
  escalateCase,
  setNextAction,
  transferCase,
} from './case-lifecycle'
