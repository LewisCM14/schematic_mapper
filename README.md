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

Create `backend/.env` from the template below:

```env
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

### 4. Install dependencies and run

```bash
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000`.

### Backend commands

| Command | Description |
|---|---|
| `uv run python manage.py runserver` | Start the development server |
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
