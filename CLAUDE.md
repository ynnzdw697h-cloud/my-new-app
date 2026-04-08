# Villa Akadia Kitchen OS — Developer Guidelines

## Project Overview
A mobile-first kitchen management PWA for Villa Akadia restaurant. Built with React 19 + Tailwind + Firebase Firestore. Deployed on Vercel. All UI is Hebrew (RTL).

## Tech Stack
- React 19, Tailwind CSS, framer-motion
- Firebase Firestore (free plan — NO Firebase Storage, use base64 → Firestore instead)
- Vercel (static site + serverless functions in `api/`)
- `@anthropic-ai/sdk` for OCR in `api/ocr.js`

## Rules
- Always run `CI=true npm run build` before committing — Vercel treats ESLint warnings as errors
- Always `git add + commit + push` after every change
- All UI text is Hebrew, all layouts are `dir="rtl"`
- No Firebase Storage (requires paid plan) — compress images with Canvas API and store base64 in Firestore
- Serverless functions in `api/` must use CommonJS (`require` / `module.exports`), not ESM (`import`/`export default`)

## Styling
- Background: `#121212`
- Cards: `rgba(255,255,255,0.04)` with `border: 1px solid rgba(255,255,255,0.08)`
- Border radius: `rounded-3xl` (cards), `rounded-2xl` (buttons/inputs)
- Fonts: Inter (Latin/numbers) + Heebo (Hebrew)
- Glow effect: `.glow-btn` class with CSS custom properties `--gc`, `--gca`, `--gcb`
- Station colors from `STATIONS[station].color` (hex)

## Firestore Structure
All documents live in the `kitchen/` collection:
- `prep_tasks_{station}` — completed prep task IDs (Set)
- `weekly_{station}` — completed weekly task IDs (Set)
- `order_{supplierId}` — supplier order quantities
- `custom_items_{supplierId}` — permanent custom order items
- `protein_count` — fish/protein end-of-day counts
- `missing_items`, `shift_notes` — global shift notes
- `recipe_images` — map of recipeId → base64 image
- `chef_avatars` — map of chef displayName → { url, x, y }
- `deliveries_index` — array of delivery summaries (DeliveryIndexEntry[])
- `delivery_{date}_{supplierId}_{timestamp}` — full delivery documents

## Roles
- `chef` — default role, accesses Dashboard/Prep/Recipes/Weekly/Shift/Proteins/Supplier
- `checker` — accesses CheckerHub/Supplier only; logs in without station selection

## Data Files
- `src/data/chefs.js` — chef list with PINs and roles
- `src/data/stations.js` — station definitions (cold, hot, checker)
- `src/data/suppliers.js` — supplier list with whatsapp/email fields
- `src/data/recipes.js` — full recipe database
- `src/data/prepTasks.js` — daily prep tasks per station
- `src/data/weeklyTasks.js` — weekly tasks per station

## Hooks
- `useFirestoreSet(docId)` — syncs a Set to Firestore with localStorage cache
- `useFirestoreArray(docId)` — syncs an Array to Firestore with localStorage cache
- `useDeliveries()` — wraps useFirestoreArray for deliveries_index
- `useDelivery(id)` — onSnapshot for a single delivery doc

## Session
localStorage key `villa_akadia_session` stores `{ user, station, role }`.
