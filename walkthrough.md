# Walkthrough

## 2026-03-09

- Findings: Settings page for OpenRouter credentials is implemented and wired into sidebar/app navigation.
- Conclusions: Credential storage and retrieval are available through Electron IPC (`settings:getOpenRouter`, `settings:saveOpenRouter`) and consumed by renderer settings form.
- Actions: Verified the relevant files and wiring (`src/screens/Settings.tsx`, `src/App.tsx`, `src/components/Sidebar.tsx`, `electron/preload.ts`, `electron/main.ts`).

## 2026-03-09 (Cache Error Fix)

- Findings: Electron/Chromium reported Windows cache access-denied errors (`cache_util_win.cc`, `gpu_disk_cache.cc`) during startup.
- Conclusions: Session/cache path can be unwritable or locked on some Windows setups; moving session data to temp and disabling GPU shader disk cache avoids this failure mode.
- Actions: Updated `electron/main.ts` to set `sessionData` path to `%TEMP%\\NightCompanion\\session-data` and append `disable-gpu-shader-disk-cache` switch before app startup.

## 2026-03-09 (DB Password Fix)

- Findings: Local PostgreSQL login failed because `.env` used placeholder password text.
- Conclusions: Connection string must use `postgres` password for the local setup.
- Actions: Updated `DATABASE_URL` in `.env` and `.env.example` to `postgresql://postgres:postgres@localhost:5432/nightcompanion`.

## 2026-03-09 (Desktop Scripts)

- Findings: User ran `npm run electron:dev` but this script was not defined.
- Conclusions: Add explicit Electron/Desktop script aliases to enforce desktop-focused startup commands.
- Actions: Added `electron:dev`, `electron:start`, `desktop:dev`, and `desktop:start` scripts in `package.json`.

## 2026-03-09 (Remove dev:vite from Flow)

- Findings: User requested to remove `dev:vite` from the startup flow.
- Conclusions: Desktop startup should remain single-command and avoid exposing separate browser-first script usage.
- Actions: Refactored scripts so `electron:dev` runs `concurrently "vite" "npm run dev:electron"`, set `dev` and `desktop:dev` to `electron:dev`, and removed the `dev:vite` script entry.

## 2026-03-09 (Generator Not Visible Root Cause)

- Findings: Vite auto-switched to port `5174` because `5173` was already in use; Electron still targets `http://localhost:5173`.
- Conclusions: This can make Electron load an older/stale dev server and hide new UI changes like the Generator page.
- Actions: Updated `electron:dev` to `vite --port 5173 --strictPort` so port mismatch cannot happen silently.

## 2026-03-09 (Port Access Workaround)

- Findings: Existing process on `5173` could not be terminated due to access denied.
- Conclusions: Use an isolated desktop-dev port to avoid conflicts with stale/privileged processes.
- Actions: Switched desktop dev port from `5173` to `5187` in `package.json` (`electron:dev`, `dev:electron`) and `electron/main.ts` dev `loadURL`.

## 2026-03-09 (OpenRouter Model Cache + Settings Actions)

- Findings: User requested model list retrieval from OpenRouter after saving key, DB persistence, dropdown selection, and explicit test/refresh actions.
- Conclusions: Best flow is to cache models in Postgres (`openrouter_models`) and expose dedicated settings IPC methods for listing, refreshing, and testing.
- Actions: Added schema + migration for `openrouter_models`; implemented `settings:listOpenRouterModels`, `settings:refreshOpenRouterModels`, and `settings:testOpenRouter`; updated Settings UI with model dropdown plus `Test verbinding` and `Refresh modellen` buttons.

## 2026-03-09 (AIConfig Page Port)

- Findings: User requested an AIConfig page matching the provided `AIConfig.tsx` structure with dashboard/wizard flow.
- Conclusions: The attached file depended on modules not present in this repository, so the page was ported with equivalent structure using existing Electron settings APIs and local storage.
- Actions: Added `src/screens/AIConfig.tsx`, `src/screens/Settings/Dashboard.tsx`, `src/screens/Settings/ConfigurationWizard.tsx`, and `src/screens/Settings/types.ts`; updated `src/screens/Settings.tsx` to render `AIConfig`; validated via `npm run build`.

## 2026-03-10 (Attached Settings UI Alignment)

