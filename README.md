# Schematic Mapper

Prototype application for mapping component information over mechanical drawings.

---

## Prerequisites

- [Python 3.13](https://www.python.org/) via [pyenv](https://github.com/pyenv/pyenv)
- [uv](https://docs.astral.sh/uv/) for backend dependency and environment management
- [Node.js](https://nodejs.org/) (LTS) and [npm](https://www.npmjs.com/) for frontend package management
- [PostgreSQL](https://www.postgresql.org/) running locally (managed via pgAdmin4 or similar)

---

## Project Structure

```
schematic_mapper/
├── backend/        # Django REST API
├── frontend/       # React + Vite TypeScript UI
└── docs/           # Specification and design documentation
```

---

## Backend Setup

### 1. Configure the Python version

The backend pins Python 3.13 via `.python-version`. If using pyenv it will be activated automatically when you `cd` into the `backend/` directory.

### 2. Create the databases

Create two PostgreSQL databases (run in pgAdmin4 or psql):

```sql
CREATE DATABASE schematic_internal_db;
CREATE DATABASE schematic_mock_asset_db;
```

### 3. Configure environment variables

Create `backend/.env` from the template below. This enables local development mode with mock authentication/authorization:

```env
# Enable development mode authentication (do not use in production)
AUTH_MODE=dev
DEV_USER_IDENTITY=dev_admin
DEV_USER_ROLE=admin

SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Internal application database
DB_INTERNAL_HOST=127.0.0.1
DB_INTERNAL_PORT=5432
DB_INTERNAL_NAME=schematic_internal_db
DB_INTERNAL_USER=your_db_user
DB_INTERNAL_PASSWORD=your_db_password

# Mock asset database
DB_ASSET_HOST=127.0.0.1
DB_ASSET_PORT=5432
DB_ASSET_NAME=schematic_mock_asset_db
DB_ASSET_USER=your_db_user
DB_ASSET_PASSWORD=your_db_password
```

> **Note:**
> - `AUTH_MODE=dev` enables local development mode, bypassing IIS/AD/LDAP authentication and authorization. The backend will inject a mock user identity and role from `DEV_USER_IDENTITY` and `DEV_USER_ROLE`.
> - Never enable development mode in production or on any externally accessible environment.

### 4. Install dependencies and apply migrations

```bash
cd backend
uv sync
uv run python manage.py migrate
```

### 5. Seed test data

Seed the internal database with a drawing type, a placeholder image, and a fitting position:

```bash
uv run python manage.py seed_test_data
```

Seed the mock asset database with the schema and demo asset records:

```bash
uv run python manage.py setup_mock_asset_db
```

### 6. Start the backend server

```bash
uv run python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000`.

### Backend commands

| Command | Description |
|---|---|
| `uv run python manage.py runserver` | Start the development server |
| `uv run python manage.py migrate` | Apply database migrations |
| `uv run python manage.py seed_test_data` | Seed a drawing type, image, and fitting position |
| `uv run python manage.py setup_mock_asset_db` | Seed the mock asset database |
| `uv run pytest` | Run tests |
| `uv run mypy .` | Type check |
| `uv run ruff check --fix .` | Lint and auto-fix |
| `uv run ruff format .` | Format code |

---

## Frontend Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Start the development server

```bash
npm run dev
```

The UI will be available at `http://localhost:5173`. API requests are proxied to `http://127.0.0.1:8000` automatically via the Vite dev server config.

### Frontend commands

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm test` | Run tests (single pass) |
| `npm run test:watch` | Run tests in watch mode |
| `npx @biomejs/biome check --write .` | Lint and format |

---

## Running the Full Application

Start both servers in separate terminals:

**Terminal 1 — Backend:**
```bash
cd backend
uv run python manage.py runserver
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in Microsoft Edge. The frontend proxies all `/api` requests to the Django backend on port 8000.

## UAT Notes

- Open the admin upload workflow from the `Open Admin Upload` button on the main image-selection screen, or visit `http://localhost:5173/admin` directly.
- A reusable SVG upload fixture for UAT is available at `docs/uat-assets/admin-upload-sample.svg`.
- The admin header back arrow returns to the main image-selection screen.
- Uploaded component names are unique across drawings, ignoring letter case and surrounding whitespace.
