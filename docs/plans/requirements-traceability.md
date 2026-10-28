# CaseSync - Requirements Traceability Matrix

This maps the original problem statement to our implementation. Source of truth: problem statement + docs/plans.

## 1) Objectives
| Req ID | Requirement | Status | Location | Notes |
|---|---|---|---|---|
| OBJ-01 | View all institution-related cases in one place | Planned | `apps/api/modules/cases/`, `apps/web/features/cases/`, dashboard | Centralized |
| OBJ-02 | Identify Bureau/Cell currently handling each case | Planned | `cases.bureauId`, `case_assignments` (current) | UI shows current |
| OBJ-03 | Track complete status and movement | Planned | `cases.status`, `case_actions` (append-only), `case_assignments` | Full history |
| OBJ-04 | Identify overlaps (RB/PGRC/others), same institution | Planned | `modules/overlaps/` + Jev | DB narrows first |
| OBJ-05 | Avoid duplication, ensure coordination | Planned | Overlap queue + `case_relationships` | Human-in-the-loop |
| OBJ-06 | Monitor pending/under-process/disposed/transferred/escalated | Planned | Status enums + dashboard | |
| OBJ-07 | Reports by institution/region/bureau/status | Planned | `modules/reports/` | |
| OBJ-08 | Alerts for pending and approaching timelines | Planned | `notifications`, `jobs/`, SLA logic | Uses `slaConfig` |

## 2) Features

### 2.1 Centralized Institution Profile
| Req ID | Requirement | Status | Location | Notes |
|---|---|---|---|---|
| INST-01 | Unique Institution ID/AICTE Permanent ID | Planned | `models/institution.model.ts` `aictePermanentId` (sparse unique) | Internal + external |
| INST-02 | Name, address, region, other details | Planned | `institutions` | `nameNormalized`, `verified` |
| INST-03 | Consolidated history | Planned | Institution profile UI | All bureaus |

### 2.2 Complaint/Case Tracking
| Req ID | Requirement | Status | Location | Notes |
|---|---|---|---|---|
| CASE-01 | Unique Complaint/Case ID | Planned | `cases.caseNumber` unique | |
| CASE-02 | Date of receipt | Planned | `cases.receivedAt` | |
| CASE-03 | Nature/category | Planned | `cases.category` | |
| CASE-04 | Current status | Planned | `cases.status` | |
| CASE-05 | Presently assigned Bureau/Cell | Planned | `cases.bureauId` + current assignment | |
| CASE-06 | Assigned officer/official | Planned | current `case_assignments.officerId` | |
| CASE-07 | Last action taken | Planned | `case_actions` latest + `cases.lastActionAt` | Maintained on append |
| CASE-08 | Next action required | Planned | `cases.nextAction`, `cases.nextActionDueAt` | **Added** |
| CASE-09 | Date of last action and expected disposal date | Planned | `cases.lastActionAt`, `cases.expectedDisposalAt` | |

### 2.3 Cross-Bureau/Cell Overlap Detection
| Req ID | Requirement | Status | Location | Notes |
|---|---|---|---|---|
| OVR-01 | Auto identify same institution across RB/PGRC/others | Planned | `overlap.service.ts` | Rules-first + Jev |
| OVR-02 | Overlap alert to authorized officials | Planned | Queue + notifications | **"Potential Overlapping Cases – Coordination Required"** |
| OVR-03 | Linking/mapping of related complaints/cases | Planned | `case_relationships` + compare view | Human decision |

### 2.4 Real-Time Dashboard
| Req ID | Requirement | Status | Location | Notes |
|---|---|---|---|---|
| DASH-01 | Total received | Planned | Dashboard aggregation | |
| DASH-02 | Pending | Planned | Dashboard | |
| DASH-03 | Under process | Planned | Dashboard | |
| DASH-04 | Disposed | Planned | Dashboard | |
| DASH-05 | Transferred | Planned | Dashboard | |
| DASH-06 | Pending beyond prescribed timelines | Planned | Dashboard + SLA (`slaConfig`) | Computed vs expectedDisposalAt/SLAs |
| DASH-07 | Institution-wise case status | Planned | Dashboard aggregation | **Added** |
| DASH-08 | Bureau/Cell-wise workload | Planned | Dashboard aggregation (current bureau) | **Added** |

