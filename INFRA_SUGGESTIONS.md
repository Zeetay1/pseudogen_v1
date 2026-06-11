# Infrastructure & Architecture Suggestions

These are the changes I'd make before treating this as production-grade. Prioritised: highest leverage first.

---

## 1. Auth: tokens in HttpOnly cookies, not localStorage

**Current:** 7-day JWT stored in `localStorage`.
**Problem:** Any XSS on the page can exfiltrate the token and impersonate the user indefinitely.
**Fix:**
- Issue a short-lived access token (15 min) and a long-lived refresh token (7 days).
- Store both as `HttpOnly; Secure; SameSite=Strict` cookies. The browser never exposes them to JS.
- Add a `POST /auth/refresh` endpoint that validates the refresh token and issues a new access token.
- On the backend, add a `refresh_tokens` table (token hash, user_id, expires_at) so refresh tokens can be revoked.

This is the single highest-impact security change.

---

## 2. Rate limiting: Redis-backed, not in-process

**Current:** `slowapi` stores counters in-process memory. Also, the daily usage table is SQLite.
**Problems:**
- In-process state is lost on restart and doesn't work across multiple instances.
- IP-based rate limits are trivially bypassed with a VPN.

**Fix:**
- Use Redis for rate limit counters (e.g., `upstash/redis` — has a generous free tier, runs serverlessly).
- The existing `daily_usage` SQLite table is actually fine as a secondary check (it's keyed by session/user, not IP). But move it to Postgres (see below) if you ever want horizontal scaling.
- For anonymous abuse, combine session ID with a lightweight fingerprint (user-agent hash + IP) to raise the bar.

---

## 3. Database: PostgreSQL instead of SQLite

**Current:** SQLite file on the same Fly.io machine as the app.
**Problems:**
- Fly.io volumes can be lost on machine replacement.
- SQLite can't handle concurrent writes well.
- No backups unless you script them.

**Fix:**
- Use [Neon](https://neon.tech) (serverless Postgres, generous free tier) or Supabase.
- Add [Alembic](https://alembic.sqlalchemy.org/) for schema migrations instead of raw `CREATE TABLE IF NOT EXISTS`.
- Keep SQLAlchemy or use raw asyncpg for the queries.

Even for a demo/portfolio, this swap takes ~2 hours and removes the "single point of data loss" risk.

---

## 4. LLM response streaming

**Current:** The backend waits for the full LLM response before sending anything to the browser. If Groq takes 5 seconds, the user sees a spinner for 5 seconds.
**Fix:**
- Use FastAPI's `StreamingResponse` with `async for chunk in groq_stream():`.
- On the frontend, use `fetch` with `response.body.getReader()` to display tokens as they arrive.
- This makes the app feel dramatically faster without changing the actual latency.

---

## 5. LLM request deduplication / caching

**Current:** Identical requests hit the LLM API every time.
**Fix:**
- Hash `(problem_description, style, detail)` → check Redis for a cached response (TTL: 1 hour).
- Cache hit means ~0ms latency and zero API cost.
- For a demo app generating pseudocode, cache hit rates will be surprisingly high (common problems like "sort an array" get asked repeatedly).

---

## 6. Structured logging + error tracking

**Current:** `print`-style logging to stdout.
**Fix:**
- Replace `logging.basicConfig` with `structlog` for JSON-structured logs that work with Fly.io's log shipping.
- Add [Sentry](https://sentry.io) (free tier) for exception tracking. One line: `sentry_sdk.init(dsn=...)` in `app.py`.
- Add a correlation ID (`X-Request-ID`) to every request so you can trace a single user interaction across log lines.

---

## 7. Frontend: lazy loading

**Current:** 343 KB JS bundle served on every visit.
**Fix:**
- The auth modal (LoginPage, RegisterPage) is only shown on demand. Lazy-load them:
  ```js
  const LoginPage = React.lazy(() => import("./components/LoginPage"));
  ```
- Wrap with `<Suspense fallback={null}>` in the modal render path.
- This shaves ~15-20 KB from the initial load path.

---

## 8. CORS: restrict origins in production

**Current:** `CORS_ORIGINS=*` (allows any domain to call your API).
**Fix:**
```
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```
In local dev, keep `*` via `.env`. In Fly.io secrets, set the specific domain.

---

## 9. Secrets: use Fly.io secrets, not .env files

**Current:** `.env` is in `.gitignore` but the file exists on disk inside the container (it's `COPY`'d or created in the volume).
**Fix:**
- Use `fly secrets set GROQ_API_KEY=... SECRET_KEY=...` and remove `.env` from the container entirely.
- `python-dotenv` still works — it just finds nothing, and the env vars come from the process environment.
- This means secrets are never in the filesystem, never in git history, and are managed in Fly.io's secrets store.

---

## 10. Health check endpoint + Fly.io auto-restart

**Current:** No health check endpoint.
**Fix:**
```python
@app.get("/health")
async def health():
    return {"status": "ok"}
```
In `fly.toml`:
```toml
[checks]
  [checks.alive]
    grace_period = "5s"
    interval = "10s"
    method = "get"
    path = "/health"
    timeout = "2s"
```
Fly.io will restart the machine if this check fails, giving you free self-healing.

---

## Priority order for a solo developer

| Priority | Change | Effort | Impact |
|---|---|---|---|
| 1 | HttpOnly cookies for auth | 3h | High (security) |
| 2 | Sentry error tracking | 30min | High (observability) |
| 3 | Health check endpoint | 10min | Medium (reliability) |
| 4 | Fly.io secrets instead of .env | 30min | Medium (security) |
| 5 | Postgres (Neon) instead of SQLite | 2h | Medium (durability) |
| 6 | LLM streaming responses | 2h | High (UX) |
| 7 | Redis rate limiting | 2h | Medium (scalability) |
| 8 | CORS restriction | 5min | Low-Medium (security) |
| 9 | Response caching | 2h | Medium (cost) |
| 10 | Lazy loading | 30min | Low (perf) |