- Findings: The attached Settings pages required additional modules (`ProviderConfigForm`, model selector, local provider cards, toast + icon dependencies) that were not present in this repository.
- Conclusions: A direct paste-in would fail due to missing service layers, so the implementation was adapted to current Electron IPC (`settings:*`) and local storage while preserving the attached page structure and UX patterns.
- Actions: Installed `lucide-react` and `sonner`; added `src/screens/Settings/ProviderConfigForm.tsx`, `src/components/LocalEndpointCard.tsx`, `src/components/ModelSelector.tsx`, `src/lib/providers.ts`, `src/lib/constants.ts`, and `src/hooks/useTaskModels.ts`; refactored `src/screens/Settings/ConfigurationWizard.tsx`, `src/screens/AIConfig.tsx`, and `src/screens/Settings/types.ts`; wired global `<Toaster />` in `src/App.tsx`; validated with `npm run build`.

## 2026-03-10 (Legacy Local Endpoint Migration)

- Findings: Older `localEndpoints` records may still use legacy fields (e.g. `model` without `model_name`, no `provider`).
- Conclusions: Without migration, legacy entries are not grouped into provider cards (`Ollama`/`LM Studio`) and can be partially hidden in the new Settings wizard.
- Actions: Added one-time migration in `src/screens/AIConfig.tsx` to infer provider from endpoint name/URL and normalize legacy `model` to `model_name` shape, then persist migrated records back to localStorage.

## 2026-03-10 (Dashboard Role Routing Controls)

- Findings: The dashboard lacked direct controls to choose provider/model per role and enable/disable routing for generation, improvement, vision, and a general advisor role.
- Conclusions: Adding role routing at the dashboard layer keeps configuration quick and lets future advisor logic use a dedicated `general` route without modifying provider activation toggles.
- Actions: Added a new Role Routing section in `src/screens/Settings/Dashboard.tsx` with per-role `enabled`, `provider`, and `model` selectors; added persisted role routing state in `src/screens/AIConfig.tsx` (`dashboardRoleRouting`) plus dedicated advisor key (`advisorModelRoute`), with auto-default model selection when provider changes.

## 2026-03-10 (Prompt Builder Moved Into Generator Tabs)

- Findings: Prompt Builder existed as a separate sidebar route, while user requested it as a tab in Generator.
- Conclusions: The cleanest move is to keep Prompt Builder component logic intact and render it as an embedded view under Generator tabs, then remove the dedicated route.
- Actions: Removed `prompt-builder` from `src/types/index.ts`, `src/components/Sidebar.tsx`, and `src/App.tsx`; added tab state in `src/screens/Generator.tsx` with `Magic Random` and `Prompt Builder` tabs; updated `src/screens/PromptBuilder.tsx` to support embedded rendering and added select accessibility labels.

## 2026-03-10 (CSS Safari + Tailwind At-Rule Diagnostics)

- Findings: Editor diagnostics flagged `user-select` Safari compatibility and unknown CSS at-rules for Tailwind directives.
- Conclusions: Adding `-webkit-user-select` for matching declarations addresses Safari support hints, and workspace CSS lint settings can suppress false-positive unknown at-rule diagnostics for Tailwind.
- Actions: Updated `src/index.css` to include `-webkit-user-select` for `body` and `input, textarea`; added `.vscode/settings.json` with `css/scss/less.lint.unknownAtRules = ignore`.

## 2026-03-10 (Characters Page Added From Attachment)

- Findings: The attached `Characters.tsx` depended on unavailable modules in this repository (`react-i18next`, `framer-motion`, Supabase client/hooks, upload API endpoint, and `ChoiceModal`).
- Conclusions: A direct paste would fail, so the page was implemented with the same UX structure and visual behavior using existing dependencies and local persistence.
- Actions: Added `src/screens/Characters.tsx` with search, card grid, pagination, create/edit modal, image upload and main-image selection, traits management, card expand/collapse, delete flow, and image lightbox; wired it into `src/App.tsx`, `src/components/Sidebar.tsx`, and `src/types/index.ts`; validated with `npm run build`.

## 2026-03-10 (Character Images Saved To LocalAppData)

