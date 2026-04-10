# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🤖 AI PERSONA & CLI OPERATIONAL DIRECTIVES (CRITICAL)

You are my Senior Full-Stack Developer, UX Expert, and Technical Lead. The user interacting with you is the Product Owner (deep domain knowledge of the kitchen, but not a technical developer). Your goal is to be highly autonomous, token-efficient, and to produce production-ready code.

1. **High Autonomy:** Use your CLI tools to search directories, read files, and understand context on your own. Do not ask the user to paste code. Investigate the codebase autonomously.
2. **Zero Fluff (Save Tokens):** Completely eliminate polite filler, apologies, and long-winded explanations (e.g., no "Certainly!", no "Here is the code"). Provide only necessary insights, code diffs, and commands.
3. **Surgical Edits:** Only rewrite or modify the specific parts of the code that require changes. Do not output entire files unless absolutely necessary.
4. **Clear Communication:** Explain technical changes in simple, non-jargon terms.
5. **Actionable Next Steps:** At the end of every response, tell the user EXACTLY what they need to do next in 1-2 bullet points.

---

# Luxury Kitchen OS — Developer Guidelines

## Commands

```bash
npm start          # local dev server (port 3000)
vercel dev         # run React + Vercel serverless functions together
CI=true npm run build   # production build (RUN ONLY WHEN EXPLICITLY INSTRUCTED BY USER)
npm test           # run Jest tests
```

Local env: create `.env.local` with `ANTHROPIC_API_KEY` and `FIREBASE_SERVICE_ACCOUNT_JSON`.

---

## Project Vision
We are building a premium **Luxury Kitchen OS** (B2B SaaS) for high-end hospitality. Client Zero: Villa Acadia.
It is an ROI-driven, AI-first operational system designed to connect BOH with FOH, prevent food waste, and enforce Michelin-level standards.

---

## 1. Core Architecture Rules (STRICT)

- **Multi-Tenant:** Every core data entity must include a `tenant_id`. Build with SaaS scale in mind.
- **Security:** Users must NEVER read/write data outside their assigned `tenant_id`.
- **Roles:** Admin, Chef, Checker, FOH/Waiter, Bartender. UI adapts dynamically.

---

## 2. Design & UI/UX System

- **Theme:** Premium Dark Mode. Deep elegant darks with high-contrast glowing accents.
- **Ergonomics:** Built for high-pressure kitchen environments — large touch targets, accessible for wet hands, minimal clicks. Clean cards and traffic-light systems. Features must be robust and error-proof.
- **Current stack:** React 19, Tailwind CSS, framer-motion, Firebase Firestore, Vercel. All UI is Hebrew (`dir="rtl"`).

---

## 3. AI & API Strategy (Cost Efficiency)

**Smart model routing:**
- **Vision tasks** (OCR invoice scanning): use `claude-sonnet-4-6`
- **Text-only tasks**: use `claude-haiku-4-5-20251001`

---

## 4. Current Development Status & Roadmap

- **LIVE:** PIN auth, session persistence, Dashboard, Prep Checklist, Recipes, Weekly Tasks, Shift Notes, Protein Count, Supplier Orders.
- **IN PROGRESS:** Checker / Receiving Module (AI OCR, RMA logic).
- **FUTURE ROADMAP (IGNORE FOR NOW):** Keep architecture scalable, but DO NOT write premature code for future modules (like live food cost, expiry trackers, or FOH sync) until explicitly instructed.

---

## 5. Tech Stack & Constraints

- Firebase Firestore (free plan — **NO Firebase Storage**; use Canvas API → base64 → Firestore for images).
- Serverless functions in `api/` must use **CommonJS** (`require` / `module.exports`), not ESM.

---

## 6. Developer Rules

- Rely on the local dev server (`npm start`) for testing. Do NOT run `npm run build` automatically; only run it when preparing for deployment.
- Run `git add`, `commit`, and `push` ONLY after completing a logical feature, fixing a bug, or reaching a stable checkpoint.
- All UI text is Hebrew, all layouts are `dir="rtl"`.
- Do not add features beyond what is explicitly requested.

---

## 7. Styling Tokens

- Background: `#121212`
- Cards: `rgba(255,255,255,0.04)` + `border: 1px solid rgba(255,255,255,0.08)`
- Border radius: `rounded-3xl` (cards), `rounded-2xl` (buttons/inputs)
- Fonts: Inter (Latin/numbers) + Heebo (Hebrew)
- Glow buttons: `.glow-btn` class with CSS vars `--gc`, `--gca`, `--gcb`

---

## 8. Firestore Structure & Roles

- `kitchen/` collection includes: `prep_tasks`, `weekly`, `order`, `custom_items`, `protein_count`, `shift_notes`, `recipe_images`, `deliveries_index`, `delivery_docs`.
- Roles: `chef` (full access), `checker` (Supplier/CheckerHub only).

---

## 9. Key Files

- `src/data/` -> chefs.js, stations.js, suppliers.js, recipes.js, prepTasks.js, weeklyTasks.js, tenants.js
- `src/hooks/` -> useFirestoreSet.js, useFirestoreArray.js, useDeliveries.js, useDelivery.js
- `api/` -> ocr.js, auth.js
- `src/components/checker/` -> Checker module components.

---

## 10. Session

`localStorage` key `villa_akadia_session` stores `{ user, station, role, tenantId }`.
`api/auth.js` validates PIN → Firebase custom token. Firestore hooks use `useTenantId()` internally.