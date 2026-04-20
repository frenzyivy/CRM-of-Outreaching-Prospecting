# Phase Completion Checklist

**Required before I declare any phase "complete" or move to the next phase.**

Encoded here so that future agents and future-me don't repeat the class of
bug caught during Phase 2 re-review — where static checks (`tsc --noEmit`,
`vite build`, route-count) all passed while the actual endpoints were
unreachable because we were running the wrong entrypoint.

---

## The gate (in order)

### 1. TypeScript strict build

```bash
cd frontend && npx tsc -p tsconfig.app.json --noEmit
```

**Zero errors required.** Paste `EXIT=0` into the phase-done report.

### 2. Production build

```bash
cd frontend && npm run build
```

**Must succeed.** Paste last 3 lines of output (bundle sizes + "built in Xs").

### 3. Backend smoke — does it import?

```bash
python -c "from backend.app import app; \
  api=[r for r in app.routes if getattr(r,'path','').startswith('/api/')]; \
  pairs=set((m,r.path) for r in api for m in (getattr(r,'methods',None) or ()) if m not in ('HEAD','OPTIONS')); \
  print(len(pairs))"
```

**Route count must match the expected delta for the phase.** Paste the number
+ what was expected into the phase-done report.

### 4. Endpoint smoke test — does every endpoint actually respond? **MANDATORY**

```bash
AUTH_TOKEN="eyJ..." ./scripts/smoke_test_endpoints.sh
```

Paste the **full output** of this script into the phase-done report. Exit
code must be 0.

Before declaring a phase complete you MUST:
- Add every new endpoint your phase introduced to `SMOKE_ENDPOINTS` in
  `scripts/smoke_test_endpoints.sh`.
- Run the script against a live dev backend (not TestClient — real uvicorn
  process on localhost).
- Confirm every line is green (expected status).

This catches:
- Routes registered in the wrong app (the exact bug Phase 1 + 2 had —
  routes lived in `backend.app` but `uvicorn server:app` was running)
- Routes registered with wrong path prefix
- Handlers that import a missing function (cold-path 500)
- Database views the endpoint depends on not existing (migration not run)
- Auth middleware rejecting the handler's request shape

Static checks prove code compiles. **Only curl proves code serves.**

### 5. UI smoke — does the new view render?

For any phase that ships frontend changes:
- Start `npm run dev` + `uvicorn backend.app:app --reload`.
- Visit the new/modified route in both dark and light themes.
- Resize through 1280 / 980 / 768 / 375 px breakpoints.
- Watch the browser console — zero 4xx/5xx on the network tab, zero errors
  in the console.
- Paste any errors / screenshots of issues into the phase-done report.

### 6. Regression check — do old routes still work?

- Visit at least 3 pre-existing routes that the phase did NOT touch.
- Confirm they still load and function normally.
- If any regress, the phase is NOT complete until they're restored.

---

## Phase-done report template

Copy this into the user-facing report at the end of each phase:

```markdown
## Phase N complete — verification

### Static checks
- tsc --noEmit: `EXIT=0` (0 errors)
- npm run build: `✓ built in X.XXs` (clean)
- Backend route count: NN (expected delta: +M since phase N-1)

### Endpoint smoke test
<paste full output of scripts/smoke_test_endpoints.sh>

### UI check
- `/new-route` renders in dark + light at 1280/980/768/375 ✓
- Console: no errors, no failed network requests ✓
- Regression routes: /pipeline, /today, /leads all still load ✓

### Known limitations / empty states
- <anything the phase intentionally left in an empty state>
```

---

## Anti-patterns to avoid

- **"97 routes, boots clean"** as proof of working endpoints. A route being
  registered in `app.routes` means the Python module loaded. It does NOT
  mean the endpoint responds, nor that the UI is calling the right URL, nor
  that the running dev server is the same one you modified. Use curl.

- **Running `tsc --noEmit` and calling it "tested"**. That's a compile
  check. Catches type errors. Does nothing for runtime, routing, auth, or
  data-flow bugs.

- **Assuming there's one entrypoint**. `server.py` and `backend/app.py`
  co-existed for months before consolidation. Before Phase 3+, verify
  there's still only one FastAPI entry point and your edits landed there.
  If you ever see two `app = FastAPI(...)` declarations in the tree, stop
  and flag.

- **Relying on "empty state looks intentional"**. If a new component on a
  new page shows an empty state, verify the underlying endpoint actually
  responded with empty data — not 404'd. Empty states and 404s look
  identical in the UI.

---

## When a phase fails the gate

- Do NOT commit. Do NOT declare complete.
- Flag the failure in the phase-done report.
- If it's a real bug, diagnose with actual error output (curl response body,
  uvicorn traceback), not hypothesis.
- If it's a process gap (like phase 1+2 entrypoint mismatch), document it
  here so we don't repeat it.

---

**Effective from Phase 3 onward.** Phases 1+2 are grandfathered — but both
phases needed post-audit commits (the Phase 2 re-review discovery is how
this checklist exists). Don't let the next one.