- Findings: Character images were previously stored as base64 data URLs in localStorage, which does not satisfy local file persistence requirements and can bloat storage.
- Conclusions: Image files should be persisted on disk under `%LocalAppData%\\NightCompanion\\characters` and referenced by `file://` URLs.
- Actions: Added Electron IPC handlers (`characters:saveImage`, `characters:deleteImage`) in `electron/main.ts` and exposed them in `electron/preload.ts` with typings in `src/types/electron.d.ts`; updated `src/screens/Characters.tsx` to upload images through IPC, store returned local file URLs, and remove local files when images/characters are deleted; validated with `npm run build`.

## 2026-03-10 (Dashboard As Startpagina)

- Findings: User requested a dashboard similar to the provided example as the default start page.
- Conclusions: Best fit is a local dashboard screen that aggregates existing app data sources (Electron IPC + character local storage) and offers quick navigation.
- Actions: Added `src/screens/Dashboard.tsx` with stats cards, recent prompts, top characters, and recent generation thumbnails; wired dashboard route into `src/types/index.ts`, `src/components/Sidebar.tsx`, and `src/App.tsx`; changed initial app screen to `dashboard`; validated with `npm run build`.

## 2026-03-10 (Prompt Library UI Vergelijkbaar Met Aangeleverd Bestand)

- Findings: User requested the Prompt Library to more closely match the attached `Prompts.tsx` style and interaction model.
- Conclusions: The existing schema does not include some attached features (favorites/templates/ratings/linked-gallery), so the implementation should mirror the visual structure and core interactions using supported fields.
- Actions: Refactored `src/screens/Library.tsx` to a richer layout with card-based prompt grid, search bar with icon, model + type/tag filters, tag pill filtering, hover action buttons (copy/edit/delete), compact metadata, and pagination; kept current create/edit flow via `PromptForm`; validated with `npm run build`.

## 2026-03-10 (Favorites/Templates/Rating Voor Prompt Library)

- Findings: User approved adding true favorites/templates support (and rating) so Prompt Library behavior matches the provided example more closely.
- Conclusions: This required schema + migration changes first, then UI updates in both form and library card interactions.
- Actions: Added `is_template`, `is_favorite`, and `rating` columns to prompts in `src/lib/schema.ts`; created migration `drizzle/0002_prompt_flags_and_rating.sql` and registered it in `drizzle/meta/_journal.json`; updated `src/components/PromptForm.tsx` with template/favorite toggles and star rating input; updated `src/screens/Library.tsx` with `All/Templates/Favorites` filters, favorite toggle action, and star rating controls on cards; validated with `npm run build` and applied DB migration via `npm run db:migrate`.

## 2026-03-10 (NightCafe Models Startup Sync + Image/Video Distinction)

- Findings: User requested startup synchronization from `resources/models/nightcafe_models_compleet.csv` with automatic DB updates and strict image/video distinction.
- Conclusions: A dedicated `nightcafe_models` cache table plus app-start CSV sync is the safest approach for first-run inserts and ongoing updates.
- Actions: Added `nightcafe_models` schema in `src/lib/schema.ts` with `modelType` and `mediaType`; created migration `drizzle/0003_nightcafe_models_cache.sql` and journal entry; implemented CSV parsing + startup sync in `electron/main.ts` (`syncNightCafeModelsFromCsv`) with upsert+prune behavior each app start; normalized media classification to `video` only when type contains video, otherwise `image` (including edit models); validated with `npm run build` and applied DB migration via `npm run db:migrate`.

## 2026-03-10 (Prompt Model Dropdown Uit DB NightCafe Models)

- Findings: User requested prompt model selection to use models already stored in DB and sorted alphabetically.
- Conclusions: Best implementation is a dedicated IPC list endpoint and loading dropdown options dynamically in `PromptForm`, filtered to `mediaType=image`.
- Actions: Added `nightcafeModels:list` IPC in `electron/main.ts` (alphabetical `orderBy(modelName)` with optional mediaType filter), exposed in `electron/preload.ts` and typed in `src/types/electron.d.ts`; replaced static `COMMON_MODELS` in `src/components/PromptForm.tsx` with DB-driven options loaded from `window.electronAPI.nightcafeModels.list({ mediaType: 'image' })`; validated via `npm run build`.

## 2026-03-10 (Generator Onder Dashboard In Sidebar)

- Findings: User requested Generator navigation item directly under Dashboard in sidebar order.
- Conclusions: Only sidebar item ordering needed adjustment; routing logic remains unchanged.
- Actions: Reordered `NAV_ITEMS` in `src/components/Sidebar.tsx` so `generator` appears immediately after `dashboard`.

