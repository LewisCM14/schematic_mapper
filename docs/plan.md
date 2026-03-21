### Implementation Plan (Prototype)
*Implementation plan based on the "walking skeleton" principle.*


The implementation plan is structured so that **each phase delivers a working vertical slice** of the system while progressively expanding capability. Every phase spans:

- database
- server
- client
- authentication & authorization
- tests

- database
- server
- client
- tests

A phase is only complete when all newly introduced functionality conforms to the relevant sections of this specification.


Prototype constraints:

- The prototype uses a **local PostgreSQL instance** with two databases:
  - `schematic_internal_db`
  - `schematic_mock_asset_db`
- Authentication and authorization are supported from the outset for both local development and enterprise (IIS/LDAP/AD) environments.
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

##### Server (Django) & Authentication

Initialize the Django project.

Configure database connection via `.env`.

Install core dependencies:
- django
- djangorestframework
- psycopg
- pytest
- ldap3 (for AD integration)

Implement a minimal endpoint:

```
GET /api/health
```

The endpoint must:
- confirm API availability
- verify connection to the internal database
- return a request correlation identifier.

##### Authentication & Authorization (Core Middleware)

**Requirements:**
- Support both local development and enterprise authentication from the start.
- Use environment variable `AUTH_MODE` to switch between modes.

**Local Development:**
- When `AUTH_MODE=dev`, use `DevAuthMiddleware` to inject a mock user and role from environment variables (`DEV_USER_IDENTITY`, `DEV_USER_ROLE`).
- No external authentication or AD lookup is performed in dev mode.

**Enterprise (IIS/LDAP/AD):**
- When `AUTH_MODE` is unset or set to production, use `IISAuthMiddleware` to extract the user from `REMOTE_USER` and `LDAPAuthorizationMiddleware` to look up AD groups and assign roles.
- Configure LDAP/AD connection in `config/settings.py`.

**Example settings.py:**
```python
if os.environ.get("AUTH_MODE") == "dev":
  MIDDLEWARE.insert(0, "api.middleware.DevAuthMiddleware")
  DEV_USER_IDENTITY = os.environ.get("DEV_USER_IDENTITY", "dev_admin")
  DEV_USER_ROLE = os.environ.get("DEV_USER_ROLE", "admin")
else:
  MIDDLEWARE.insert(0, "api.middleware.IISAuthMiddleware")
  MIDDLEWARE.append("api.middleware.LDAPAuthorizationMiddleware")
```

**Example middleware.py:**
```python
class DevAuthMiddleware:
  # Sets request.user_identity and request.user_role for local dev

class IISAuthMiddleware:
  # Extracts user from REMOTE_USER

class LDAPAuthorizationMiddleware:
  # Looks up AD groups and attaches user_role
```


##### Client (React/Vite) & Frontend Authentication

Create a simple landing page.

Fetch `/api/health` and display the returned status.

**Implement robust, role-based authentication and authorization in the frontend:**

1. **Backend User Endpoint**
  - Implement `GET /api/user` endpoint in Django.
  - Returns the current user's identity and role (from middleware).
  - Returns 401/403 if not authenticated or not in an allowed group.
  - Fully covered by backend tests (pytest), type-checked (mypy), and linted (ruff).

2. **Frontend User Fetch**
  - On application load, fetch `/api/user` to get the current user's identity and role.
  - If unauthorized or network error, display an access denied message and hide all features.
  - Add integration tests (Vitest) to verify correct fetch and error handling.

3. **Role Context Provider**
  - Create a React context (e.g., `AuthProvider`) to store user identity and role.
  - Provide this context at the top level (in `App.tsx`).
  - Expose a hook (e.g., `useAuth()`) for components to access the current user's role and identity.
  - Add unit tests for the context/provider logic.

4. **Conditional UI Rendering**
  - Update navigation, routes, and UI components to check the user's role from context.
  - Only render admin-only features (e.g., admin upload, mapping workflow) if `user_role === "admin"`.
  - Hide or disable admin controls for viewers.
  - Redirect unauthorized users from admin routes to the main screen or show an error message.
  - Add tests to verify that admin features are not visible to viewers.

