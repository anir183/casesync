# CaseSync - Implementation Plan

## 1) Goals
Build a modular monolith (backend + PostgreSQL + web frontend) implementing:
- Centralized institution profiles with full case history
- Case lifecycle tracking, ownership/assignments, action history
- Cross-bureau/cell overlap detection (same institution) with review workflow and alerts
- Real-time dashboard, search/filter, reports/analytics
- Workflow enforcement, audit trail, RBAC, notifications/deadlines
- Matching that works even if descriptions/refs differ (rule-based + normalized/fuzzy first)

## 2) Tech stack (concrete)
| Component | Choice | Rationale |
|-----------|--------|-----------|
| Backend | Spring Boot 3.x (Java 17+) OR FastAPI (Python 3.11+) | Pick ONE; prefer whichever team can debug fastest. Both fine. Recommend Spring Boot for strong typing/transactions/RBAC patterns; FastAPI also fine. |
| DB | PostgreSQL 16+ | Relational, joins, FKs, transactions, full-text, indexing. |
| Frontend | React + TypeScript + Vite | Fast dev, type-safe. |
| UI | Tailwind CSS + shadcn/ui (or equivalent) | Consistent components, quick to build. |
| Auth | Session-based (server sessions) OR JWT httpOnly cookies | Simpler for monolith + RBAC; avoid localStorage tokens if possible. |
| Storage | Local disk for dev with metadata table; pluggable later | Meet doc requirements. |
| Jobs | Spring @Scheduled or FastAPI APScheduler/Celery-like in-process scheduler | For deadline/SLA checks and reminders. |

## 3) Conventions (strict)
- **API**: REST, JSON, kebab-case or camelCase consistent (pick camelCase), pagination `{items,total,page,pageSize}`, errors `{error,code,details}`
- **DB**: snake_case tables/cols, PKs `id` (BIGSERIAL/UUID), FKs explicit, timestamps `created_at/updated_at` (UTC), soft deletes only if necessary (prefer status/history)
- **Types**: shared types between FE/BE where possible (OpenAPI schema)
- **Validation**: backend is source of truth; enforce enums/state machine
- **Audit**: never overwrite history; mutations create `case_actions` entries
- **Security**: RBAC + bureau/cell scoping, document access via authz checks
- **Docs**: README per module, API docs (OpenAPI), ERD, decision log
- **Testing**: unit tests for matching/state machine, integration tests for critical flows

## 4) Data model (detailed)
### Enums (define)
- `case_status`: RECEIVED, ASSIGNED, UNDER_PROCESS, TRANSFERRED, ESCALATED, DISPOSED, REOPENED (configurable)
- `action_type`: REGISTERED, ASSIGNED, TRANSFERRED, ESCALATED, REMARK_ADDED, DISPOSED, REOPENED, LINKED, UNLINKED, REVIEWED
- `assignment_role`: PRIMARY/SECONDARY (if needed)
- `relationship_match_type`: INSTITUTION_EXACT_ID, INSTITUTION_NAME_FUZZY, COMPLAINT_SIMILAR, MANUAL
- `relationship_review_status`: PENDING, CONFIRMED, DISMISSED
- `notification_type`: OVERLAP_ALERT, PENDING_REMINDER, APPROACHING_DEADLINE, OVERDUE, ESCALATION
- `user_role`: ADMIN, SENIOR_MANAGEMENT, BUREAU_OFFICER, REGIONAL_OFFICER (map to actual needs)

### Core tables
**institutions**
- `id` BIGSERIAL PK (internal stable)
- `aicte_permanent_id` VARCHAR(64) UNIQUE NULL (external; flag if missing)
- `name` VARCHAR(512) NOT NULL
- `name_normalized` VARCHAR(512) (for matching)
- `address` TEXT
- `region_id` FK -> regions(id)
- `other_details` JSONB
- `verified` BOOLEAN DEFAULT false (true if matched by exact perm ID)
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

**regions** (normalize)
- `id` BIGSERIAL PK, `code` VARCHAR(32) UNIQUE, `name` VARCHAR(128)

**bureaus** (RB, PGRC, others)
- `id` BIGSERIAL PK, `code` VARCHAR(32) UNIQUE, `name` VARCHAR(128)