## 2026-03-11 (NightCafe Presets Startup Sync + Generator Dropdown)

- Findings: User requested startup sync for `resources/presets/nightcafe_presets.csv`, DB insert/update behavior, alphabetical preset dropdown in Generator tab 1, and including selected preset in AI prompt generation.
- Conclusions: Implemented a dedicated presets cache table + startup sync (upsert + prune) and connected Generator UI/IPC so preset context is included in `magicRandom` requests.
- Actions: Added `nightcafe_presets` schema in `src/lib/schema.ts`; created migration `drizzle/0004_nightcafe_presets_cache.sql` and updated `drizzle/meta/_journal.json`; implemented CSV parsing/sync in `electron/main.ts` (`syncNightCafePresetsFromCsv`) and startup invocation; added IPC endpoint `nightcafePresets:list` in `electron/main.ts` and exposed/typed it in `electron/preload.ts` and `src/types/electron.d.ts`; updated `src/screens/Generator.tsx` to load presets, show alphabetical dropdown in first tab, and pass `presetName` into `generator:magicRandom`; validated with `npm run build` and `npm run db:migrate`.

## 2026-03-11 (Generator Greylist + Toggle + Autocomplete)

- Findings: User requested a Generator greylist with default words (`jellyfish`, `neon`, `cyber`), an on/off switch, and an autocomplete add field.
- Conclusions: Greylist needed to exist in both UI state and `generator:magicRandom` IPC payload so the model receives explicit avoidance guidance.
- Actions: Updated `src/screens/Generator.tsx` with greylist state, localStorage persistence, add/remove UX, datalist autocomplete input, default list seed, and on/off control; updated `electron/preload.ts` and `src/types/electron.d.ts` to include `greylistEnabled`/`greylistWords`; updated `electron/main.ts` `generator:magicRandom` handler to normalize/dedupe greylist terms and inject "avoid/low probability" instructions into AI prompt generation; validated with `npm run build`.

## 2026-03-12 (Startup PostgreSQL Guard + Auto-Create Default DB)

- Findings: App startup attempted migrations but tolerated failures, allowing launch to continue even when PostgreSQL was unavailable.
- Conclusions: Startup must fail fast when PostgreSQL is not reachable, while still auto-creating the default database when the server is running and only the DB is missing.
- Actions: Updated `electron/main.ts` to add `ensurePostgresAndDatabase()` startup guard (admin connection to `postgres`, `pg_database` existence check, `CREATE DATABASE` when missing, explicit unavailable-server error handling); changed `app.whenReady()` flow to exit app with error (`app.quit()` + `process.exit(1)`) on DB guard/migration failure instead of continuing.

## 2026-03-12 (Startup DB Failure Dialog)

- Findings: User requested a visible startup error notification instead of console-only failure output.
- Conclusions: A native Electron dialog shown in the main process before quitting makes startup failures explicit for non-dev users.
- Actions: Updated `electron/main.ts` startup catch block to display `dialog.showErrorBox(...)` with database failure details and recovery hint before `app.quit()`/`process.exit(1)`.

## 2026-03-12 (OpenRouter Model List Not Updating After Save/Refresh)

- Findings: Model list did not refresh reliably after saving OpenRouter key or clicking refresh in settings.
- Conclusions: `settings:refreshOpenRouterModels` incorrectly normalized `undefined` input to an empty API key path; additionally, saving a key did not immediately repopulate `dynamicModels` in UI state.
- Actions: Updated `electron/main.ts` `settings:refreshOpenRouterModels` to merge input over stored OpenRouter settings before syncing; updated `src/screens/Settings/ProviderConfigForm.tsx` `handleSave` to read `settings:listOpenRouterModels` right after save and push models into `setDynamicModels`, so dropdown options update instantly.

## 2026-03-12 (Characters Migrated From localStorage To PostgreSQL)

