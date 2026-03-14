### Implementation Plan (Prototype)
*Implementation plan based on the "walking skeleton" principle.*

The implementation plan is structured so that **each phase delivers a working vertical slice** of the system while progressively expanding capability. Every phase spans:

- database
- server
- client
- tests

A phase is only complete when all newly introduced functionality conforms to the relevant sections of this specification.

Prototype constraints:

- The prototype uses a **local PostgreSQL instance** with two databases:
  - `schematic_internal_db`
  - `schematic_mock_asset_db`
- No enterprise authentication integration.
- No GraphQL sensor integration.
- No CI/CD integration.

The outcome of completing all phases should be a **fully conformant prototype implementation without requiring retrospective conformance review phases**.

---

#### Phase 1: Foundation & "Hello World"

**Goal:** Prove the core infrastructure, development toolchain, and basic client–server–database connectivity.

##### Infrastructure

Create the monorepo project structure:

```
/backend
/frontend
/docs
```

Initialize backend with `uv`.

Initialize frontend using **Vite + React + TypeScript**.

##### Database

Configure connection to the local PostgreSQL instance.

Create two databases:

- `schematic_internal_db`
- `schematic_mock_asset_db`

##### Server (Django)

Initialize the Django project.

Configure database connection via `.env`.

Install core dependencies:

- django
- djangorestframework
- psycopg
- pytest

Implement a minimal endpoint:

```
GET /api/health
```

The endpoint must:

- confirm API availability
- verify connection to the internal database
- return a request correlation identifier.

##### Client (React/Vite)

Create a simple landing page.

Fetch `/api/health`.

Display the returned status.

##### Testing

Add a backend `pytest` verifying `/api/health`.

Add a frontend `vitest` verifying the health endpoint renders successfully.

**Result:**  
A runnable application where the browser communicates with the API and the API successfully connects to the database.

---

#### Phase 2: Database Scaffolding

**Goal:** Implement the internal application schema exactly as defined in the database layer of this specification.

#### Database

Create Django models for the Level-1 schema:

- `DRAWING_TYPES`
- `IMAGES`
- `FITTING_POSITIONS`

Implement all fields defined in the Level-1 entity relationship diagram.

Apply required constraints:

- `UNIQUE(type_name)` on `DRAWING_TYPES`
- `UNIQUE(image_id, label_text)` on `FITTING_POSITIONS`

Create required indexes for performance:

- `FITTING_POSITIONS (label_text)`
- `IMAGES (component_name)`

#### Migrations

Generate Django migrations.

Apply migrations to `schematic_internal_db`.

#### Mock Asset Database

Create a minimal schema in `schematic_mock_asset_db` representing asset data.

Populate it with mock rows linked to fitting position identifiers.

#### Seed Data

Implement a Django management command to preload drawing types.

#### Testing

Add unit tests verifying:

- schema creation
- model constraints
- index presence.

**Result:**  
The database schema is fully implemented and conforms to the design defined in this specification.

---

### Phase 3: First Vertical Slice (Diagram Viewing)

**Goal:** Prove the primary user workflow — selecting and viewing a drawing with mapped fitting positions.

#### Data Preparation

Seed:

- one `DRAWING_TYPES` row
- one `IMAGES` row
- several `FITTING_POSITIONS`.

#### Server

Implement endpoints:

```
GET /api/images
GET /api/images/{image_id}
GET /api/images/{image_id}/fitting-positions
```

#### Client

Implement the basic UI screens:

- Image Selection screen
- Image Viewer screen

Create the following components:

- `ImageSelectionPage`
- `ImageTileCard`
- `DiagramCanvasViewport`
- `POIMarkerPin`

The viewer must support:

- pan
- zoom
- marker rendering.

#### Testing

Backend tests verifying image endpoints.

Frontend tests verifying:

- tile rendering
- marker rendering.

**Result:**  
A user can select a diagram and view it with mapped points of interest.

---

### Phase 4: External Source Integration (Aggregation Skeleton)

**Goal:** Demonstrate aggregation of internal and external data sources and validate degraded-mode behaviour.

#### Server

Implement endpoint:

```
GET /api/fitting-positions/{fitting_position_id}/details
```

