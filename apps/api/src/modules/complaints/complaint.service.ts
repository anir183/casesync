// Public facade for the complaints module. Routes, jobs, and other features import
// from here; the seam modules below are internal to the feature.

export type {
  ComplaintInput,
  PublicComplaintDetail,
  PublicComplaintSummary,
  SignupInput,
  VerificationDto,
  VerificationInput,
} from './complaint-shared'

export {
  listPublicCategories,
  listPublicInstitutions,
  loadBureauNames,
  loadInstitutionNames,
  loadPublicDetail,
  toPublicDocument,
  toPublicMessage,
  toPublicSummary,
} from './complaint-public'

export {
  getPortalProfile,
  getVerificationDocument,
  listVerificationRequests,
  reviewVerification,
  signUpComplainant,
  submitVerification,
  updatePortalProfile,
} from './complaint-verification'

export {
  addComplainantAttachment,
  getOwnAttachment,
  getOwnComplaint,
  listOwnAttachments,
  listOwnComplaints,
  submitComplaint,
  trackComplaint,
} from './complaint-intake'

export {
  acceptResolution,
  acknowledgeComplaint,
  addComplainantMessage,
  listOwnMessages,
  listStaffMessages,
  postStaffMessage,
  reopenComplaint,
  requestInformation,
  resolveComplaint,
} from './complaint-conversation'
