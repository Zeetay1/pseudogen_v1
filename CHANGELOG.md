# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- **Premium plan:** Free vs Premium tiers. Free: 4,000 chars, 30/min; Premium (header `X-Plan: premium`): 12,000 chars. Pricing page with Upgrade CTA; PDF export for Premium (print dialog). Plan stored in localStorage for demo; ready for auth later.
- **API versioning:** Versioned endpoint `POST /v1/generate-pseudocode` (same behavior as `POST /generate-pseudocode`). Root response includes `v1` link.
- **CONTRIBUTING.md:** Development setup, tests, code style, and PR guidelines.

- Backend unit tests (pytest) for API validation and generate endpoint with mocked LLM.
- Frontend unit tests (Vitest + React Testing Library) for InputForm and App.
- CI workflow (GitHub Actions): backend tests, frontend lint, test, and build.
- CORS configurable via `CORS_ORIGINS` env (comma-separated); defaults to `*` for development.
- Startup env validation: backend fails fast if required env vars (PROVIDER and provider API key) are missing; `SKIP_ENV_CHECK` skips this in tests.
- Rate limiting on `POST /generate-pseudocode` (30/minute per IP) via SlowAPI.
- `.env.example` in backend listing required and optional env vars.
- Logging configuration: level via `LOG_LEVEL`, formatted messages with timestamp.
- In-UI error display in InputForm (replaces `alert()`).
- React Error Boundary so component crashes show a fallback UI and reload option.
- Export generated pseudocode as `.txt` or `.md` from OutputPanel.
- MIT License (LICENSE) and README link to it.
- README API reference updated to `POST /generate-pseudocode` and `problem_description` request field.

### Changed

- README API section: route and request body aligned with backend.
- `.gitignore`: removed `.env.example` so the template can be committed.

## [1.0.0] - Initial release

- FastAPI backend with OpenAI, Claude, Groq support.
- React + Vite frontend with history (localStorage), dark mode, pseudocode styles and detail levels.