5. **Development Mode Support**
  - In local development mode (`AUTH_MODE=dev`), the backend injects a mock user identity and role.
  - The frontend consumes these values in the same way as in production.
  - Add tests to verify dev mode behavior.

##### Testing

Add a backend `pytest` verifying `/api/health`.


Add a frontend `vitest` verifying:
  - the health endpoint renders successfully
  - user role fetch and error handling
  - role context/provider logic
  - conditional UI rendering for admin/viewer
  - dev mode behavior


Add backend tests for authentication and authorization middleware:
  - Simulate users and groups using environment variables and patching in dev mode.
  - Patch AD group lookup and set `REMOTE_USER` in test client for enterprise mode.
  - Test `/api/user` endpoint for all role and error cases.

**Example test:**
```python
@pytest.mark.django_db
def test_admin_view_requires_admin_role():
  client = Client()
  environ = {"REMOTE_USER": "DOMAIN\\adminuser"}
  with patch("api.ad_utils.get_user_groups", return_value=["app_admin"]):
    response = client.get("/api/admin/some-protected-endpoint/", **{"wsgi.input": b"", **environ})
    assert response.status_code == 200
```

**Result:**  
A runnable application where the browser communicates with the API, the API successfully connects to the database, and authentication/authorization is in place for both local and enterprise environments.
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

Implement upload lifecycle endpoints (all must be protected by admin-only authorization):

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

Implement mapping endpoint (admin-only):
```
POST /api/admin/fitting-positions/bulk
```

**Authentication & Authorization:**
- All admin endpoints must require the user to be in the `app_admin` AD group (or have `user_role = 'admin'` in dev mode).
- Use middleware/decorators to enforce group-based access control.
- Return 403 Forbidden for unauthorized users.

**Example view protection:**
```python
from django.http import HttpResponseForbidden
def some_admin_view(request):
  if getattr(request, "user_role", None) != "admin":
    return HttpResponseForbidden("Admin access required.")
  # ...existing logic...
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
- mapping validation
- admin endpoint access control (test as admin, viewer, and unauthorized user)

**Example test:**
```python
@pytest.mark.django_db
def test_admin_upload_forbidden_for_viewer():
  client = Client()
  environ = {"REMOTE_USER": "DOMAIN\\vieweruser"}
  with patch("api.ad_utils.get_user_groups", return_value=["app_viewer"]):
    response = client.post("/api/admin/uploads", {...}, **{"wsgi.input": b"", **environ})
    assert response.status_code == 403
```

**Result:**  
Administrators can upload new diagrams and map fitting positions to coordinates, with access strictly limited to authorized users.

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
- source filtering
- search endpoint access control (test as admin, viewer, and unauthorized user)

**Result:**  
Users can search component information associated with the displayed diagram, with access limited to authorized users.

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
- performance with large diagrams
- UI elements for admin features are only visible to users with admin role

**Result:**  
The UI visually conforms to the design system, meets the required performance characteristics, and enforces role-based feature visibility.

---


### Phase 8: Operational Hardening

**Goal:** Implement operational behaviours required for a production-capable architecture.


#### Server

Add middleware for:
- request correlation IDs
- structured logging
- adapter timeout handling
- authentication and authorization (ensure all endpoints remain protected in all environments)

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
- partial API failures
- authentication/authorization failures (e.g., missing/invalid REMOTE_USER, user not in allowed groups)

**Result:**  
The system behaves predictably under degraded or partial failure conditions, including robust handling of authentication and authorization errors.

---


### Phase 9: Final Specification Conformance Verification

**Goal:** Validate that the implementation fully conforms to this specification.

npm run test

#### Tasks

Perform a structured audit against:
- requirements
- architecture
- database design
- API contracts
- UI system
- authentication & authorization (all endpoints and UI features enforce correct access control)
- testing strategy

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
The prototype implementation fully conforms to the specification, including robust authentication and authorization, without requiring additional remediation phases.