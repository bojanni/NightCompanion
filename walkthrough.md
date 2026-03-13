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

## 2026-03-13 (OpenRouter Sort Toggle in Dropdown)

- Findings: User requested explicit control over model sorting (cheap-first vs alphabetical) in addition to autocomplete search.
- Conclusions: A compact toggle in the model-selection header is the simplest UX and should drive sorting consistently for all three role selectors.
- Actions: Updated `src/screens/Settings/ProviderConfigForm.tsx` with `Cheapest` / `Alphabetical` toggle state and UI, and passed `sortMode` into each `ModelSelector`; updated `src/components/ModelSelector.tsx` to support `sortMode` and sort filtered options accordingly before rendering.

## 2026-03-13 (Model Dropdown Showing Only One Option Fix)

- Findings: Searchable model dropdown opened with query prefilled to selected model label, so filter reduced options to only the selected model.
- Conclusions: Opening the dropdown should reset query state so users start from the full model list.
- Actions: Updated `src/components/ModelSelector.tsx` to clear query and reset highlight index when opening via focus or arrow-key open path, restoring full options visibility.

## 2026-03-13 (OpenRouter Dropdown With Model Descriptions + Lees Meer)

## 2026-03-13 (Generator Default Title + AI Title Button)

- Findings: Generator still defaulted saved titles to timestamp placeholders (`Magic Prompt ...` / `Improved Prompt ...`) rather than using prompt content, and there was no dedicated AI action to propose a concise library title.
- Conclusions: The save-title field should auto-seed from the first 140 characters of the latest generated prompt while preserving user-edited titles, and a separate AI title action can reuse the configured Improvement route for concise naming.
- Actions: Updated `src/screens/Generator.tsx` to auto-fill titles from prompt text, preserve manual edits on re-generation/improvement, and add a `Generate Title (AI)` button with loading/error handling; added `generator:generateTitle` IPC wiring in `electron/ipc/ai.ts`, `electron/preload.ts`, and `src/types/electron.d.ts` with a dedicated concise-title prompt and 140-character normalization.

## 2026-03-13 (Generator Layout: Preset + Greylist Side-by-Side)

- Findings: On the Generator page, NightCafe preset and greylist were stacked vertically, which made the Magic Random setup flow longer than needed.
- Conclusions: Preset and greylist should share the same row in the Magic Random tab while preserving greylist controls for the Prompt Builder tab.

## 2026-03-13 (Improve Prompt Diff View)

- Findings: After using `Improve Prompt`, users had no visual comparison between original and improved prompt text.
- Conclusions: A dedicated read-only diff field under Generated Prompt is needed to make additions/removals explicit, similar to highlighted diff views.
- Actions: Installed `diff` package; added `src/components/PromptDiffView.tsx` with word-level inline highlighting (green added, red removed); updated `src/screens/Generator.tsx` to store original/improved prompt pair on improve, clear diff on new generation/clear-all, and render the new diff panel only when an improvement result exists.

## 2026-03-13 (Generated Prompt Tabs: Final Result + Diff View)

- Findings: User requested explicit tabs above the improved prompt field to switch between normal prompt editing and diff comparison.
- Conclusions: A lightweight two-tab toggle in the Generated Prompt card provides clear mode switching without changing underlying save/generate actions.
- Actions: Updated `src/screens/Generator.tsx` to add `Final Result` and `Diff View` tabs above the prompt field, including disabled Diff state when no comparison exists, auto-switch to Diff after Improve Prompt, and reset to Final Result on new generation/clear-all.

## 2026-03-13 (Tabs Moved To Improvement Field)

- Findings: User clarified tabs must be above the newly added improvement field, not above the original editable prompt textarea.
- Conclusions: Original prompt editing should stay standalone; tabs should only appear inside the improvement comparison block shown after `Improve Prompt`.
- Actions: Updated `src/screens/Generator.tsx` to always render the original prompt textarea first, then render an improvement-only panel (when diff data exists) containing `Diff View`/`Final Result` tabs and the corresponding comparison output; adjusted `src/components/PromptDiffView.tsx` spacing for nested panel layout.

