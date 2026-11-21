# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working with the product owner

The user (Yam) owns the product and knows the kitchen deeply, but is not a programmer.

1. Explain in short, simple Hebrew. No jargon.
2. Long plans and findings go on a Hebrew RTL HTML page (the terminal reverses Hebrew), not in terminal text.
3. Workflow: plan, user approves, build one screen, check it in the browser at phone width (390px), user tests, user says "מאשר", then commit.
4. Commit only after "מאשר". Ask before any push or deploy.
5. Do not add features beyond what was requested.
6. Investigate the codebase yourself; do not ask the user to paste code.

---

# Villa Akadia Kitchen App — Developer Guidelines

## Commands

```bash
npm start               # local dev server (port 3000)
vercel dev              # React + serverless functions (api/) together
CI=true npm run build   # production build (only when explicitly asked, or when a task says so)
npm test                # Jest
```

Local env: `.env.local` holds secrets (`ANTHROPIC_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `CHEF_PINS`). Never print or copy its contents.

## Source of truth and deploy

- `origin/main` on GitHub is the truth. Always `git fetch` and work from it. Other local copies (`~/my-new-app`) drift; do not touch them.
- Vercel is NOT connected to GitHub. After merging to main, publish from an up-to-date local main with `npx vercel --prod --yes`, only after the user approves, then check the live site.
- The local app reads and writes the REAL Firestore. Do not press buttons that save, delete or send while testing unless the user asks.

## 1. Architecture rules

- Single tenant today (Villa Akadia). Data lives under `tenants/{tenantId}/...`; keep the `tenantId` path so more kitchens are possible later, but do not build multi-tenant features yet.
- Security: users must never read or write outside their tenant. Roles and allowed stations must come from the server-issued token, not from localStorage.
- Roles: admin, chef, checker (receiving). UI adapts to role.
- Instructions vs knowledge: code is logic; recipes, suppliers and lists belong in Firestore.

## 2. Design rules (agreed with the product owner)

Built for cooks with wet hands, on phones. Calm, factual, dark (`#121212` base). Not an office app.

- Color only for status and station: cold `#3B82F6`, hot `#EF4444`, checker `#10B981`. **No glows, gradients, emoji, confetti or cheering text.** Messages state facts ("נשארו 5 בפס").
- Size minimums: rows 64px+, text 18px (`text-lg`), status circle 30px, buttons 48px+, inputs 16px+ (avoids iOS zoom), transitions 150-250ms, no `active:scale`.
- Status = shape + color via `StatusMark`: empty = not started, half amber = in progress, dashed red = stuck/missing, filled with check = done.
- No confirm dialogs for reversible actions: act immediately and show `UndoToast` with "ביטול" for 5s.
- Finished items fold under "הושלמו (N)".
- Quantity fields must allow typing (`inputMode`); +/- buttons are a complement.
- Do not add next/previous browsing between recipes (rejected by the owner): cooks open a recipe to find one specific thing.
- All text is Hebrew, layouts are `dir="rtl"`. Fonts: Heebo (Hebrew) + Inter (Latin/numbers).
- Respect `prefers-reduced-motion`.
- Shared pieces: `src/components/PrepCelebrations.jsx` (`StatusMark`, `UndoToast`, `SegmentedBar`, `StickyProgress`), `src/hooks/useFocusFlash.js`, `src/components/GlobalSearch.jsx` (`rememberRecent`), `src/components/ui/*`.
- Do not change things that work just because another way looks nicer.

## 3. AI and API

- Vision (invoice OCR in `api/ocr.js`): use a current Claude Sonnet model. Check the current model ID in the Claude API docs before changing it; the ID currently in code may be outdated.
- Text-only tasks: a current Haiku model.

## 4. Current status

- LIVE: PIN-only login (code identifies the cook, then station choice), Dashboard, Prep Checklist (incl. temperature tasks and due times), Recipes, Weekly Tasks, Shift Notes and Shift Log, Handover card, Announcements, Protein Count, Supplier Orders (עלה עלה catalog), Global Search, Checker/Receiving module (AI OCR), cooks' guide at `/guide.html`.
- Known review with prioritized fixes: `~/Documents/kitchen app/docs/fable-review-2026-11-16.md`.
- Future ideas (do not build unasked): offline service worker, push notifications, recipes/prep lists moved to Firestore with an admin screen, staff admin screen, analytics for managers.

## 5. Tech constraints

- Firebase Firestore on the free plan: NO Firebase Storage. Images are Canvas to base64 to Firestore.
- Serverless functions in `api/` use CommonJS (`require` / `module.exports`), not ESM.
- Keep Firestore documents small (1MB limit); avoid ever-growing arrays in one document.

## 6. Key files

- `src/App.js` (shell, session, navigation)
- `src/data/` chefs.js, stations.js, suppliers.js, supplierCatalog.js, recipes.js, mainDishes.js, prepTasks.js, weeklyTasks.js, shifts.js, shelfLife.js, tenants.js
- `src/hooks/` useFirestoreSet.js, useFirestoreArray.js, usePrepState.js, useSupplierCatalog.js, useDeliveries.js, useDelivery.js, useFocusFlash.js
- `src/components/` Dashboard, PrepChecklist, RecipeDatabase, WeeklyTasks, ShiftNotes, ShiftLog, HandoverCard, Announcements, ProteinCount, SupplierOrder, `supplier/*`, `checker/*`, `ui/*`
- `api/` auth.js (PIN to Firebase custom token), ocr.js

## 7. Session

`localStorage` key `villa_akadia_session` stores `{ user, station, role, tenantId }`. Treat it as a convenience only; real identity is the Firebase user and its token claims.