- Findings: Character entities were persisted in renderer `localStorage`, while the rest of app entities already used PostgreSQL.
- Conclusions: This split persistence model risks data loss/size limits and breaks backup/export consistency; characters should use DB-backed storage with existing image file persistence unchanged.
- Actions: Added `characters` table to `src/lib/schema.ts` and migration `drizzle/0005_characters.sql` (+ journal update); added Electron IPC CRUD handlers in `electron/main.ts` (`characters:list/create/update/delete`) and exposed typings/bridge in `electron/preload.ts` + `src/types/electron.d.ts`; refactored `src/screens/Characters.tsx` to load/save/update/delete via DB and perform one-time migration from legacy `localStorage` key (`nightcompanion.characters`) when DB is empty; updated `src/screens/Dashboard.tsx` to source character counts/cards from DB IPC instead of localStorage.

## 2026-03-12 (providerMeta Moved From localStorage To Electron Settings Store)

- Findings: `providerMeta` in `AIConfig` / `ProviderConfigForm` was still stored in renderer `localStorage`, causing the same persistence consistency issue.
- Conclusions: Provider settings belong in main-process persistent storage; existing `settings.json` store is sufficient and avoids renderer-local state persistence.
- Actions: Added `settings:getProviderMeta` and `settings:saveProviderMeta` IPC in `electron/main.ts` with typed normalization defaults and persistence in `settings.json`; updated `electron/preload.ts` and `src/types/electron.d.ts` with the new settings API; refactored `src/screens/AIConfig.tsx` and `src/screens/Settings/ProviderConfigForm.tsx` to load/save provider meta through Electron settings store instead of localStorage; added one-time legacy migration from `localStorage.providerMeta` to the Electron store in `AIConfig`; ensured `settings:saveOpenRouter` preserves `providerMeta` when writing settings.

## 2026-03-12 (AIConfig Role Routing + Cached Models Moved From localStorage)

- Findings: `dashboardRoleRouting`, `cachedModels`, and derived `advisorModelRoute` were still persisted in renderer localStorage.
- Conclusions: These are settings and should live in the main-process settings store to align with architecture and avoid renderer storage coupling.
- Actions: Added `settings:getAiConfigState` and `settings:saveAiConfigState` IPC in `electron/main.ts` with persistence under `settings.json` (`aiConfig` section), updated `electron/preload.ts` + `src/types/electron.d.ts` with new methods/types, and refactored `src/screens/AIConfig.tsx` to hydrate/persist via settings IPC; implemented one-time migration of legacy localStorage keys (`dashboardRoleRouting`, `cachedModels`, `advisorModelRoute`) into the Electron settings store, then cleanup localStorage keys.

## 2026-03-12 (localEndpoints Moved From localStorage To Electron Settings Store)

- Findings: `localEndpoints` in AI configuration still used renderer `localStorage`, despite broader migration to main-process settings persistence.
- Conclusions: Local provider endpoint configuration should be managed in the Electron settings store for consistency, backupability, and renderer storage independence.
- Actions: Added `settings:getLocalEndpoints` and `settings:saveLocalEndpoints` IPC in `electron/main.ts` and exposed these methods/types in `electron/preload.ts` and `src/types/electron.d.ts`; updated `src/screens/AIConfig.tsx` to load endpoints from settings store with one-time migration from legacy `localStorage.localEndpoints`; refactored `src/screens/Settings/ConfigurationWizard.tsx` endpoint upsert/remove/toggle helpers to use settings IPC instead of localStorage writes.

## 2026-03-12 (Electron IPC Modularized By Domain)

- Findings: `electron/main.ts` had grown to a large monolithic file containing unrelated IPC handlers (prompts, style profiles, generation log, settings, AI generation, NightCafe, characters), reducing maintainability.
- Conclusions: Domain-based IPC modules with explicit registration from `main.ts` keep responsibilities isolated while preserving existing channel contracts.
- Actions: Added `electron/ipc/prompts.ts`, `electron/ipc/styleProfiles.ts`, `electron/ipc/generationLog.ts`, `electron/ipc/nightcafe.ts`, `electron/ipc/characters.ts`, `electron/ipc/settings.ts`, and `electron/ipc/ai.ts`; refactored `electron/main.ts` to central bootstrap + startup sync + `registerIpcHandlers()` only; kept all IPC channel names unchanged; validated successfully with `npm run build`.

## 2026-03-12 (NightCafe Startup Sync Extracted To Service)

