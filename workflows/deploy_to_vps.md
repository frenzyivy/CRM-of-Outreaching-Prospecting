# Deploy CRM to VPS

## Objective
Push latest code to GitHub and deploy to the CloudPanel VPS so the live site reflects current changes.

## Pre-push Checklist (MANDATORY)

Before committing any frontend changes, run:

```bash
cd frontend && npx tsc --noEmit
```

**Zero errors required.** The VPS build uses `tsc -b && vite build` with strict TypeScript settings. Any error blocks deployment.

### Common TS errors and fixes

| Error | Fix |
|-------|-----|
| `'X' is declared but its value is never read` (TS6133) | Remove the unused import/variable/function |
| `Type 'string \| undefined' is not assignable to type 'string'` (TS2322) | Make the prop optional (`value?: string`) or provide a default |
| `Type 'unknown' is not assignable to type 'X'` (TS2322) | Declare the field explicitly on the interface instead of relying on index signature |
| `Module has no exported member 'X'` (TS2305) | Add the export to the source module (e.g., `types/index.ts`) |
| `Parameter 'x' implicitly has an 'any' type` (TS7006) | Add an explicit type annotation |

## Deployment Steps

### 1. Local — Commit and Push
```bash
# Verify TypeScript
cd frontend && npx tsc --noEmit && cd ..

# Stage, commit, push
git add <files>
git commit -m "description"
git push origin main
```

### 2. VPS — Pull and Build
SSH into the VPS:
```bash
ssh root@194.164.151.189
```

Then run:
```bash
cd /home/CRM-of-Outreaching-Prospecting
source venv/bin/activate
git pull origin main
cd frontend && npm install && npm run build && cd ..
```

### 3. VPS — Start/Restart Backend
```bash
# Start the backend (port 8001)
cd /home/CRM-of-Outreaching-Prospecting
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 &
```

### 4. VPS — Nginx serves frontend
CloudPanel/Nginx should be configured to:
- Serve `/home/CRM-of-Outreaching-Prospecting/frontend/dist/` as the static root
- Proxy `/api/*` requests to `http://localhost:8001`

## VPS Details
- **IP:** 194.164.151.189
- **Panel:** CloudPanel (https://194.164.151.189:8443)
- **Project path:** `/home/CRM-of-Outreaching-Prospecting`
- **Python venv:** `/home/CRM-of-Outreaching-Prospecting/venv`
- **Backend port:** 8001
- **Frontend build output:** `frontend/dist/`

## Edge Cases
- If `npm install` fails on VPS, check Node.js version (`node -v`) — project uses modern ESM features
- If `pip install` fails, make sure venv is activated (`source venv/bin/activate`)
- If git pull has conflicts, resolve locally, push clean, then pull on VPS
