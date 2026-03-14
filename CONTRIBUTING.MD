# Contributing to Schematic Mapper

Welcome! This document provides guidelines for contributing to the Schematic Mapper project, including environment setup, project structure, coding standards, and agent execution rules.

---

## Project Structure

The repository is organized as a monorepo:

- `/backend`: Django REST API (Python)
- `/frontend`: React + Vite TypeScript UI
- `/docs`: Specification and design documentation

---

## Environment & Dependencies

### Backend (Python/Django)
- Use [uv](https://docs.astral.sh/uv/) for all backend environment and dependency management.
- Python 3.13 is pinned via `.python-version` (use [pyenv](https://github.com/pyenv/pyenv)).
- Install dependencies:
  - `uv sync` (after cloning)
  - Add packages: `uv add <package>`
  - Add dev packages: `uv add --dev <package>`
- Run commands using `uv run python manage.py ...`, `uv run pytest`, `uv run mypy .`, `uv run ruff check .`, `uv run ruff format .`
- Linting: `uv run ruff check --fix .` and formatting: `uv run ruff format .`
- Type checking: `uv run mypy .` (strict mode enforced)
- Testing: `uv run pytest` (unit and integration tests)

### Frontend (React/TypeScript)
- Use [npm](https://www.npmjs.com/) for all frontend package management.
- Initialize via `npm create vite@latest frontend -- --template react-ts` (if starting fresh).
- Install dependencies: `npm install`
- Add packages: `npm install <package>`
- Linting/formatting: `npm run lint` (Biome), `npm run format`
- Testing: `npm test` or `npm run test:watch` (Vitest)

### Database
- Use a local PostgreSQL instance (managed via pgAdmin4 or similar).
- Do not use Docker for the database; connect to the native OS instance.
- Create databases as needed (see README for SQL commands).
- Store credentials in `backend/.env` (see template in README).

---

## Setup Steps (Summary)

1. **Clone the repository**
2. **Backend:**
	- Ensure Python 3.13 is active (`pyenv local 3.13.x`)
	- `cd backend`
	- `uv sync`
	- Create databases in PostgreSQL (see README)
	- Copy `.env` template and fill in credentials
	- `uv run python manage.py migrate`
	- `uv run python manage.py seed_test_data`
	- `uv run python manage.py setup_mock_asset_db`
	- `uv run python manage.py runserver`
3. **Frontend:**
	- `cd frontend`
	- `npm install`
	- `npm run dev`

---

## Coding Standards & Practices

- **Backend:**
	- Use type annotations everywhere; `mypy` strict mode is enforced.
	- Lint and format code with Ruff before submitting changes.
	- Write and run tests for all new features and bugfixes.
- **Frontend:**
	- Use TypeScript for all code.
	- Lint and format code with Biome before submitting changes.
	- Write and run tests for all new features and bugfixes.

---

## AI Agent Execution Guidelines

These rules are for autonomous AI agents (or contributors using automation) to ensure high-quality, spec-conformant contributions:

- **Phase Confinement:**
	- Follow the implementation plan one phase at a time. Stop and request user review before starting the next phase.
- **Verification:**
	- Continuously run test, lint, and type-check commands to verify code before finalizing a phase.
- **Linting & Formatting:**
	- Always run `uv run ruff check --fix .` and `uv run ruff format .` for backend, and `npm run format` for frontend before submitting changes.
- **Type Checking:**
	- Always run `uv run mypy .` for backend; all source files must be annotated.
- **Incremental Tests:**
	- Write automated tests (`pytest` for Django, `vitest` for React) as part of each phase.
- **Spec Conformance Review:**
	- Before marking a phase complete, review all changes against the specification. Identify and resolve any gaps, or record them for the next phase.
- **Clean Communication:**
	- At the end of every phase, provide a concise summary of files created, packages installed, test commands run and passed, and any spec conformance gaps deferred.

---

## Additional Resources

- See `README.md` for full setup instructions and environment variable templates.
- See `docs/spec.md` for the full technical and functional specification.
