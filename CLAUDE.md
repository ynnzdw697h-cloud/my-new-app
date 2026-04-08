# Luxury Kitchen OS — Developer Guidelines

## Project Vision
We are building a premium **Luxury Kitchen OS** (B2B SaaS) for high-end hospitality, chef restaurants, and luxury villas. Client Zero: Villa Acadia.

This is NOT a basic recipe app. It is an ROI-driven, AI-first operational system designed to:
- Connect Back-of-House (BOH) with Front-of-House (FOH)
- Retain Intellectual Property (IP)
- Prevent food waste
- Enforce Michelin-level standards

---

## 1. Core Architecture Rules (STRICT)

- **Multi-Tenant:** Every core data entity (Users, Recipes, Inventory, Tasks, Invoices) must include a `tenant_id`. Build with SaaS scale in mind from day one.
- **Security:** Users must NEVER read/write data outside their assigned `tenant_id`. Enforce via RLS or middleware.
- **Roles:** Admin, Chef, Checker, FOH/Waiter, Bartender. UI and features adapt dynamically per role.

---

## 2. Design & UI/UX System

- **Theme:** Premium Dark Mode. Deep elegant darks with high-contrast glowing accents (neon blue, gold) for status signaling.
- **Ergonomics:** Built for kitchen environments — large touch targets, accessible for wet hands. No cluttered spreadsheets; use clean cards, floating elements, and traffic-light systems (Green/Yellow/Red).
- **Current stack:** React 19, Tailwind CSS, framer-motion, Firebase Firestore, Vercel. All UI is Hebrew (`dir="rtl"`).

---

## 3. AI & API Strategy (Cost Efficiency)

**Smart model routing — do not default to the most expensive model:**
- **Vision tasks** (OCR invoice scanning): use `claude-sonnet-4-6`
- **Text-only tasks** (FOH quizzes, 86 brief summaries): use `claude-haiku-4-5-20251001`

---

## 4. Current Development Status

- **LIVE:** PIN auth, session persistence, Dashboard with time-aware greeting, Prep Checklist, Recipes, Weekly Tasks, Shift Notes, Protein Count, Supplier Orders
- **IN PROGRESS:** Checker / Receiving Module (AI OCR for supplier invoices, RMA/return logic)
- **IMPORTANT:** Roadmap modules below are NOT YET IMPLEMENTED. Keep architecture flexible but do not build them until explicitly instructed.

---

## 5. Future Product Roadmap (inform DB schema & architecture decisions)

1. **Relational Recipes & Live Food Cost** — nested prep/sub-recipes linking to assembly dishes; real-time cost updates from OCR invoice data
2. **Prep, Expiry & Waste Tracker** — shelf-life timers, automated "Dry Kit" tasks 24h before expiry, frictionless waste logging
3. **MVP Traffic Light Inventory** — visual low-friction inventory with auto-deductions when dishes are served (Green/Yellow/Red)
4. **FOH Sync & Micro-Learning** — real-time '86' alerts to waiters, digital dish cards, AI-generated menu quizzes for staff onboarding
5. **Executive ROI Dashboard** — management widgets showing money saved (RMA vs. waste) and operational health scores

---

## 6. Tech Stack & Constraints

- React 19, Tailwind CSS, framer-motion
- Firebase Firestore (free plan — **NO Firebase Storage**; use Canvas API → base64 → Firestore for images)
- Vercel (static site + serverless functions in `api/`)
- `@anthropic-ai/sdk` for AI features
- Serverless functions in `api/` must use **CommonJS** (`require` / `module.exports`), not ESM

---

## 7. Developer Rules

- Always run `CI=true npm run build` before committing — Vercel treats ESLint warnings as errors
- Always `git add + commit + push` after every change
- All UI text is Hebrew, all layouts are `dir="rtl"`
- Do not add features beyond what is explicitly requested

---

## 8. Styling Tokens

- Background: `#121212`
- Cards: `rgba(255,255,255,0.04)` + `border: 1px solid rgba(255,255,255,0.08)`
- Border radius: `rounded-3xl` (cards), `rounded-2xl` (buttons/inputs)
- Fonts: Inter (Latin/numbers) + Heebo (Hebrew)
- Glow buttons: `.glow-btn` class with CSS vars `--gc`, `--gca`, `--gcb`
- Station color: `STATIONS[station].color` (hex)

---

## 9. Firestore Structure

All documents in `kitchen/` collection:
- `prep_tasks_{station}` — completed prep task IDs (Set)
- `weekly_{station}` — completed weekly task IDs (Set)
- `order_{supplierId}` — supplier order quantities
- `custom_items_{supplierId}` — permanent custom order items
- `protein_count` — fish/protein end-of-day counts
- `missing_items`, `shift_notes` — global shift notes
- `recipe_images` — map of recipeId → base64 image
- `chef_avatars` — map of chef displayName → `{ url, x, y }`
- `deliveries_index` — array of delivery summaries
- `delivery_{date}_{supplierId}_{timestamp}` — full delivery documents

---

## 10. Roles

- `chef` — Dashboard, Prep, Recipes, Weekly, Shift, Proteins, Supplier
- `checker` — CheckerHub, Supplier only; skips station selection on login

---

## 11. Key Files

- `src/data/chefs.js` — chef list with PINs and roles
- `src/data/stations.js` — station definitions (cold, hot, checker)
- `src/data/suppliers.js` — supplier list with whatsapp/email fields
- `src/data/recipes.js` — full recipe database
- `src/data/prepTasks.js` — daily prep tasks per station
- `src/data/weeklyTasks.js` — weekly tasks per station
- `src/hooks/useFirestoreSet.js` — syncs Set to Firestore + localStorage cache
- `src/hooks/useFirestoreArray.js` — syncs Array to Firestore + localStorage cache
- `src/hooks/useDeliveries.js` — wraps useFirestoreArray for deliveries_index
- `src/hooks/useDelivery.js` — onSnapshot for single delivery doc
- `api/ocr.js` — Vercel serverless function, Claude Vision OCR

---

## 12. Session

`localStorage` key `villa_akadia_session` stores `{ user, station, role }`.