## 2026-03-13 (Generator Page State Persistence)

- Findings: Switching to another app page unmounted `Generator`, causing prompt content and UI selections to reset.
- Conclusions: Persisting core Generator UI state in localStorage and hydrating on mount prevents accidental data loss during navigation.
- Actions: Updated `src/screens/Generator.tsx` with `generatorUiState` persistence for tab, selected preset, generated prompt, saved title, improvement diff data, and improvement-view tab; added safe hydration with fallback defaults and guarded `Diff View` restore only when diff data exists.

## 2026-03-13 (Generator Max Words Slider)

- Findings: User requested control over prompt length for Magic Random output.
- Conclusions: Add a Generator slider with default 70 and hard cap 100, persist selection, and inject a max-word instruction in the AI request so output length is constrained.
- Actions: Updated `src/screens/Generator.tsx` with `Max words` range slider (`default 70`, `max 100`) and persisted it in `generatorUiState`; extended IPC types in `electron/preload.ts` and `src/types/electron.d.ts`; updated `electron/ipc/ai.ts` `generator:magicRandom` to accept/validate `maxWords`, include `Limit the final prompt to a maximum of X words.` in the instruction, and log the applied value.
- Actions: Refactored `src/screens/Generator.tsx` to extract a reusable `greylistCard`, render it next to the preset card in a responsive 2-column grid (`xl:grid-cols-2`) for the generator tab, and keep the same greylist card above Prompt Builder in builder mode.

## 2026-03-13 (Generator Layout Breakpoint to LG)

- Findings: User requested earlier side-by-side activation for preset + greylist on medium-large screens.
- Conclusions: Changing the grid breakpoint from `xl` to `lg` improves layout density earlier without altering component behavior.
- Actions: Updated `src/screens/Generator.tsx` generator controls grid class from `xl:grid-cols-2` to `lg:grid-cols-2`.

## 2026-03-13 (Generator Layout Breakpoint to MD)

- Findings: User requested the side-by-side preset + greylist layout to activate even earlier.
- Conclusions: Switching from `lg` to `md` makes the 2-column controls available on medium widths while preserving stacked behavior on small screens.
- Actions: Updated `src/screens/Generator.tsx` generator controls grid class from `lg:grid-cols-2` to `md:grid-cols-2`.

## 2026-03-13 (Generator MD Gap Compacting)

- Findings: User requested the side-by-side layout to feel slightly denser on `md` widths.
- Conclusions: A breakpoint-specific gap override keeps mobile/large spacing intact while tightening medium screens.
- Actions: Updated generator controls grid class in `src/screens/Generator.tsx` to `gap-5 md:gap-4 lg:gap-5`.

- Findings: OpenRouter models were shown without description context, making selection harder when model names are similar.
- Conclusions: Model descriptions should be fetched and displayed directly in the dropdown with compact preview and expandable full text.
- Actions: Added `description` to `openrouter_models` schema (`src/lib/schema.ts`) and migration `drizzle/0007_openrouter_model_description.sql` (+ journal update); updated `electron/ipc/settings.ts`, `electron/preload.ts`, and `src/types/electron.d.ts` to parse/persist/expose model descriptions from OpenRouter `/models`; updated model mapping in `src/screens/Settings/ProviderConfigForm.tsx` and `src/screens/AIConfig.tsx` to carry `description` + `priceLabel`; updated `src/components/ModelSelector.tsx` to render `prijs | model` on first line, 2-line clamped description on second line, and `Lees meer`/`Lees minder` toggle per model.

## 2026-03-13 (Migration Verification Run)

