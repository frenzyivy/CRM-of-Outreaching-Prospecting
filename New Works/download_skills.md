# CLAUDE.md — AI-Medical Project

## Identity & Scope

- **Project:** AI-Medical (Medical CRM + B2B Outreach for Healthcare)
- **Root:** `C:\Users\Komal\Documents\AI-Saas\AI-Medical`
- **Rule:** NEVER read, write, or reference files outside this folder.

---

## WAT Framework (Workflows → Agent → Tools)

Probabilistic AI (you) handles reasoning. Deterministic code handles execution. Never do both.

| Layer | What | Where |
|-------|-------|-------|
| Workflows | Markdown SOPs — objective, inputs, tools, outputs, edge cases | `workflows/` |
| Agent | You — read workflow, pick tools, sequence calls, handle errors | — |
| Tools | Python scripts — API calls, transforms, file ops, DB queries | `tools/` |

**Operating rules:**
1. Check `tools/` first before building anything new
2. On failure: read full error → fix script → retest → update workflow
3. If a tool uses paid API calls/credits, ask before re-running
4. Keep workflows current — update with learnings, don't delete
5. Never create or overwrite workflows without asking unless explicitly told to

**File structure:**
```
.tmp/           # Disposable intermediates (scraped data, temp exports)
tools/          # Deterministic Python scripts
workflows/      # Markdown SOPs
.env            # API keys ONLY here — never store secrets elsewhere
credentials.json, token.json  # Google OAuth (gitignored)
```

**Deliverables** → cloud services (Sheets, Slides, etc.). Local files are just for processing.

---

## Skill Router

**Before starting ANY task, match it to the right skill(s) below and invoke them.**

### UI/UX Design
| Trigger | Skill | What it does |
|---------|-------|-------------|
| Design tokens, component docs, dev handoff | `/ui-design-system` | Design system architecture |
| Personas, journey maps, usability testing | `/ux-researcher-designer` | UX research & testing |
| Brand identity, logos, banners, creatives | `/ui-ux-pro-max-design` | Visual brand design |
| Token architecture, component specs | `/ui-ux-pro-max-design-system` | Advanced design systems |

### Fullstack / CRM Coding
| Trigger | Skill | What it does |
|---------|-------|-------------|
| Next.js, FastAPI, MERN, Django scaffolding | `/fullstack-engineer` | Full-stack app builds |
| React, TypeScript, Tailwind components | `/frontend-engineer` | Frontend development |
| REST APIs, auth, database architecture | `/backend-engineer` | Backend & API work |
| SaaS boilerplate, auth + billing setup | `/saas-scaffolder` | Production SaaS scaffolding |
| PR review, SOLID violations, security | `/code-reviewer` | Code quality checks |

### Debugging
| Trigger | Skill | What it does |
|---------|-------|-------------|
| Any bug, error, crash, unexpected behavior | `/systematic-debugging` | 4-phase structured debugging |
| Hypothesis-driven debugging, reproduction | `/debug-mode` | Auto-reproduction workflow |
| Breakpoints, step-through, runtime issues | `/debugging-code` | Real breakpoint debugging |
| Writing tests, TDD, test-first development | `/test-driven-development` | TDD workflow |

**Routing logic:**
- Bug/error/crash → Start with `/systematic-debugging`. Escalate to `/debug-mode` or `/debugging-code` if needed.
- New feature → Match to Fullstack/UI skill. Run `/code-reviewer` after completion.
- UI/design task → Match to the most specific UI skill above.
- Refactor or cleanup → `/code-reviewer` first, then relevant coding skill.
- If multiple skills apply, invoke them in sequence. State which skill you're using.

---

## Auto-Behaviors

### On Every Task
1. **Route first** — Match task to skill(s) from the router above before writing any code
2. **State the skill** — Say which skill you're invoking so I can track context
3. **Check tools/** — Look for existing scripts before creating new ones
4. **Self-improve** — After fixing any issue, update the relevant workflow

### On Debugging Tasks
1. Always start with `/systematic-debugging` (4-phase: Reproduce → Isolate → Fix → Verify)
2. Read the full error trace — don't guess
3. If reproduction is unclear, escalate to `/debug-mode`
4. If runtime/breakpoint inspection is needed, use `/debugging-code`
5. After fix is verified, update the workflow with what you learned

### On Build Tasks
1. Match to the right Fullstack/UI skill
2. Follow the skill's scaffolding conventions
3. Run `/code-reviewer` on completed code before delivering
4. Use `/test-driven-development` for any logic-heavy modules

### On Design Tasks
1. Match to the most specific UI/UX skill
2. Follow the skill's token/component architecture
3. Ensure designs align with the Medical CRM's dark navy/charcoal theme

---

## Project-Specific Context

- **Stack:** Medical CRM with dark navy/charcoal dashboard
- **Target users:** Dentists, dermatologists (Poland, Spain, Germany)
- **Core features:** AI agent automation (email outreach, calls, meeting scheduling), lead management, multi-ESP email routing
- **Data layer:** Supabase-backed lead database
- **Outreach:** B2B cold email via Instantly.ai / Brevo, email warm-up via Lemwarm
- **Design language:** Dark theme, professional medical aesthetic

---

## Self-Improvement Loop

Every failure makes the system stronger:

1. Identify what broke
2. Fix the tool
3. Verify the fix
4. Update the workflow
5. Move on — system is now more robust

---

## Quick Reference

```
Need to debug?      → /systematic-debugging
Need to build?      → /fullstack-engineer or /frontend-engineer
Need an API?        → /backend-engineer
Need SaaS scaffold? → /saas-scaffolder
Need code review?   → /code-reviewer
Need UI/branding?   → /ui-ux-pro-max-design
Need tests?         → /test-driven-development
```
