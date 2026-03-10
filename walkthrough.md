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