- Findings: Follow-up verification requested after description-column rollout for OpenRouter models.
- Conclusions: Running migrations again is safe and confirms pending migrations are applied in sequence by Drizzle.
- Actions: Executed `npm run db:migrate`; migration runner completed successfully with no blocking errors.

## 2026-03-13 (Settings Dashboard Visual Redesign)

- Findings: Settings page (AI Config dashboard) had a dated table-row layout with status cards, checkboxes, and exposed provider/key details. User provided a screenshot showing a cleaner design.
- Conclusions: A card-based layout matching the screenshot improves clarity: role-grouped icon squares with inline Provider + Model dropdowns, "AI Configuration" header with Active/Inactive badge, gradient "Save Configuration" button, and secondary "Manage Providers" button for wizard access.
- Actions: Fully rewrote `src/screens/Settings/Dashboard.tsx`: replaced old `RoleRouteRow`, `StatusCard`, and `formatProvider` helpers with typed `ROLE_META` record (icon + color per role), `formatProviderLabel` map, and a single `Dashboard` function rendering Settings header (gear icon + subtitle), AI Configuration card with four role rows (violet/rose/cyan/teal icon squares, Provider/Model native selects, dividers), gradient Save button (toast feedback), and a secondary Manage Providers button (`onConfigure` → wizard). Build passes without errors.

## 2026-03-13 (OpenRouter Config UI Redesign — Card Trigger + In-Dropdown Search + Badges)

- Findings: The model selector trigger was an `<input>` field that displayed the selected model's label; search was inline in the trigger; dropdown items showed only `price | name` with no provider or capability context.
- Conclusions: A card-style `<button>` trigger showing price, name, and provider sub-row better matches the target design; moving search inside the dropdown decouples display from filtering; provider and Vision badges improve model discoverability.
- Actions: Rewrote `src/components/ModelSelector.tsx`: replaced `<input>` trigger with card-style `<button>` (teal price | model name + provider sub-row | `ChevronDown` that rotates when open); added `searchInputRef` auto-focused via `useEffect([isOpen])`; moved search `<input>` to top of dropdown panel with border-b separator; redesigned dropdown items to show model name + teal price on first row, then violet provider badge + optional teal Vision badge, then clamped description + `Lees meer`/`Lees minder`; added `getProviderDisplayName` helper; removed the `useEffect` that mirrored selected name into query state. Build passes without errors.

## 2026-03-13 (Local Provider Config Redesign — Match OpenRouter Design)

- Findings: Ollama and LM Studio configuration cards (`LocalEndpointCard.tsx`) used a dated layout: basic unlabeled 2-column input grid, minimal header with only a `Cpu` icon and plain title, no provider description, and terse role-activation buttons with inline icon+text spans.
- Conclusions: The local provider cards should match the visual design of `ProviderConfigForm.tsx` (OpenRouter): sectioned layout with header + Active badge, descriptive subtitle, clearly labeled inputs with consistent styled class, "Model Selection" section separated by a border with `Server` icon header, and 3-column role-activation buttons with `flex-col` centering.
- Actions: Rewrote `src/components/LocalEndpointCard.tsx`: added module-level `PROVIDER_META` lookup with title, description, and URL placeholder per provider type; replaced `Cpu` import with `Server`; added `isAnyRoleActive` derived flag; replaced `space-y-4` card with `space-y-6 animate-in fade-in` wrapper; added header section matching `ProviderConfigForm` (h3 + amber Active badge + description paragraph); replaced unlabeled 2-col grid with a labeled Base URL input + separate "Model Selection" section (`border-t`, `Server` icon, `grid-cols-1 md:grid-cols-3 gap-6`, properly labeled text inputs); updated Save/Remove buttons to match `ProviderConfigForm` button styles; updated role-activation grid to `py-3 flex-col items-center` matching existing cloud provider design. Build passes without errors.

## 2026-03-13 (AI API Request Logging + Settings Toggle)

