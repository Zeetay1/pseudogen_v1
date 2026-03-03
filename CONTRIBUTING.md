# Contributing to Pseudogen

Thanks for your interest in contributing.

## Development setup

1. **Backend** (Python 3.13)
   - `cd backend`
   - Create a virtualenv and activate it
   - Copy `.env.example` to `.env` and set your API keys
   - `pip install -r requirements.txt`
   - Run the API: `uvicorn app:app --reload`

2. **Frontend** (Node 20+)
   - `cd frontend`
   - `npm install`
   - `npm run dev`

See [how_to.md](how_to.md) and [README.md](README.md) for more detail.

## Running tests

- **Backend:** From `backend/`, run `pytest tests/ -v`. Use `SKIP_ENV_CHECK=1` if you don't have a real `.env`.
- **Frontend:** From `frontend/`, run `npm run test`.

## Code style

- Backend: follow existing style; consider running `ruff check` or `ruff format` if you add it.
- Frontend: run `npm run lint` (ESLint) before submitting.

## Pull requests

1. Open an issue or comment on an existing one if the change is non-trivial.
2. Branch from `main`, make focused commits.
3. Ensure CI passes (lint, tests, build).
4. Submit a PR with a clear description and reference any issue.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
