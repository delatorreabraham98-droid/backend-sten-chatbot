# AGENTS.md — STEN Chatbot Backend

## Quick start
- `npm run dev` — `node --watch src/server.js`
- `npm start` — production (Render)
- Env: copy `.env.example` → `.env.local`, fill secrets
- No tests, no linter, no typecheck, no formatter — do not invent commands for them

## Entry point & flow
`src/server.js` → `src/routes/whatsapp.js` (Express router) → `src/services/`:
1. `base44DataStore.js` — CRUD on Base44 entities (Channel, Bot, Client, Conversation, Message, Lead). Uses `fetch()` with 15s timeout (AbortController).
2. `aiResponder.js` (exported as `generateBotReply`) — **rule-based if/else chain, no OpenAI calls**. Requires `customerPhone` for Supabase memory lookup.
3. `metaWhatsApp.js` — send reply via Meta Graph API v25.0

Two webhook paths:
- `GET /webhook/whatsapp` — Meta verification (hub.mode / hub.verify_token)
- `POST /webhook/whatsapp` — inbound messages, replies 200 immediately then processes async

Graceful shutdown on SIGTERM/SIGINT (10s forced exit timeout).

## aiResponder.js — priority chain (DO NOT reorder)
1. `detectVehicleInfo` → `buildVehicleResponse`
2. `detectObjection` → `buildObjectionReply`
3. `memory.vehicle` + "1 función" → 1-function reply
4. `detectProductIntent` + `memory.vehicle` → `buildProductReply`
5. `memory.selected_product` + "instalacion" → installation reply
6. `memory.selected_product` + "domicilio/envio/punto medio" → delivery reply
7. `!memory.vehicle` + "premium/mejores/chafas" → premium info + ask vehicle
8. `memory.vehicle` + `!memory.selected_product` → `buildContinueSaleReply`
9. `memory.vehicle` + `memory.selected_product` → ask installation/delivery
10. fallback → ask year/model

## Vehicle databases
6 brand files in `src/data/vehicleDatabase{Brand}.js` (Toyota, Nissan, Honda, Chevrolet, Ford, Mitsubishi).
Exported as `{BRAND}_DATABASE` objects, merged in `vehicleEngine.js`. Fuzzy match threshold = 0.55.
`vehicleBulbs.json` is empty — data lives in these JS files only.

## Product catalog (hardcoded)
| Product | Price |
|---|---|
| COB_2_CARAS | $250 |
| COB_4_CARAS | $350 |
| CSP_PREMIUM | $500 |

## Memory
- Supabase `customer_memory` table via `supabaseMemory.js` (uses `maybeSingle()`, upserts by `phone`)
- Also has `learned_expressions` and `conversation_analytics` tables from `supabase-schema.sql`
- `aiResponder.js` requires `customerPhone` param — caller must pass `message.from`

## Shared utilities
- `src/utils/normalize.js` — shared `normalize()` function used by both `vehicleEngine.js` and `intentEngine.js`

## Removed legacy files (archived by git history)
- `base44Service.js`, `objectionEngine.js`, `leadScoringEngine.js`, `memoryEngine.js` — unused code, removed
- `salesEngine.js` — gutted to only `buildContinueSaleReply()` (only export used)

## Deploy
Render auto-deploys from `origin/main`. Render config in `render.yaml`: `npm install` / `npm start`, health check `/health`.