**users**
- `id` BIGSERIAL PK
- `username` VARCHAR(64) UNIQUE NOT NULL
- `full_name` VARCHAR(256) NOT NULL
- `role` user_role NOT NULL
- `bureau_id` FK -> bureaus(id) NULL (scoping)
- `region_id` FK -> regions(id) NULL
- `active` BOOLEAN DEFAULT true
- `password_hash` VARCHAR(255) NOT NULL (if session auth) or use external IdP
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

**cases**
- `id` BIGSERIAL PK
- `case_number` VARCHAR(64) UNIQUE NOT NULL (human-readable like PGRC-2026-001)
- `institution_id` FK -> institutions(id) NOT NULL
- `bureau_id` FK -> bureaus(id) NULL (current bureau)
- `category` VARCHAR(128)
- `description` TEXT
- `status` case_status NOT NULL DEFAULT RECEIVED
- `received_at` TIMESTAMPTZ NOT NULL
- `expected_disposal_at` TIMESTAMPTZ NULL
- `sla_days` INT NULL
- `last_action_at` TIMESTAMPTZ NULL
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()
- INDEXES: (institution_id), (bureau_id), (status), (received_at), (expected_disposal_at), (case_number)

**case_assignments** (history + current)
- `id` BIGSERIAL PK
- `case_id` FK -> cases(id) NOT NULL
- `bureau_id` FK -> bureaus(id) NOT NULL
- `officer_id` FK -> users(id) NULL
- `assigned_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `ended_at` TIMESTAMPTZ NULL
- `assigned_by` FK -> users(id)
- `remarks` TEXT
- INDEXES: (case_id), (officer_id), (bureau_id), (ended_at)

**case_actions** (audit log - append only)
- `id` BIGSERIAL PK
- `case_id` FK -> cases(id) NOT NULL
- `actor_id` FK -> users(id) NOT NULL
- `action_type` action_type NOT NULL
- `from_status` case_status NULL
- `to_status` case_status NULL
- `bureau_from_id` FK -> bureaus(id) NULL
- `bureau_to_id` FK -> bureaus(id) NULL
- `officer_from_id` FK -> users(id) NULL
- `officer_to_id` FK -> users(id) NULL
- `remarks` TEXT
- `metadata` JSONB
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- INDEXES: (case_id, created_at)

**case_relationships** (overlaps/links)
- `id` BIGSERIAL PK
- `case_a_id` FK -> cases(id) NOT NULL
- `case_b_id` FK -> cases(id) NOT NULL
- `match_type` relationship_match_type NOT NULL
- `confidence` NUMERIC(5,2) NULL (0-100)
- `reason` TEXT
- `review_status` relationship_review_status NOT NULL DEFAULT PENDING
- `reviewed_by` FK -> users(id) NULL
- `reviewed_at` TIMESTAMPTZ NULL
- `review_notes` TEXT
- `created_at` TIMESTAMPTZ DEFAULT now()
- CONSTRAINT: case_a_id < case_b_id OR enforce unique pair; UNIQUE(case_a_id, case_b_id)

**notifications**
- `id` BIGSERIAL PK
- `recipient_id` FK -> users(id) NOT NULL
- `type` notification_type NOT NULL
- `reference_id` VARCHAR(128) (e.g. case_id or relationship_id)
- `title` VARCHAR(256)
- `message` TEXT
- `read_at` TIMESTAMPTZ NULL
- `created_at` TIMESTAMPTZ DEFAULT now()
- INDEXES: (recipient_id, read_at)

**attachments** (metadata)
- `id` BIGSERIAL PK
- `case_id` FK -> cases(id) NOT NULL
- `uploaded_by` FK -> users(id) NOT NULL
- `filename` VARCHAR(512)
- `storage_path` VARCHAR(1024)
- `mime_type` VARCHAR(128)
- `size_bytes` BIGINT
- `created_at` TIMESTAMPTZ DEFAULT now()

**sla_config** (configurable)
- `id` BIGSERIAL PK
- `bureau_id` FK -> bureaus(id) NULL
- `category` VARCHAR(128) NULL
- `sla_days` INT NOT NULL
- `active` BOOLEAN DEFAULT true

Notes: use UTC everywhere, soft constraints where sensible, audit all changes.

## 5) Overlap detection engine
Pipeline (deterministic first):
1. **Exact ID match** (highest confidence): if case.institution.aicte_permanent_id present and verified, find other cases with same institution_id (or same verified perm ID). Flag cross-bureau pairs.
2. **Normalized name/metadata**: if no strong match, normalize institution name (lowercase, strip punctuation/spaces, common abbreviations), compare with existing institutions; fuzzy match (e.g., Levenshtein/Jaro-Winkler) with threshold (configurable, start ~0.85). Do NOT auto-merge - create candidate relationship with match_type INSTITUTION_NAME_FUZZY, confidence, needs review.
3. **Complaint similarity (optional but nice)**: if needed, tokenize description, use PostgreSQL `tsvector`/`ts_rank` or trigram similarity; only to boost confidence/explain, not sole basis.

**Rules:**
- Only create relationship if different bureaus involved OR explicitly flagged; but requirement says "complaints concerning same institution handled by multiple Bureaus/Cells" - so focus on cross-bureau.
- Never auto-confirm; always PENDING for review unless manually created by authorized user.
- Explain reason in alert.
- Review workflow: CONFIRMED links them (visible), DISMISSED hides from active alerts.
- Run on case creation and on institution association changes (sync for hackathon).

## 6) API design (REST)
Base: `/api/v1`

| Resource | Endpoints | Notes |
|----------|-----------|-------|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | session-based |
| Institutions | `GET /institutions` (search,q,regionId,page), `GET /institutions/:id` (profile+cases), `POST /institutions` (create if needed) | include verified flag |
| Cases | `GET /cases` (filters: institutionId,bureauId,status,regionId,category,q,dateFrom,dateTo), `POST /cases` (register), `GET /cases/:id` (details), `PATCH /cases/:id/status` (state machine), `POST /cases/:id/assign`, `POST /cases/:id/transfer`, `POST /cases/:id/escalate` | transactional where needed |
| Actions | `GET /cases/:id/actions` (chronological), `POST /cases/:id/actions` (manual remark) | audit trail |
| Assignments | `GET /cases/:id/assignments` | history |
| Relationships/Overlaps | `GET /cases/:id/related`, `GET /overlaps` (pending), `POST /overlaps/:id/review` (confirm/dismiss with notes) | review workflow |
| Dashboard | `GET /dashboard/summary` (totals, byStatus, byBureau, overdue, recentOverlaps) | aggregated |
| Reports | `GET /reports/ageing`, `GET /reports/disposal-rate`, `GET /reports/by-bureau`, `GET /reports/by-region`, `GET /reports/institution-history` | filters + pagination/export-ready |
| Notifications | `GET /notifications` (unread/all), `POST /notifications/:id/read`, `POST /notifications/read-all` | |
| Attachments | `POST /cases/:id/attachments` (upload), `GET /attachments/:id/download` | authz protected |

Authz: middleware checks role + bureau/region scope. Sensitive actions (transfer/escalate/dispose/review) need appropriate roles.

## 7) Frontend structure
Routes:
- `/login`
- `/dashboard` (overview)
- `/cases` (registry, filters)
- `/cases/:id` (details + actions + assignments + related + attachments)
- `/institutions` (search)
- `/institutions/:id` (profile)
- `/overlaps` (review centre)
- `/reports` (analytics)
- `/notifications`

Components: layout, data-table, filters, timeline, status-badge, alert-card, charts (simple), forms.

## 8) Implementation phases
### Phase 1: Project setup & schema (Day1)
- [ ] Init repo structure (backend/, frontend/, docs/, scripts/)
- [ ] DB schema migration (all tables/enums/indexes)
- [ ] Seed data: regions, bureaus (RB, PGRC), users (roles), sample institutions/cases for demo scenario
- [ ] Auth skeleton + RBAC

### Phase 2: Core case management (Day1-2)
- [ ] Institution CRUD/search
- [ ] Case registration with validation
- [ ] Assignments/transfers with history
- [ ] Action history + state machine
- [ ] Case details API/UI

### Phase 3: Overlap detection (Core) (Day2)
- [ ] Normalization utils (name/address)
- [ ] Layer 1 (exact perm ID)
- [ ] Layer 2 (fuzzy name)
- [ ] Relationship creation + alerts
- [ ] Review workflow (confirm/dismiss)
- [ ] Overlap UI + alerts

### Phase 4: Dashboard, search, filters (Day2-3)
- [ ] Dashboard summary API
- [ ] Case registry with filters
- [ ] Institution profile
- [ ] Search across entities

### Phase 5: Workflow, notifications, reports (Day3)
- [ ] Transfers/escalations/reopens with rules
- [ ] SLA config + scheduler for deadlines/overdue
- [ ] Notifications
- [ ] Reports (ageing, disposal rate, by bureau/region)
- [ ] Attachments metadata + upload/download

### Phase 6: Polish, test demo scenario, docs (Day3-4)
- [ ] End-to-end test of demo scenario
- [ ] Authz checks
- [ ] Audit completeness
- [ ] ERD + API docs + README
- [ ] Error handling, validation

## 9) Demo scenario (must work)
1. Register complaint against Institution A via PGRC (case PGRC-2026-001)
2. Register separate complaint against same Institution A via RB (case RB-2026-014)
3. Overlap detected (same institution, different bureaus) -> alert created
4. Dashboard shows "Potential Overlapping Cases – Coordination Required"
5. Authorized user reviews in Overlap centre, inspects both cases, records decision
6. Institution profile shows both cases with independent histories
7. Dashboard metrics reflect statuses/bureaus
8. Transfer/status change updates current state, history preserved

## 10) Improvements suggested
- **Internal IDs everywhere**: never rely solely on external perm ID; flag verification.
- **Explainable alerts**: always show reason/match type/confidence.
- **State machine enforcement**: prevent invalid transitions server-side.
- **Denorm current state**: keep `cases.status/bureau_id` for perf but derive truth from history; updates must be transactional.
- **Pair uniqueness**: enforce (case_a_id,case_b_id) with ordering to avoid duplicates.
- **Notifications scoping**: notify officers/bureaus involved in overlaps/deadlines, not all users.
- **Audit metadata**: include IP/user-agent if easy, at least actor+timestamp+action.
- **Configurable SLAs**: don't hardcode; use sla_config.
- **Fuzzy threshold configurable**: avoid false merges.
- **Pagination + indexes**: critical for scale; add early.

## 11) Immediate next steps
1. Decide backend framework (Spring Boot vs FastAPI) now - pick one.
2. Create project scaffold.
3. Write migration for full schema.
4. Seed demo data.
5. Implement auth + basic case CRUD.
6. Implement overlap engine.
7. Build dashboard/UI.

Do not leave schema/APIs ambiguous. Implement once, correctly.

## 5a) AI integration specifics
### Dependencies
- **Postgres**: `pgvector` extension
- **Python/FastAPI**: `pgvector`, `sentence-transformers`, `httpx`, `numpy`
- **Spring Boot**: Can use `spring-ai` with Ollama, or call Python service, or use ONNX runtime. Recommend Ollama via HTTP for simplicity.
- **Ollama models** (local): `nomic-embed-text` for embeddings (768 dims or use all-MiniLM-L6-v2 384 dims), `llama-3.2` or `gemma2:2b` for explanations.

### Schema updates
Add to `cases`:
- `description_embedding` VECTOR(384) NULL
- `embedding_generated_at` TIMESTAMPTZ NULL

Add to `institutions` (optional):
- `name_embedding` VECTOR(384) NULL

Update `case_relationships`:
- Ensure `metadata` JSONB can store `{similarity: 0.82, model: "all-MiniLM-L6-v2", scores: {...}}`

### Service architecture
- `EmbeddingService`: generate embeddings, store in DB
- `VectorSearchService`: pgvector similarity search
- `AIExplanationService`: call Ollama for explanations with timeout (e.g., 5s), fallback to template
- `OverlapEngine`: orchestrates layers 1-4

### Configuration
```yaml
ai:
  enabled: true
  embeddings:
    enabled: true
    provider: ollama  # or sentence-transformers
    model: nomic-embed-text
    dimension: 384
  llm:
    enabled: true
    provider: ollama
    model: llama-3.2
    timeout: 5000
    explanation:
      enabled: true
  thresholds:
    fuzzy_name: 0.85
    embedding_similarity: 0.75
    high_confidence: 0.85
```
