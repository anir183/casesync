// Public facade for the representatives module. Routes import from here;
// the seam modules below are internal to the feature.

export type {
  DomainInput,
  RepresentativeProfileDto,
  RepresentativeQueueQuery,
  RepresentativeSignupInput,
} from './representative-shared'

export {
  approveRepresentative,
  getRepresentativeProfile,
  listRepresentatives,
  rejectRepresentative,
  revokeRepresentative,
  signUpRepresentative,
  updateRepresentativeProfile,
} from './representative-lifecycle'

export {
  createInstitutionDomain,
  deleteInstitutionDomain,
  listInstitutionDomains,
  suggestInstitutionForEmail,
  updateInstitutionDomain,
} from './representative-domains'

export {
  addRepresentativeAttachment,
  addRepresentativeMessage,
  getRepresentativeAttachment,
  getRepresentativeCase,
  getRepresentativeDashboard,
  listRepresentativeAttachments,
  listRepresentativeCases,
  listRepresentativeMessages,
} from './representative-cases'