- Findings: AI prompt generation requests (`generator:magicRandom`) had no dedicated request/response logging path and no user-facing setting to control diagnostic logging.
- Conclusions: Logging should be controlled by a persisted toggle in AI Config state and written in the Electron main process (not renderer) to a local file, with payload sanitization (no API key logging).
- Actions: Added `aiApiRequestLoggingEnabled` to AI config settings types and persistence flow (`electron/ipc/settings.ts`, `electron/preload.ts`, `src/types/electron.d.ts`, `src/screens/AIConfig.tsx`); added an "AI API request logging" switch in `src/screens/Settings/Dashboard.tsx`; updated `electron/main.ts` to inject logging config into AI IPC; implemented JSONL file logging in `electron/ipc/ai.ts` to `%AppData%/NightCompanion/logs/ai-api-requests.jsonl` with request metadata, request payload, response prompt/error, status, and duration; verified with `npm run build`.

## 2026-03-13 (AI Configuration Moved To Separate Page + Dashboard Redesign)

- Findings: AI configuration lived under `Settings`, and the role-routing dashboard layout did not match the requested screenshot structure.
- Conclusions: `AI Configuration` should be a dedicated screen in sidebar navigation, while `Settings` should host general diagnostics/settings; AI config dashboard should use a 2x2 role-card layout with per-card Provider/Model selectors and centered "Configure Providers" action.
- Actions: Added new screen route `ai-config` in `src/types/index.ts`, wired navigation in `src/components/Sidebar.tsx`, and routed dedicated page in `src/App.tsx`; redesigned `src/screens/Settings/Dashboard.tsx` to screenshot-like card grid (Generation, Improvement, Vision, Research & Reasoning) with active badge/latency indicator and centered Configure Providers button; moved AI API logging toggle out of AI config dashboard into `src/screens/Settings.tsx` (Diagnostics card) while persisting via `settings:getAiConfigState` / `settings:saveAiConfigState`; updated `src/screens/AIConfig.tsx` to remove dashboard-toggle props/state coupling; verified with `npm run build`.

## 2026-03-13 (Dropdown + Model Selector Visual Alignment With Screenshot)

- Findings: AI Configuration Dashboard still used native model `<select>` fields and existing custom selector styling did not match the screenshot's richer dropdown (search panel, card options, left in/out pricing column, badges).
- Conclusions: A single upgraded `ModelSelector` should drive model selection visuals across both AI Configuration Dashboard and Provider Configuration to keep UX consistent.
- Actions: Refined `src/components/ModelSelector.tsx` trigger/dropdown styling to match screenshot patterns (rounded trigger, darker panel, search bar, card-style options, left `In/Out` price column, provider/capability chips, show more/less text); integrated `ModelSelector` into `src/screens/Settings/Dashboard.tsx` for role model selection and styled provider dropdown to match; retained Provider Configuration model fields using the same shared selector for visual parity; verified with `npm run build`.

## 2026-03-13 (AI Configuration Runtime Regression Fix)

- Findings: Opening AI Configuration threw `ReferenceError: dynamicModels is not defined` from `src/screens/Settings/Dashboard.tsx` after dashboard/model-selector refactor.
- Conclusions: `dynamicModels` was referenced inside `getRoleModelOptions` but omitted from Dashboard component prop destructuring.
- Actions: Added `dynamicModels` back into `Dashboard` function prop destructuring in `src/screens/Settings/Dashboard.tsx`; verified with `npm run build`.

## 2026-03-13 (Model Price Formatting: Fixed Two Decimals)

- Findings: Model pricing display used mixed precision (`toFixed(2)` for larger values and `toFixed(4)` for smaller values), causing inconsistent UI formatting.
- Conclusions: Pricing should always render with exactly two decimals (e.g., `7.15`) for consistent readability.
- Actions: Updated price-per-million format helpers in `src/screens/AIConfig.tsx`, `src/screens/Settings/ProviderConfigForm.tsx`, and `src/components/ModelSelector.tsx` to always use `toFixed(2)`; verified with `npm run build`.