Create an adapter layer:

```
asset_adapter.py
```

Responsibilities:

- query the mock asset database
- combine results with internal data
- handle timeouts and failures.

Responses must include:

```
source_status
```

#### Client

Implement interaction components:

- `ViewerLeftDrawer`
- `InformationTab`
- `POITooltipCard`

Behaviour:

- clicking a POI loads component details
- hover displays a tooltip.

#### Resilience Test

Simulate asset adapter failure and verify:

- API returns `source_status=degraded`
- UI renders gracefully without crashing.

**Result:**  
The application demonstrates federated data access and graceful handling of external service failures.

---

### Phase 5: Admin Upload & Mapping Workflow

**Goal:** Implement the admin workflow for uploading diagrams and mapping fitting positions.

#### Server

Implement upload lifecycle endpoints:

```
POST /api/admin/uploads
PUT /api/admin/uploads/{upload_id}/parts/{part_number}
POST /api/admin/uploads/{upload_id}/complete
DELETE /api/admin/uploads/{upload_id}
```

Upload system requirements:

- resumable uploads
- checksum validation
- staged uploads prior to commit.

Implement mapping endpoint:

```
POST /api/admin/fitting-positions/bulk
```

#### Client

Implement the admin UI:

- `AdminUploadMappingPage`
- `AdminWorkflowStepper`
- `UploadSessionPanel`
- `MappingWorkbench`

Workflow steps:

1. select drawing type  
2. upload diagram  
3. map fitting positions  
4. review and save

#### Validation

Ensure:

- label uniqueness within an image
- staged deletions during edit workflows
- cancel discards staged changes.

#### Testing

Add tests for:

- upload retry
- upload resume
- mapping validation.

**Result:**  
Administrators can upload new diagrams and map fitting positions to coordinates.

---

### Phase 6: Search Architecture

**Goal:** Implement the search capability defined in the Search Architecture section.

#### Server

Implement service layer:

- `SearchService`
- `SearchIndexService`
- `SearchConfigService`

Implement endpoint:

```
GET /api/search
```

Features:

- `image_id` scoped search
- ranked results
- deduplication at fitting position level
- cursor pagination.

#### Client

Implement search components:

- `SearchResultsPanel`
- `SearchResultItem`
- `SourceFilterChips`

Behaviour:

- search scoped to selected image
- clicking a result pans to the corresponding POI.

#### Testing

Add tests verifying:

- ranking behaviour
- pagination
- source filtering.

**Result:**  
Users can search component information associated with the displayed diagram.

---

### Phase 7: UI System & Performance Conformance

**Goal:** Ensure the user interface conforms to the visual system and performance requirements defined in this specification.

#### Theme

Implement global MUI theme:

```
src/theme.ts
```

Include:

- colour palette
- typography scale
- component overrides.

### Component Architecture

Implement the atomic component hierarchy:

- atoms
- molecules
- organisms.

#### Performance

Implement rendering optimizations:

- viewport culling
- marker clustering
- memoized marker components.

#### Testing

Verify:

- accessibility compliance
- keyboard navigation
- performance with large diagrams.

**Result:**  
The UI visually conforms to the design system and meets the required performance characteristics.

---

### Phase 8: Operational Hardening

**Goal:** Implement operational behaviours required for a production-capable architecture.

#### Server

Add middleware for:

- request correlation IDs
- structured logging
- adapter timeout handling.

Implement management commands:

```
refresh_search_projection
cleanup_upload_sessions
```

#### Client

Implement:

- error boundaries
- degraded state indicators
- source status chips.

#### Testing

Simulate:

- external source failures
- partial API failures.

**Result:**  
The system behaves predictably under degraded or partial failure conditions.

---

### Phase 9: Final Specification Conformance Verification

**Goal:** Validate that the implementation fully conforms to this specification.

#### Tasks

Perform a structured audit against:

- requirements
- architecture
- database design
- API contracts
- UI system
- testing strategy.

Run verification commands:

```
uv run pytest
uv run mypy .
uv run ruff check .
npm run test
npm run build
npm run lint
```

**Result:**  
The prototype implementation fully conforms to the specification without requiring additional remediation phases.