### 2.5 Workflow & Action History
| Req ID | Requirement | Status | Location | Notes |
|---|---|---|---|---|
| WF-01 | Chronological history | Planned | `case_actions` append-only | |
| WF-02 | Officer/Bureau responsible | Planned | `case_actions` fields | |
| WF-03 | Date and time stamp | Planned | `createdAt` UTC | |
| WF-04 | Remarks and supporting documents | Planned | `remarks` + `attachments` | |
| WF-05 | Transfer/escalation history | Planned | `case_actions` + `case_assignments` | |

### 2.6 Search & Filters
| Req ID | Requirement | Status | Location | Notes |
|---|---|---|---|---|
| SRCH-01 | Institution Name | Planned | API filters | |
| SRCH-02 | AICTE Permanent ID | Planned | API filters | |
| SRCH-03 | Complaint/Case ID | Planned | `cases.caseNumber` | |
| SRCH-04 | Bureau/Cell | Planned | `bureauId` | |
| SRCH-05 | Region | Planned | via institution | |
| SRCH-06 | Complaint category | Planned | `category` | |
| SRCH-07 | Status | Planned | `status` | |
| SRCH-08 | Date range | Planned | `receivedAt` | |

### 2.7 Alerts & Notifications
| Req ID | Requirement | Status | Location | Notes |
|---|---|---|---|---|
| ALRT-01 | Duplicate/overlapping alerts | Planned | Overlap notifications | |
| ALRT-02 | Pending reminders | Planned | `jobs/` | |
| ALRT-03 | Escalation alerts | Planned | On escalate | |
| ALRT-04 | Timeline/SLA alerts | Planned | SLA job | Uses `slaConfig` |

### 2.8 Reports & Analytics
| Req ID | Requirement | Status | Location | Notes |
|---|---|---|---|---|
| RPT-01 | Bureau-wise | Planned | `modules/reports/` | |
| RPT-02 | Region-wise | Planned | `modules/reports/` | |
| RPT-03 | Institution-wise complaint history | Planned | Reports + profile | |
| RPT-04 | Pending case ageing analysis | Planned | Reports (age buckets) | |
| RPT-05 | Disposal rate | Planned | Reports | |
| RPT-06 | Overlapping/duplicate cases | Planned | From relationships/assessments | |
| RPT-07 | Monthly/quarterly performance reports | Planned | Reports with date grouping | |

## 3) Innovation
| Req ID | Requirement | Status | Location | Notes |
|---|---|---|---|---|
| INV-01 | Data matching/rule-based/AI-assisted to identify same institution even if descriptions/references differ | Planned | Jev pairwise via `POST /v1/systemone` (backend-only) | Sends description+metadata |
| INV-02 | Display "Potential Overlapping Cases – Coordination Required" | Planned | UI | Exact text |
| INV-03 | Human decides coordination | Planned | Review workflow, separate assessments/relationships | No auto-merge/confirm |

## 4) Target Users & Roles
| Req ID | Requirement | Status | Location | Notes |
|---|---|---|---|---|
| USER-01 | AICTE Regulation Bureau (RB) | Planned | Roles/scoping | |
| USER-02 | Public Grievance Redressal Cell (PGRC) | Planned | Roles/scoping | |
| USER-03 | Other concerned AICTE Bureaus/Cells | Planned | `bureaus` + roles | |
| USER-04 | Regional Offices/Centres | Planned | `REGIONAL_OFFICER` role + region scoping | **Added** |
| USER-05 | Authorized officers and senior management | Planned | `BUREAU_OFFICER`, `SENIOR_MANAGEMENT` | **Added** |
| USER-06 | Competent Authority/AICTE administration | Planned | `COMPETENT_AUTHORITY`, `ADMIN` | **Added** |

**Overall:** Aligned with minor additions (nextAction, lastActionAt maintenance, slaConfig, expanded roles, explicit dashboard tiles, Related Cases tab, exact alert text). All in permanent docs/plans.