## 2026-03-13 (Generator Runtime Error Guard)

- Findings: Clicking generate could throw `TypeError: Cannot read properties of undefined (reading 'error')` in `handleGenerate` when IPC response was undefined/unexpected.
- Conclusions: Generator flow needs defensive handling around IPC calls to avoid renderer crashes on malformed or missing responses.
- Actions: Updated `src/screens/Generator.tsx` `handleGenerate` with `try/catch/finally`, added explicit guard for empty result before reading `result.error`, and preserved status feedback paths; verified with `npm run build`.

## 2026-03-13 (Model Price Label Normalization In Selector)

- Findings: Some model options still displayed `00.00`-style pricing labels in the dropdown trigger/list due to relying on precomputed `priceLabel` text from cached option payloads.
- Conclusions: Pricing display should be normalized at render time from raw `promptPrice`/`completionPrice`, always rounded with two decimals for consistent UI output.
- Actions: Updated `src/components/ModelSelector.tsx` to compute price labels via shared formatter (`buildComputedPriceLabel`) from raw price fields and use that for both selected trigger label and list items; verified with `npm run build`.

## 2026-03-13 (Compact Tiny-Price Fallback)

- Findings: Extremely small but non-zero model prices still rendered as `0.00` after two-decimal rounding, which looked like free pricing.
- Conclusions: Tiny non-zero values should use a compact fallback label to distinguish them from true zero values.
- Actions: Updated per-million price formatters in `src/components/ModelSelector.tsx`, `src/screens/AIConfig.tsx`, and `src/screens/Settings/ProviderConfigForm.tsx` to render `<$0.01` when `0 < perMillion < 0.01`, otherwise keep two-decimal formatting; verified with `npm run build`.

## 2026-03-13 (Magic Random Prompt Persona + UK English Enforcement)

- Findings: User requested a strict prompt-generation instruction set for `generator:magicRandom`, including enforced English (UK) spelling/terminology and single-paragraph output formatting.
- Conclusions: The most reliable implementation is to define shared `LANGUAGE_INSTRUCTION` and `BASE_PERSONA` constants in Electron AI IPC and pass `BASE_PERSONA` as the system message for Magic Random generation.
- Actions: Updated `electron/ipc/ai.ts` by adding the provided instruction constants and wiring `messages[0].content` to `BASE_PERSONA` for `generator:magicRandom`; validated with `npm run build`.

## 2026-03-13 (Improve Prompt Instruction + Persona Rules)

- Findings: User requested a dedicated improvement instruction for the Improve button flow to upgrade a basic concept while preserving original intent.
- Conclusions: Improvement requests should reuse the same persona constraints (`BASE_PERSONA`) and prepend a dedicated `IMPROVE_INSTRUCTION` in the user message for both OpenRouter and local provider routes.
- Actions: Updated `electron/ipc/ai.ts` with `IMPROVE_INSTRUCTION` and changed `generator:improvePrompt` request payloads (OpenRouter + local) to use `BASE_PERSONA` as system content and `${IMPROVE_INSTRUCTION}\n\n${prompt}` as user content; validated with `npm run build`.

## 2026-03-13 (Magic Random: Preset Instructie + Theme Verwijderd)

- Findings: User requested that Magic Random always passes the selected preset as instruction context and that the theme field is removed.
- Conclusions: The Magic Random request contract should only include `presetName` + greylist settings, and the renderer must remove theme input/state entirely.
- Actions: Updated `electron/ipc/ai.ts` to remove `theme` handling from `generator:magicRandom`, make preset instruction explicit (`mandatory style guidance`), and remove theme logging field; updated `src/screens/Generator.tsx` to delete theme state/input and stop sending `theme`; updated `electron/preload.ts` and `src/types/electron.d.ts` generator `magicRandom` signature to remove `theme`; validated with `npm run build`.