- Findings: `electron/main.ts` still contained extensive NightCafe CSV discovery/parsing/upsert logic after IPC modularization.
- Conclusions: Startup data-sync belongs in a dedicated service module so `main.ts` remains an orchestration entrypoint.
- Actions: Added `electron/services/nightcafeSync.ts` with CSV read/parse/upsert+prune logic for models and presets; updated `electron/main.ts` to call `syncNightCafeData({ db })`; removed duplicated NightCafe helper functions/constants from `main.ts`; validated with `npm run build`.

## 2026-03-12 (Root React Error Boundary)

- Findings: The renderer had no React Error Boundary, so a render-time crash in a subtree could tear down the full UI.
- Conclusions: A root-level Error Boundary around `App` is the minimal protection to keep a controlled fallback UI when runtime render errors occur.
- Actions: Added `src/components/ErrorBoundary.tsx` as a class-based boundary (`getDerivedStateFromError` + `componentDidCatch`) and wrapped `<App />` with `<ErrorBoundary>` in `src/main.tsx`.

## 2026-03-13 (Dashboard Stale Cache On Navigation)

- Findings: `Dashboard` remounts on each screen navigation from `App`, causing a full `Promise.all` refetch for prompts, style profiles, generation log, and characters every time user returns.
- Conclusions: A lightweight module-level stale cache with short TTL prevents unnecessary repeat fetches while keeping data reasonably fresh.
- Actions: Updated `src/screens/Dashboard.tsx` with a `DashboardCache` object, `DASHBOARD_CACHE_STALE_MS = 60_000`, cache hit path before fetch, and shared `applyDashboardData` state updater; kept existing loading/fallback behavior intact.

## 2026-03-13 (Provider API Key Persistence Fix)

- Findings: Saving provider API key depended on immediate OpenRouter model sync; if sync failed, save flow failed and key was not persisted. Test connection without edit mode also ignored stored key because it normalized only the incoming partial input.
- Conclusions: Settings persistence must be decoupled from model sync success, and test/partial save handlers should merge input over currently stored settings.
- Actions: Updated `electron/ipc/settings.ts` so `settings:saveOpenRouter` merges partial input with stored OpenRouter settings, writes settings first, and runs model sync as best-effort without blocking key persistence; updated `settings:testOpenRouter` to merge with stored settings so existing saved key is used when no new key is provided.

## 2026-03-13 (Settings UX: Key Saved + Model Sync Warning)

- Findings: After decoupling save from model sync, the UI could still show a generic success toast without clearly signaling model sync failure.
- Conclusions: Save feedback should distinguish between key persistence success and model refresh outcome to avoid confusion.
- Actions: Updated `src/screens/Settings/ProviderConfigForm.tsx` `handleSave` to refresh models via `settings:refreshOpenRouterModels` after key save and show `toast.warning` with description when model sync fails, while still keeping the API key save as successful.

## 2026-03-13 (OpenRouter Model Pricing In Dropdown)

- Findings: OpenRouter model fetch flow cached model IDs and names but did not persist or surface pricing details.
- Conclusions: Pricing should be stored with cached models and included in dropdown labels to support cost-aware model selection.
- Actions: Added pricing columns (`prompt_price`, `completion_price`, `request_price`, `image_price`) to `openrouter_models` in `src/lib/schema.ts` and migration `drizzle/0006_openrouter_model_pricing.sql` (+ journal update); updated `electron/ipc/settings.ts` to parse `pricing.*` from OpenRouter `/models` response and persist/return these fields; updated `electron/preload.ts` and `src/types/electron.d.ts` OpenRouter model types; updated `src/screens/Settings/ProviderConfigForm.tsx` and `src/screens/AIConfig.tsx` to render dropdown labels with prompt/completion pricing per 1M tokens.

## 2026-03-13 (OpenRouter Dropdown: Cheapest First + Search Autocomplete)

- Findings: Model options were shown in static order and native select UX had no inline search/autocomplete, making long model lists harder to navigate.
- Conclusions: OpenRouter models should be sorted by lowest combined prompt+completion price and selectable via a searchable autocomplete dropdown.
- Actions: Updated `src/screens/Settings/types.ts` `ModelOption` with optional pricing metadata; updated OpenRouter model mapping in `src/screens/Settings/ProviderConfigForm.tsx` and `src/screens/AIConfig.tsx` to retain pricing metadata and sort options cheapest-first; replaced native select in `src/components/ModelSelector.tsx` with a searchable autocomplete combobox/listbox UI (filter-as-you-type, keyboard navigation, enter-to-select, outside-click close).
