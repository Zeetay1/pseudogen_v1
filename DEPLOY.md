# Deploy Pseudogen to Fly.io

## Prerequisites

1. Install Fly.io CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Login to Fly.io:
   ```bash
   fly auth login
   ```

## Deployment Steps

### 1. Deploy Backend

```bash
cd backend
fly launch --no-deploy
```

When prompted:
- **App name**: `pseudogen-backend` (or choose your own)
- **Region**: Choose closest to you (e.g., `iad` for US East)
- **Postgres/Redis**: No (we don't need databases for v1)

Set environment variables:
```bash
fly secrets set PROVIDER=groq
fly secrets set OPENAI_API_KEY=your_openai_key
fly secrets set ANTHROPIC_API_KEY=your_anthropic_key
fly secrets set GROQ_API_KEY=your_groq_key
fly secrets set OPENAI_MODEL=gpt-4o-mini
fly secrets set CLAUDE_MODEL=claude-3-5-haiku-20241022
fly secrets set GROQ_MODEL=llama-3.3-70b-versatile
```

Deploy backend:
```bash
fly deploy
```

Ensure backend is running (one machine always on):
```bash
fly status -a pseudogen-backend
# Backend should show at least one machine "started". Public URL: https://pseudogen-backend.fly.dev
```

### 2. Deploy Frontend

```bash
cd ../frontend
fly launch --no-deploy
```

When prompted:
- **App name**: `pseudogen-frontend` (or choose your own)
- **Region**: Same as backend (e.g. `iad`)
- **Postgres/Redis**: No

The frontend uses the backend's **public URL** by default (`https://pseudogen-backend.fly.dev`) so Fly's proxy always routes to a running machine. If your backend app name is different, set:
```bash
fly secrets set BACKEND_URL=https://YOUR-BACKEND-APP-NAME.fly.dev
```
Or set `BACKEND_URL` in `frontend/fly.toml` under `[env]`.

Deploy frontend:
```bash
fly deploy
```

### 3. Get Your Public URL

```bash
fly status
# Your app will be available at: https://pseudogen-frontend.fly.dev
```

## Updating Environment Variables

To update secrets:
```bash
fly secrets set KEY=value
```

To list secrets:
```bash
fly secrets list
```

## Viewing Logs

Backend logs:
```bash
cd backend
fly logs
```

Frontend logs:
```bash
cd frontend
fly logs
```

## Scaling

Scale backend:
```bash
cd backend
fly scale count 1
```

Scale frontend:
```bash
cd frontend
fly scale count 1
```

## Troubleshooting

- **"Unexpected token '<' … is not valid JSON"**: The frontend got HTML (e.g. nginx 502) instead of JSON. Usually the backend is down or unreachable. Check: (1) Backend is running: `fly status -a pseudogen-backend` and `fly logs -a pseudogen-backend`; (2) Backend app name in frontend matches: `BACKEND_URL=http://<backend-app-name>.internal:8000` in frontend `fly.toml` or secrets; (3) Both apps are in the same Fly org and region so private networking works.
- **Backend not reachable**: Check that backend is deployed and running with `fly status` in backend directory
- **502 / Connection refused** (upstream `http://[fdaa:...]:8000` in frontend logs): Frontend is still using the **.internal** URL. (1) Remove any old secret: `fly secrets unset BACKEND_URL -a pseudogen-frontend`. (2) Redeploy frontend so the new image (which forces the public URL) is used: `cd frontend && fly deploy`. The entrypoint now overrides `.internal` to the public URL. (3) Backend must stay up: `fly scale count 1 -a pseudogen-backend` and ensure `min_machines_running = 1` in `backend/fly.toml`.
- **CORS errors**: Backend CORS is set to allow all origins, should work fine
- **Check logs**: Use `fly logs` (and `fly logs -a pseudogen-backend` / `-a pseudogen-frontend`) to see what's happening

## Notes

- Fly.io provides free tier with 3 shared-cpu VMs
- Apps can communicate via private networking using `.internal` hostnames
- Environment variables are set as secrets for security
- Backend uses `min_machines_running = 1` and a health check on `GET /` so one machine is always up. Frontend proxies to the backend's **public** URL (`https://pseudogen-backend.fly.dev`) so Fly's proxy routes to a healthy machine; frontend can use `min_machines_running = 0` and auto-start on traffic.
