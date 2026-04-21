# Walkthrough

## 2026-01-15 (NightCompanion API: Create vs Update + Field Validations)

- Findings: Gallery requires distinct create/update endpoints and field-level validations.
- Conclusions: Implement two separate API methods with proper POST (create) and PUT (update) semantics, plus per-field validation logic.
- Actions: Added `/prompts` POST and `/prompts/{id}` PUT handlers in api.ts with create/update contracts and field validations.

## 2026-01-16 (Electron AI: Deferred Initialization + Thread Queue)

- Findings: AI initialization should not block app startup and IPC calls need to be queued until AI is ready.
- Conclusions: Defer initialization to first-use and queue pending IPC calls in a thread-safe manner.
- Actions: Refactored `electron/services/ai.ts` to defer init and implemented request queue.

## 2026-01-17 (NightCompanion: Drizzle ORM Schema + SQLite Setup)

- Findings: Database schema needs normalized tables for Prompts, Gallery, and metadata.
- Conclusions: Define schema using Drizzle with proper relationships and indexes.
- Actions: Created `src/db/schema.ts` with Prompts, Gallery, and Metadata tables; set up SQLite connection.

## 2026-01-18 (Generator: Magic Random Basic Flow)

- Findings: Magic Random generation needs UI flow + IPC bridge to AI provider.
- Conclusions: Create basic PromptForm component and connect to `generator:magicRandom` IPC call.
- Actions: Built PromptForm.tsx with preset dropdown, magic buttons, and integrated with Generator.tsx.

## 2026-01-20 (Model Selector: Dynamic Model List from Config)

- Findings: Hardcoded model lists should be replaced with dynamically loaded provider config.
- Conclusions: Fetch provider config on startup and populate Model Selector dropdown dynamically.
- Actions: Updated ModelSelector.tsx to read from providerConfig state and handle load/error states.

## 2026-01-22 (Prompt Library: Save + Load Flow)

- Findings: Need ability to save composed prompts to Library and load them back for editing.
- Conclusions: Implement Library List screen and connect save/load actions from Generator.
- Actions: Built Library screen with CRUD operations and updated Generator navigation.

## 2026-01-25 (Style Profiles: Definition + Application)

- Findings: Prompts need style-based suffixes (e.g., "cinematic", "dreamy") applied automatically.
- Conclusions: Create Style Profiles management and inject style snippet into final prompt payload.
- Actions: Added StyleProfiles screen + management logic; integrated into PromptForm composition.

## 2026-01-28 (Negative Prompt Field + Greylist)

- Findings: Negative prompts need their own field and greylist filtering capability.
- Conclusions: Add separate negative prompt textarea and implement greylist term highlighting/blocking.
- Actions: Updated PromptForm.tsx with negative prompt input and greylist toggle; added Greylist config screen.

## 2026-02-01 (Gallery View: Grid + Preview Modal)

- Findings: Need visual gallery of generated images with preview modal and metadata display.
- Conclusions: Build Gallery screen with image grid, modal preview, and associated prompt/settings display.
- Actions: Created Gallery.tsx with responsive image grid and detail modal.

## 2026-02-05 (Settings: Provider Config + API Key Management)

- Findings: API keys and provider settings need secure configuration UI.
- Conclusions: Build Settings screen with encrypted key storage and provider endpoint configuration.
- Actions: Added AIConfig.tsx + ProviderConfigForm.tsx with secure key handling.

## 2026-02-08 (Usage Tracking: Token + Cost Calculation)

- Findings: Need to track API usage and calculate costs per model/provider.
- Conclusions: Implement usage database table and cost calculator based on model pricing.
- Actions: Added usage tracking to AI service and built Usage Dashboard screen.

## 2026-02-12 (Sidebar Navigation: Main App Layout)

- Findings: App needs consistent navigation between Library, Generator, Gallery, and Settings.
- Conclusions: Build Sidebar component with nav items and layout wrapper.
- Actions: Created Sidebar.tsx and PageContainer.tsx for main app layout structure.

## 2026-02-15 (Dashboard: Usage Overview + Stats Display)

- Findings: Need at-a-glance view of recent generation activity and top models.
- Conclusions: Build Dashboard screen with usage cards, charts, and quick-access to recent prompts.
- Actions: Created Dashboard.tsx with usage widgets and activity feed.

## 2026-02-18 (Electron IPC Bridge: Type-Safe Renderer ↔ Main Communication)

- Findings: Renderer and Main process need type-safe bidirectional communication.
- Conclusions: Implement preload.ts + electron.d.ts for full TypeScript IPC type coverage.
- Actions: Set up comprehensive IPC registry with all handler type definitions.

## 2026-02-22 (AI Provider Integration: OpenRouter + Local LLM Support)

- Findings: NightCompanion should support both cloud (OpenRouter) and local LLM providers.
- Conclusions: Implement conditional provider routing based on config selection.
- Actions: Added provider selection logic in electron/ipc/ai.ts with dual-provider support.

## 2026-02-25 (Improvement Flow: Prompt Enhancement via AI)

- Findings: Users need ability to improve existing prompts through AI refinement.
- Conclusions: Add dedicated Improve button with diff view showing original vs improved.
- Actions: Created improvement flow in Generator with diff view component.

## 2026-02-28 (Export Functionality: JSON + CSV for Prompts + Gallery)

- Findings: Users need to export Library and Gallery data for backup/sharing.
- Conclusions: Implement export handlers for JSON (full data) and CSV (summaries).
- Actions: Added export functions to electron/ipc/db.ts accessible via Generator/Gallery menus.

## 2026-03-01 (Search + Filter: Find Prompts by Tag/Style/Model)

- Findings: Large prompt libraries need search and filtering capabilities.
- Conclusions: Implement full-text search and filter UI in Library screen.
- Actions: Updated Library.tsx with search input and filter controls; added SQLite FTS support.

## 2026-03-05 (Batch Operations: Delete + Tag Multiple Prompts)

- Findings: Managing large libraries requires batch operations.
- Conclusions: Add checkbox selection and batch action menu (delete, tag, export).
- Actions: Updated Library.tsx with selection checkboxes and bulk action handlers.

## 2026-03-08 (Accessibility Audit: Keyboard Nav + Screen Reader Support)

- Findings: App needs basic a11y compliance (keyboard shortcuts, ARIA labels).
- Conclusions: Add keyboard shortcuts and semantic HTML/ARIA labels throughout.
- Actions: Added keyboard handlers in key components and semantic HTML improvements.

## 2026-03-10 (Gallery: Filter by Model + Export to NightCafe)

- Findings: Gallery needs filtering by AI model used and export button for NightCafe re-generation.
- Conclusions: Add filter dropdown to Gallery and NightCafe export handler.
- Actions: Updated Gallery.tsx with model filter and added NightCafe export in IPC bridge.

## 2026-03-12 (Model Price Formatting: Fixed Two Decimals)

- Findings: Model pricing display used mixed precision, causing inconsistent UI formatting.
- Conclusions: Pricing should always render with exactly two decimals for consistent readability.
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

## 2026-03-13 (Live Prompt Preview in PromptForm + PromptBuilder)

- Findings: User requested a live, composed preview of the final prompt payload (prompt + style snippet, negative + style negative), including model display, word/character counters, greylist highlighting, and quick copy/save actions.
- Conclusions: A shared display-only component is the cleanest implementation; no new IPC is required when composition happens in renderer state.
- Actions: Added `src/components/PromptPreview.tsx` with live composition, style-snippet highlighting, greylist highlighting, model display, and color-coded word counting (`green` under limit, `yellow` near limit, `red` over limit); integrated preview panel in `src/components/PromptForm.tsx` as a responsive side panel (stacked on smaller screens) with style profile selection for preview context and quick save trigger; integrated preview in `src/screens/PromptBuilder.tsx` with style profile selection, responsive side panel behavior, and combined save payload (`prompt + style snippet`, `negative + style negative`); passed Generator `maxWords` through to embedded `PromptBuilder` preview via `src/screens/Generator.tsx`; validated with `npm run build`.

## 2026-03-13 (Generate Negative Prompt From Positive Prompt)

- Findings: User requested a dedicated `Generate Negative Prompt` action that derives a concise NightCafe negative prompt directly from the current positive prompt, using a strict comma-separated output format.
- Conclusions: A separate IPC endpoint is preferable to keep generation and improvement flows distinct (`generate` from positive prompt vs `improve` existing negative prompt).
- Actions: Added `NEGATIVE_PROMPT_INSTRUCTION` in `electron/ipc/ai.ts` exactly as specified and implemented new IPC handler `generator:generateNegativePrompt` (OpenRouter + local provider support via existing Improvement route/model settings, with request logging); exposed method through `electron/preload.ts` and `src/types/electron.d.ts`; updated `src/screens/Generator.tsx` with a new `Generate Negative Prompt` button next to `Improve Negative Prompt`, including loading/disabled guards and status feedback; validated with `npm run build`.

## 2026-03-13 (Generator Save Flow: Ensure Negative Prompt Persistence)

- Findings: User requested certainty that generated negative prompts are saved into Prompt Library entries when saving from Generator.
- Conclusions: Save should explicitly persist a trimmed negative prompt value and block save while negative generation/improvement is still in-flight.
- Actions: Updated `src/screens/Generator.tsx` `handleSaveToLibrary` to save `negativePrompt.trim()` and added guard/disabled state to prevent saving during `generatingNegative`/`improvingNegative`; validated with `npm run build`.

## 2026-03-14 – Magic Quickstart merged into Quickstart tab

- Removed the separate **Quick Start** tab from Generator
- Renamed **Magic Random** tab to **Quickstart**
- **Magic Quickstart** card (idea textarea, creativity slider, character picker) now renders as the LEFT column of a 2-column `lg:grid-cols-2` grid
- **Magic Random AI controls** (NightCafe Preset, Max Words slider, action buttons, greylist) render as the RIGHT column in the same tab
- Tab type narrowed from `'generator' | 'builder' | 'quickstart'` to `'generator' | 'builder'`; localStorage load maps legacy `'quickstart'` value ? `'builder'`

## 2026-03-14 – Quickstart Prompt Preview

- Added PromptPreview to the **Magic Quickstart** card in src/screens/Generator.tsx so the Quickstart flow now shows a live preview
- Preview uses generatedPrompt || quickStartIdea as prompt source, includes current negativePrompt, maxWords, and greylist highlighting when enabled

## 2026-03-30 (PromptBuilder — Generated Prompt field + copy + improve)

- Findings: After generating a full prompt, it should not overwrite the prompt parts. Instead it should appear in a dedicated "Generated Prompt" field with a Copy button underneath, plus an Improve Prompt button that behaves like the Generator quickstart improve action.
- Conclusions: Keep PromptBuilder field values intact and store the generated full prompt separately in component state. Reuse the existing `generator.improvePrompt` IPC call for improvements.
- Actions: Removed the previous "Gebruik als basis" button and its localStorage/navigation glue; updated `src/screens/PromptBuilder.tsx` to store generated prompt in a new `generatedPrompt` state, render a "Generated Prompt" textarea, add Copy and Improve Prompt buttons, and clear it on "Clear all"; updated `src/screens/Generator.tsx` to stop passing navigation props / reading localStorage; validated with `npm run build`.

## 2026-03-31 (Generator > Prompt Builder — Generate Title button)

- Findings: User wanted a "Generate Title" button next to the Prompt Builder title field on the Generator page, positioned left of "Save to Library".
- Conclusions: Reuse the existing `generator.generateTitle` IPC call and base it on the current composed prompt.
- Actions: Updated `src/screens/PromptBuilder.tsx` to add a `Generate Title (AI)` button next to the title input (left of Save), with loading state and toast feedback; validated with `npm run build`.

## 2026-03-31 (PromptBuilder — Improve Prompt matches Quickstart)

- Findings: Prompt Builder's Improve Prompt needed to behave like the Quickstart improve flow and use the same button colours.
- Conclusions: Mirror Quickstart by tracking an improvement diff and rendering Diff/Final tabs using `PromptDiffView`, and reuse the existing teal button class.
- Actions: Updated `src/screens/PromptBuilder.tsx` to track `generatedImprovementDiff` + `generatedPromptViewTab`, render Diff View / Final Result tabs with `PromptDiffView`, and use `btn-compact-teal` for the Improve button; validated with `npm run build`.

## 2026-03-31 (Generator — hide Prompt Preview on Prompt Builder tab)

- Findings: The Prompt Preview panel was shown on the Prompt Builder tab, but it was redundant and should be removed there.
- Conclusions: Keep Prompt Preview only on the Quickstart tab.
- Actions: Updated `src/screens/Generator.tsx` to render `PromptPreview` only when `tab === 'generator'`; validated with `npm run build`.

## 2026-03-31 (Generator — re-add Creativity + Max Words controls)

- Findings: Creativity selection and max words slider were removed from Quickstart, and the same controls were also needed on the Prompt Builder tab.
- Conclusions: Keep a single `maxWords` state for both tabs and expose creativity controls for Quickstart expansion, Magic Random generation, and Prompt Builder prompt generation.
- Actions: Updated `src/screens/Generator.tsx` to re-add a max words slider and creativity selectors on the Quickstart tab; added the same max words + creativity controls on the Prompt Builder tab and passed creativity/maxWords into `PromptBuilder` so `generator.generatePromptFromFields` respects them; updated typings in `electron/preload.ts` + `src/types/electron.d.ts`; ensured `generator:generatePromptFromFields` truncates to `maxWords` in all provider paths; validated with `npm run build`.

## 2026-03-31 (Generator — move Max Words + Creativity into cards)

- Findings: The Max Words slider and Creativity controls were visible as a separate panel, but you wanted them inside the Magic Quickstart and Magic Random cards.
- Conclusions: Placing the controls inside each card keeps settings close to the actions they affect and reduces top-of-page clutter.
- Actions: Updated `src/screens/Generator.tsx` to move the Max Words slider and the corresponding Creativity controls into the Magic Quickstart and Magic Random cards; validated with `npm run build`.

## 2026-03-31 (Generator — remove Prompt Preview)

- Findings: The Prompt Preview panel was still shown on Quickstart and you wanted it removed.
- Conclusions: Removing the section reduces UI clutter and keeps focus on the generation workflow.
- Actions: Updated `src/screens/Generator.tsx` to remove the `PromptPreview` section (and its import); validated with `npm run build`.

## 2026-04-03 (Generator — Preset + Creativity on one row)

- Findings: You wanted the Preset dropdown and Creativity controls to sit on a single row for a more compact layout.
- Conclusions: Wrap both controls in a responsive 2-column grid so they align side-by-side when space allows.
- Actions: Updated `src/screens/Generator.tsx` to group Preset + Creativity in a `md:grid-cols-2` layout in both Magic Quickstart and Magic Random cards; validated with `npm run build`.

## 2026-04-03 (UI — Non-fullscreen pages 1200px wide)

- Findings: Centred (non full-screen) pages were constrained to ~1000px width.
- Conclusions: Increase the shared container width to 1200px while keeping smaller viewports at `w-full`.
- Actions: Updated `src/components/PageContainer.tsx` and the centred wrapper in `src/screens/AIConfig.tsx` from `1000px` to `1200px`; validated with `npm run build`.

## 2026-04-03 (Generator — Copy Prompt in Improve section)

- Findings: You wanted a Copy Prompt button directly in the Improve Prompt card so you can quickly copy the improved result.
- Conclusions: Copy the improved prompt when available, otherwise fall back to the current generated prompt.
- Actions: Updated `src/screens/Generator.tsx` to add a `handleCopyImprovedPrompt` helper and render a `Copy Prompt` button next to `Improve Prompt` in the Improve section; validated with `npm run build`.

## 2026-04-19 (Sidebar — align left menu items)

- Findings: Navigation labels in the left sidebar could appear visually offset because icon glyph widths vary between symbols.
- Conclusions: A fixed icon column with a constrained text column keeps every menu row aligned regardless of icon shape.
- Actions: Updated `src/components/Sidebar.tsx` to use a two-column grid (`icon + text`) with a fixed icon container and `min-w-0` text block for consistent alignment; validated with `npm run build`.

## 2026-04-19 (Generator — save mode for original vs improved)

- Findings: Generator save flow always used the improved prompt when an improvement diff existed, with no user choice.
- Conclusions: Add an explicit save mode selector so users can save original-only or keep original+improved behavior.
- Actions: Updated `src/screens/Generator.tsx` to add persisted `savePromptMode` state and branch save payload selection; updated `src/components/generator/TitleSaveSection.tsx` with a new `Save mode` dropdown; extended generator UI state typing/normalization in `electron/ipc/settings.ts`, `electron/preload.ts`, and `src/types/electron.d.ts`; validated with `npm run build`.

## 2026-04-19 (Generator — place Generate Title before save mode)

- Findings: In the Generator save row, `Generate Title (AI)` appeared after the save-mode selector.
- Conclusions: Place `Generate Title (AI)` directly before the save-mode dropdown to match the intended action order.
- Actions: Updated `src/components/generator/TitleSaveSection.tsx` to reorder controls into title input → generate title button → save mode dropdown, while keeping `Save to Library` as the trailing action; validated with `npm run build`.

## 2026-04-19 (Generator — prevent duplicate saves by prompt text)

- Findings: The duplicate check allowed saving the same prompt text multiple times when titles differed.
- Conclusions: Duplicate detection should compare normalized prompt text only, independent from title.
- Actions: Updated `src/screens/Generator.tsx` duplicate pre-check to compare normalized prompt text only; added IPC guard in `electron/ipc/prompts.ts` `prompts:create` to reject duplicate prompt text globally and return a clear error; validated with `npm run build`.

## 2026-04-19 (Prompt Library lightbox — max image height + copy button)

- Findings: In the Prompt Library lightbox, the displayed image did not use the full available viewport height and there was no direct copy action for the shown prompt text.
- Conclusions: Increase image max height to the viewport-safe limit while keeping `object-contain`, and add an explicit `Copy Prompt` action within the lightbox overlay.
- Actions: Updated `src/screens/Library.tsx` to use `max-h-[calc(100vh-2rem)]` / `max-w-[calc(100vw-2rem)]` for the lightbox image (aspect ratio preserved), and added a lightbox-level `Copy Prompt` button with copied state + toast feedback; validated with `npm run build`.

## 2026-04-19 (Prompt Library lightbox — force top layer)

- Findings: The lightbox could render behind other overlays because its z-index was lower than the Prompt Details modal overlay.
- Conclusions: Increase the lightbox root z-index so it consistently sits above all current in-screen overlays.
- Actions: Updated `src/screens/Library.tsx` lightbox container from `z-[100]` to `z-[220]`; validated with `npm run build`.

## 2026-04-19 (Prompt Library lightbox — icon-only copy tooltip)

- Findings: The lightbox copy action showed explicit `Copy Prompt` text, while the preferred UI is icon-only with tooltip guidance.
- Conclusions: Keep the copy affordance compact by removing inline button text and exposing action state through `title` + `aria-label`.
- Actions: Updated `src/screens/Library.tsx` lightbox copy button to icon-only styling and dynamic tooltip/accessibility labels (`Copy prompt` / `Copied`); validated with `npm run build`.

## 2026-04-18 (Settings — stronger section headings)

- Findings: Settings section headings used the same `text-sm` sizing as the option labels inside each card, which made sections harder to distinguish.
- Conclusions: Introduce a dedicated reusable settings section title style and apply it only to the section headers so option typography stays unchanged.
- Actions: Updated `src/index.css` with a `settings-section-title` component class and applied it across `src/screens/Settings.tsx`; updated `nightcompanion.md`; validated with `npm run build`.

## 2026-04-03 (Generator — persist Prompt Builder state)

- Findings: Generator state was mostly persistent, but Prompt Builder tab fields reset after navigating away and back.
- Conclusions: Persist Prompt Builder UI state (field values + generated output/diff tab) to localStorage and hydrate on mount.
- Actions: Updated `src/screens/PromptBuilder.tsx` to save/restore parts values, separator, style profile selection, generated prompt, and diff tab state via `promptBuilderUiState` in localStorage; validated with `npm run build`.

## 2026-04-03 (UI — remove Generation Log page)

- Findings: The Generation Log page and its IPC functionality are no longer needed.
- Conclusions: Remove navigation + routing and detach the IPC/bridge surface so the feature cannot be accessed.
- Actions: Removed the `generation-log` screen from `src/App.tsx`, removed the sidebar nav item in `src/components/Sidebar.tsx`, removed Generation Log usage from `src/screens/Dashboard.tsx`, and removed `generationLog` IPC registration + preload/renderer bridge types in `electron/services/ipcRegistry.ts`, `electron/preload.ts`, and `src/types/electron.d.ts`; validated with `npm run build`.

## 2026-04-03 (Usage — category breakdown + most-used models)

- Findings: You wanted usage tracking split across four AI categories (generation, improvement, vision, research & reasoning) and to see which models are used most.
- Conclusions: Extend usage database schema with category field; group dashboard statistics by category and render top models per category.
- Actions: Updated usage schema in `src/db/schema.ts` to include category; extended Dashboard.tsx and corresponding query/grouping logic to break down usage by category and display top 3 models per category; validated with `npm run build`.

## 2026-04-05 (Prompt Library — Multiple Images + Seed Metadata)

- Findings: Prompt add/edit only supported a single image and there was no seed field, so image-specific generation context (model/seed) could not be captured.
- Conclusions: Store prompt images as a JSON array with per-image metadata (note, model, seed) and keep a cover image for backwards compatibility; add a prompt-level seed field.
- Actions: Added `images_json` + `seed` columns for prompts and prompt versions with a new migration; updated prompt IPC to persist multiple local images and metadata; updated PromptForm to edit multiple images and added a Seed field; updated Library cards to use the first image as cover; validated with `npm run build`.

## 2026-04-05 (Dashboard — Recent Images strip)

- Findings: Dashboard showed counts, recent prompts, and top characters, but not the most recent visual results.
- Conclusions: Fetch the latest Gallery image items and render them as a horizontal “recent images” strip linking to Gallery.
- Actions: Updated `src/screens/Dashboard.tsx` to load recent Gallery images and render a scrollable strip; invalidated the dashboard cache from Gallery mutations; validated with `npm run build`.

## 2026-04-05 (Generator — Greylist words persist)

- Findings: Greylist words added in Generator could be overwritten on startup because the initial “save” ran before the DB load completed.
- Conclusions: Only persist greylist changes after the initial greylist load finishes.
- Actions: Updated `src/screens/Generator.tsx` to gate greylist saving behind a `greylistLoaded` flag; validated with `npm run build`.

## 2026-04-06 (Dashboard → Gallery image navigation)

- Findings: Clicking on a recent image in the Dashboard only navigated to the Gallery page, but didn't open the specific image in the lightbox.
- Conclusions: Pass the selected image ID when navigating from Dashboard to Gallery, and have Gallery open that image in the lightbox on mount.
- Actions: Updated `src/screens/Dashboard.tsx` to pass `{ imageId: item.id }` as navigation params; updated `src/App.tsx` to support navigation params via `handleNavigate` and pass them to Gallery; updated `src/screens/Gallery.tsx` to accept `initialImageId` prop and auto-open the lightbox for that image; validated with `npm run build`.

## 2026-04-06 (Dashboard image click crash fix)

- Findings: Clicking a recent Dashboard image could crash the renderer when the lightbox opened while `images` was empty or an index was out of bounds.
- Conclusions: Guard lightbox navigation logic against empty image arrays and keep `initialIndex` within bounds.
- Actions: Updated `src/components/GalleryLightbox.tsx` to clamp/guard index navigation when `images.length === 0`; updated `src/screens/Gallery.tsx` to restore the `totalPages` calculation and stabilise lightbox opening dependencies; validated with `npm run build`.

## 2026-04-06 (Generator — reorder Improve Prompt + title + Suggested Model)

- Findings: The Generator page layout had the Suggested Model section above the Improve Prompt section, and the title/save controls were separated from the improvement flow.
- Conclusions: Place the Improve Prompt section above Suggested Model, and keep the title field + related buttons directly under Improve Prompt for a more logical workflow.
- Actions: Updated `src/screens/Generator.tsx` to move the Improve Prompt section above Suggested Model and position the title field + buttons under Improve Prompt; validated with `npm run build`.

## 2026-04-06 (Generator — improve prompt no longer replaces generated prompt)

- Findings: The Improve Prompt button was replacing the original generated prompt with the improved version, making it impossible to keep the original.
- Conclusions: Keep the original generated prompt intact and only show the improvement in the diff view, not replace the main prompt field.
- Actions: Updated `src/screens/Generator.tsx` `handleImprove` to remove `setGeneratedPrompt(nextPrompt)` so only `improvementDiff` is updated; validated with `npm run build`.

## 2026-04-06 (Generator sub-component extraction)

- Findings: Generator.tsx handled too many UI concerns in a single file, making maintenance difficult.
- Conclusions: Extract five focused child components (QuickstartPanel, ImprovementSection, ModelAdvisorCard, TitleSaveSection, GreylistCard) while keeping all state and handlers in Generator as orchestrator.
- Actions: Created `src/components/generator/QuickstartPanel.tsx`, `ImprovementSection.tsx`, `ModelAdvisorCard.tsx`, `TitleSaveSection.tsx`, `GreylistCard.tsx`; refactored `src/screens/Generator.tsx` to import and render them with prop-passing; validated with `npm run build`.

## 2026-04-06 (Prompt Builder — side-by-side Greylist + Max Words/Creativity + preset dropdown)

- Findings: Prompt Builder had Greylist and Max Words/Creativity controls in separate sections, and lacked preset dropdown functionality.
- Conclusions: Put Greylist and Max Words/Creativity cards side by side in a 2-column grid, and add preset dropdown to Prompt Builder header.
- Actions: Updated `src/screens/PromptBuilder.tsx` to add preset dropdown props and render it in header when available; added Max Words/Creativity display card; updated `src/screens/Generator.tsx` builder tab to use side-by-side layout and pass preset options; validated with `npm run build`.

## 2026-04-06 (Prompt Builder — reorganize controls to Max Words/Creativity panel)

- Findings: Prompt Builder had separate Max Words panel and header dropdowns, creating unnecessary UI clutter.
- Conclusions: Remove top Max Words panel, move preset and style profile dropdowns to the Max Words/Creativity panel for better organization.
- Actions: Removed Max Words panel from `src/screens/PromptBuilder.tsx`; moved preset and style profile dropdowns from header to Max Words/Creativity panel in `src/screens/Generator.tsx`; updated style profile prop types; validated with `npm run build`.

## 2026-04-06 (Prompt Builder — remove Max Words slider)

- Findings: Max Words slider was redundant on Prompt Builder page since maxWords is passed as a prop from Generator.
- Conclusions: Remove the Max Words slider from the Prompt Builder controls panel, keeping only Creativity controls.
- Actions: Removed Max Words slider and grid layout from `src/screens/Generator.tsx` builder tab, leaving only Creativity controls in the panel; validated with `npm run build`.

## 2026-04-06 (Prompt Builder — consolidate Max Words slider to settings panel)

- Findings: Prompt Builder had a separate Max Words panel and a settings panel with preset/style profile/creativity, creating UI duplication.
- Conclusions: Remove the separate Max Words panel and add the Max Words slider to the existing settings panel.
- Actions: Removed the first Max Words/Creativity panel from `src/screens/Generator.tsx` builder tab; added Max Words slider to the panel containing preset, style profile, and creativity controls; validated with `npm run build`.

## 2026-04-06 (Prompt Builder — add bottom margin to panels)

- Findings: Panels in Prompt Builder needed more spacing for better visual separation.
- Conclusions: Add 1rem bottom margin to both the Greylist and settings panels.
- Actions: Added `mb-4` class (1rem bottom margin) to both panel containers in `src/screens/Generator.tsx` builder tab; validated with `npm run build`.

## 2026-04-06 (Prompt Builder — move Max Words slider to Greylist panel)

- Findings: Max Words slider was in the settings panel, but would fit better with Greylist controls for better balance.
- Conclusions: Move Max Words slider to Greylist panel and ensure both panels have equal height.
- Actions: Moved Max Words slider from settings panel to a new card below GreylistCard; updated grid layout with `lg:items-stretch` and `flex flex-col h-full` for equal heights; validated with `npm run build`.

## 2026-04-06 (Prompt Builder — undo improved prompt selection)

- Findings: User requested to undo the recent improved prompt selection changes.
- Conclusions: Revert the Prompt Builder back to its previous state without the dual prompt display and selection functionality.
- Actions: Removed `selectedPromptType` state and `handleSaveGeneratedPromptToLibrary` function; reverted prompt display to single editable textarea with diff/final toggle for improved prompts; restored original copy functionality; validated with `npm run build`.

## 2026-04-06 (Prompt Form — add improved prompt selection)

- Findings: Prompt edit form needed functionality to select between original and improved prompts with uneditable fields.
- Conclusions: Add improved prompt display with checkboxes for selection to the PromptForm component, make both prompts uneditable, and allow only one selection at a time.
- Actions: Added `improvedPrompt` and `selectedPromptType` state to `src/components/PromptForm.tsx`; created new UI layout showing both original and improved prompts with radio-style checkboxes; made prompt fields `readOnly` with an editable field for the selected prompt; updated handleSubmit and PromptPreview to use selected prompt; validated with `npm run build`.

## 2026-04-06 (Prompt Library — prepare improved prompt indicators)

- Findings: Prompt library needs to show which prompt (original or improved) is selected on cards and overlay.
- Conclusions: Add placeholder comments and structure for improved prompt indicators when the database field exists.
- Actions: Added TODO comments in `src/screens/Library.tsx` for improved prompt indicators on prompt cards and in lightbox overlay; prepared structure for checkmark display when `improvedPrompt` field is added to schema; validated with `npm run build`.

## 2026-04-06 (Prompt Form — add image prompt selection)

- Findings: When uploading images to prompts, users need to select which prompt (original, improved, or custom) to use for each image.
- Conclusions: Add image-specific prompt selection functionality with a dialog for new uploads and inline controls for existing images.
- Actions: Added state for tracking image prompt selections and custom prompts in `src/components/PromptForm.tsx`; created image prompt selection dialog that appears after uploading images; added inline prompt selection UI for each image with radio buttons and custom prompt textarea; updated image upload flow to show prompt selection dialog; validated with `npm run build`.

## 2026-04-06 (Prompt Form — enhance image prompt dialog)

- Findings: Image prompt selection dialog was too small and lacked model selection capability.
- Conclusions: Make the dialog 50% larger and add a model selection dropdown for better UX.
- Actions: Updated dialog container from `max-w-md` to `max-w-2xl` and added `max-h-[90vh] overflow-y-auto` for larger size; added model selection dropdown with populated `modelOptions` in the dialog; enhanced dialog layout for better usability; validated with `npm run build`.

## 2026-04-06 (Prompt Form — add custom prompt option with disable logic)

- Findings: Prompt form needed a custom prompt option and proper disable logic when custom is selected.
- Conclusions: Add custom prompt option to the prompt selection and disable original/improved fields when custom is active.
- Actions: Added `customPrompt` state and updated `selectedPromptType` to include 'custom'; added custom prompt checkbox and editable textarea; implemented disable logic for original and improved prompt fields when custom is selected (disabled checkboxes, dimmed textareas, grayed labels); updated all prompt selection logic in handleSubmit, PromptPreview, and edit field to handle custom case; validated with `npm run build`.

## 2026-04-06 (Prompt Form — simplify image upload UX)

- Findings: Image upload flow added a post-upload popup for prompt/model selection and per-image prompt selection controls, which made the edit form too complex.
- Conclusions: Keep per-image metadata editing inline (model + seed), remove post-upload popups and per-image prompt selection, and keep a single optional Custom Prompt field directly after the read-only original prompt.
- Actions: Updated `src/components/PromptForm.tsx` to remove the image prompt selection dialog/state and remove prompt selection UI from the form; changed image “Generated By (Model)” to a `select` dropdown; kept `Custom Prompt` field after original prompt and updated submit/preview to use `customPrompt` when present (fallback to `promptText`); fixed resulting JSX mismatches; validated with `npm run build`.

## 2026-04-06 (Prompt Form — per-image prompt used checkmark)

- Findings: Prompt library images need an indicator for which prompt variant was used to generate each image.
- Conclusions: Add a per-image selector with checkmark-style options (Generated / Improved when available / Custom) and persist the choice in `imagesJson`.

## 2026-04-08 (Generator page — fix generate buttons and model display)

- Findings: Generator page generate buttons weren't working correctly and didn't display the accurate model being used for generation. The generation route (provider and model) wasn't being resolved correctly, and the enabled flag from AI dashboard role routing wasn't being respected.
- Conclusions: Update Generator.tsx to fetch both OpenRouter settings and AI configuration state, determine effective provider/model based on dashboard role routing's enabled state with fallback to OpenRouter, and enhance error handling. Update electron/ipc/ai.ts generator IPC handlers to respect enabled state of generation routes and include local auth headers.
- Actions: Updated `src/screens/Generator.tsx` `loadGenerationModel` to fetch OpenRouter settings and AI config state, determine `effectiveProviderId` and `effectiveModelId` based on dashboard role routing's enabled state with fallback to OpenRouter, and update state accordingly. Enhanced `handleQuickExpand` error handling to set status messages for empty responses, error objects, or no data. Updated `electron/ipc/ai.ts` in `generator:quickExpand`, `generator:simpleGenerate`, `generator:generatePromptFromFields`, and `generator:fillAllFields` IPC handlers to read dashboard role routing, determine selected provider/model based on routeEnabled, adjust conditional checks, update requestProvider/requestModel assignments, use selectedProviderId/selectedModelId in recordUsageEvent calls, and add local auth headers to fetch calls for local endpoints. Corrected advisor route selection check in `ai:requestModelAdvice` to use providerId/modelId directly. Removed duplicate declarations in quickExpand handler and added selectedProviderId/selectedModelId aliases in other generator handlers. Validated with `npm run build`.

## 2026-04-08 (Settings — fix OpenRouter API key save loop)

- Findings: Changing and saving the OpenRouter API key caused repeated "settings.json normalized and rewritten to disk" messages, indicating a normalization loop. The `normalizeStoredSettings` function was directly assigning the `openRouter` object without normalizing it, causing a mismatch between parsed and normalized versions that triggered repeated rewrites.
- Conclusions: Normalize the `openRouter` object in `normalizeStoredSettings` to prevent the normalization loop.
- Actions: Updated `electron/ipc/settings.ts` `normalizeStoredSettings` to call `normalizeOpenRouterSettings(input.openRouter)` instead of directly assigning `input.openRouter`. Validated with `npm run build`.

## 2026-04-08 (Settings — fix Windows EPERM when saving API key)

- Findings: Saving OpenRouter API key could still fail on Windows with `EPERM: operation not permitted, rename ...` while writing `settings.json`.
- Conclusions: Harden atomic settings writes for transient file locks by using unique temp filenames, retrying `rename`, and falling back to direct file write.
- Actions: Updated `electron/ipc/settings.ts` `atomicWriteSettingsFile` to use a per-write temp file (`.pid.timestamp.tmp`), retry `rename` on `EPERM`/`EACCES`/`EBUSY`, and fallback to `writeFile(settingsPath, contents, 'utf-8')` if rename remains blocked; validated with `npm run build`.
- Actions: Updated `src/components/PromptForm.tsx` to add `promptSource` to image drafts (stored in `imagesJson`), default to `generated` (with backwards-compat for stored `original`), show an inline checkmark selector per image, and conditionally show “Improved” when `improvedPrompt` is available; validated with `npm run build`.

## 2026-04-06 (usePromptImprovement shared hook)

- Findings: Generator and PromptBuilder duplicated the same improvement flow logic (IPC call, diff tracking, tab switching, PromptDiffView rendering).
- Conclusions: A shared hook eliminates duplication and ensures consistent improvement UX across both screens.
- Actions: Created `src/hooks/usePromptImprovement.ts`; refactored `src/components/generator/ImprovementSection.tsx` and `src/screens/PromptBuilder.tsx` to use it; updated `src/screens/Generator.tsx` to wire the shared improvement state into ImprovementSection and localStorage persistence; validated with `npm run build`.

## 2026-04-06 (Generator + PromptBuilder UI state migrated to Electron settings store)

- Findings: Generator and PromptBuilder UI state were the last remaining localStorage consumers, inconsistent with the established settings store architecture.
- Conclusions: Migrating to settings IPC aligns with existing patterns and eliminates renderer localStorage dependency for persistent data.
- Actions: Added `settings:getGeneratorUiState`, `settings:saveGeneratorUiState`, `settings:getPromptBuilderUiState`, `settings:savePromptBuilderUiState` IPC handlers in `electron/ipc/settings.ts`; exposed in `electron/preload.ts` + `src/types/electron.d.ts`; refactored `src/screens/Generator.tsx` and `src/screens/PromptBuilder.tsx` with one-time legacy migration and debounced settings store persistence; validated with `npm run build`.

## 2026-04-06 (Per-screen React error boundaries)

- Findings: A render error in any screen component caused the entire app to go blank with only the global ErrorBoundary catching it.
- Conclusions: Per-screen error boundaries provide granular error recovery without losing the rest of the app's state.
- Actions: Created `src/components/ScreenErrorBoundary.tsx` with error logging and recovery button; wrapped every screen in `src/App.tsx` with `ScreenErrorBoundary`; validated with `npm run build`.

## 2026-04-06 (Save original + improved prompt to Library)

- Findings: Only the final prompt text was saved to Library, losing the original AI-generated version and making it impossible to compare or trace prompt evolution.
- Conclusions: Adding an `original_prompt` column preserves the full generation lineage without changing the existing save flow.
- Actions: Added `original_prompt` to `prompts` and `prompt_versions` in `src/lib/schema.ts` with migration; updated `electron/ipc/prompts.ts` create/update to persist `originalPrompt` and include it in version snapshots; updated types in `src/types/index.ts` + `src/types/electron.d.ts` + `electron/preload.ts`; updated save flows in Generator and PromptBuilder to pass `originalPrompt` when an improvement diff exists; validated with `npm run build` and `npm run db:migrate`.

## 2026-04-07 (Generator Quickstart tab toggle fix)

- Findings: Switching Generator tabs could appear to do nothing because the settings UI-state hydration effect was re-running and resetting `tab` back to the persisted value.
- Conclusions: The hydration effect should only run once on mount; its dependencies must not include unstable objects.
- Actions: Updated `src/screens/Generator.tsx` to remove the unstable `promptImprovement` object from the hydration effect dependency list (depend only on the stable setter functions); validated with `npm run build`.

## 2026-04-07 (Flush debounced UI state saves on navigation)

- Findings: Navigating away from Generator (or Prompt Builder) within the 500ms debounce window could cancel the pending settings save, so returning to the screen rehydrated empty/default state.
- Conclusions: Debounced persistence must flush the latest UI state on unmount to guarantee navigation doesn’t drop state.
- Actions: Updated `src/screens/Generator.tsx` and `src/screens/PromptBuilder.tsx` to flush any pending debounced `settings.save*UiState` call during effect cleanup; validated with `npm run build`.

## 2026-04-07 (Quickstart AI model status indicator)

- Findings: On the Generator Quickstart view it wasn’t obvious whether the AI generation model was configured, leading to confusing failures when API settings were missing.
- Conclusions: A small status indicator provides immediate feedback without changing the existing generation flow.
- Actions: Updated `src/screens/Generator.tsx`, `src/components/generator/QuickstartPanel.tsx`, and `src/components/generator/ImprovementSection.tsx` to show AI status indicators (green dot + active model when configured, red dot + configuration prompt when missing) inside Magic Quickstart, Magic Random, and Improve Prompt panels; validated with `npm run build`.

## 2026-04-07 (Migrate notifications from Sonner to Mantine)

- Findings: The renderer used `sonner` (`toast.*` + `<Toaster />`) across multiple screens/components, but the project standard is to use Mantine Notifications.
- Conclusions: A full swap to Mantine keeps behaviour consistent while removing an unnecessary dependency.
- Actions: Wired `MantineProvider` + `<Notifications />` in `src/main.tsx` (with Mantine CSS); replaced all `toast.*` calls with `notifications.show(...)` across the renderer (screens, hooks, and components); removed `sonner` from dependencies; fixed a few input accessibility lints by adding `aria-label`/`title`/`placeholder`; validated with `npm run build`.

## 2026-04-08 (Persist style preset on prompts)

- Findings: Prompts saved from Generator/Prompt Builder did not persist the selected NightCafe style preset, so the Library couldn’t display which preset was used.
- Conclusions: Persisting `style_preset` alongside the prompt makes saved prompts more searchable and traceable without changing existing flows.
- Actions: Added `style_preset` to `prompts` + `prompt_versions` (migration `drizzle/0024_prompt_style_preset.sql` and journal update); wired field through `electron/ipc/prompts.ts` and shared renderer types; updated Generator + embedded Prompt Builder save-to-library to send the preset; displayed the preset on Prompt Library cards and in the prompt details popup; validated with `npm run db:migrate` and `npm run build`.

## 2026-04-08 (Add style preset to PromptForm)

- Findings: Creating/editing prompts from the Library modal (`PromptForm`) didn’t expose the `stylePreset` field, so it couldn’t be set or corrected there.
- Conclusions: Adding a preset selector + free text input in `PromptForm` keeps Library edits consistent with Generator/Prompt Builder saves.
- Actions: Updated `src/components/PromptForm.tsx` to load NightCafe presets via `nightcafePresets:list`, added a `Style Preset` field (select + text), restored it when restoring from prompt versions, and submit it via `stylePreset`; validated with `npm run build`.

## 2026-04-08 (Show style preset on cards and lightbox)

- Findings: Even with `stylePreset` persisted, it wasn’t visible in the image lightbox overlay or on prompt cards in all views.
- Conclusions: Showing the preset near other quick metadata (model/rating) makes it easy to confirm what was used without opening full details.
- Actions: Updated `src/screens/Library.tsx` lightbox overlay to display a `Preset: ...` pill when available; updated `src/components/PromptCard.tsx` to show the preset pill next to the model; validated with `npm run build`.

## 2026-04-08 (Library pagination/lightbox effect cleanup)

- Findings: ESLint flagged synchronous `setState` calls inside effects in `src/screens/Library.tsx` (page resets and lightbox visibility).
- Conclusions: Moving page reset/clamping logic into event handlers/derived values and keeping lightbox animation state within open/close handlers avoids unnecessary effect-driven state changes.
- Actions: Refactored `src/screens/Library.tsx` to remove page reset/clamp effects and drive `lightboxVisible` from `openLightbox`/`closeLightbox`; validated with `npm run build`.

## 2026-04-08 (Library popup cover scales + card actions under title)

- Findings: The prompt details popup cover image still felt smaller than the lightbox, and Library grid cards had action icons competing for space next to the title.
- Conclusions: A percent-based cover column with sensible min/max better matches the lightbox feel across window sizes, and moving card actions under the title improves title readability.
- Actions: Updated `src/screens/Library.tsx` popup cover column to a percent-based width with min/max constraints and ensured header actions stay pinned right; moved Library grid card action icons to render under the title; validated with `npm run build`.

## 2026-04-08 (Prompt details popup: rating + prompt layout)

- Findings: The prompt details popup was missing the star rating near the title, and the prompt/negative prompt fields were laid out side-by-side, which reduced readability.
- Conclusions: Showing rating next to the title mirrors the lightbox context, and stacking Negative Prompt beneath a full-width Prompt makes long text easier to read.
- Actions: Updated `src/screens/Library.tsx` to render the star rating next to the title in the popup header and make the Prompt span both columns with Negative Prompt beneath; validated with `npm run build`.

## 2026-04-09 (Settings: Greywords tab + weighted greylist)

- Findings: Greywords needed a dedicated Settings location and had to be confirmed as permanent (not session-only).
- Conclusions: Storing greywords in the database and exposing a Settings tab for editing weights keeps behaviour consistent across sessions and makes the feature discoverable.
- Actions: Added a Settings “Greywords” tab in `src/screens/Settings.tsx` to view/edit greywords and their weight (1–5); upgraded greylist persistence to store weighted entries (`entries_json`) via IPC (`electron/ipc/greylist.ts`) and updated generator flow to pass weighted entries to `generator:magicRandom`; added migration `drizzle/0025_greylist_weights.sql` + journal entry; updated preload/types accordingly; validated with `npm run build`.

## 2026-04-13 (Fix provider model selection reverting)

- Findings: On the “Configure your Providers” wizard, model selections appeared to not stick and would revert immediately.
- Conclusions: The selection handler persisted provider meta but did not update local React state, so controlled selectors rendered the previous values.
- Actions: Updated `src/screens/Settings/ProviderConfig/forms/ProviderConfigForm.tsx` `handleModelChange` to also update selected-model state before persisting; validated with `npm run build`.

## 2026-04-13 (AI overview reflects provider activation)

- Findings: After activating Vision / Research & Reasoning for OpenRouter in the provider wizard, the AI overview cards did not reflect the activation state.
- Conclusions: The dashboard header badges were not driven by the per-role active provider state.
- Actions: Updated `src/screens/Settings/Dashboard.tsx` to show Active/Inactive per role based on `activeGen`/`activeImprove`/`activeVision`/`activeResearch`; validated with `npm run build`.

## 2026-04-13 (Carry wizard model selections into AI dashboard)

- Findings: Model preferences chosen in the provider wizard (Vision / Research & Reasoning etc.) were saved to provider meta but not reflected in the AI dashboard model selectors.
- Conclusions: The AI dashboard uses a separate `roleRouting` state; it must prefer the active provider's role-specific model when the current routed model is missing/invalid.
- Actions: Updated `src/screens/AIConfig.tsx` to derive preferred model IDs from the active source per role and use them when normalising `roleRouting`; validated with `npm run build`.

## 2026-04-13 (Keep dashboard routing synced to provider preferences)

- Findings: Wizard model preferences and the dashboard routing could drift because the dashboard kept a previously valid model selection even when it differed from provider preferences.
- Conclusions: When a provider is selected for a role, the dashboard routing should follow that provider's role-specific preferred model to stay consistent with the wizard.
- Actions: Updated `src/screens/AIConfig.tsx` role routing normalisation to always sync to the provider's preferred model (or a safe fallback) and fixed hook dependencies; validated with `npm run build`.

## 2026-04-13 (Fix settings.json JSON parse crash)

- Findings: After saving the OpenRouter API key, the app could crash with `SyntaxError: Unexpected non-whitespace character after JSON`, indicating `settings.json` had trailing junk / partial writes.
- Conclusions: Settings persistence must be atomic and readers should salvage valid JSON where possible to prevent hard crashes.
- Actions: Updated `electron/ipc/settings.ts` to serialize and atomically write `settings.json` via temp file + rename and to salvage JSON on read; hardened `electron/ipc/ai.ts` and `electron/services/storagePaths.ts` to salvage JSON instead of crashing; validated with `npm run build`.

## 2026-04-13 (AI dashboard test buttons + LM Studio optional API key)

- Findings: There was no quick way to validate if the selected provider/model per role works from the AI dashboard, and LM Studio sometimes requires an auth header.
- Conclusions: Add a lightweight per-panel test action that triggers a minimal chat completion using the currently selected provider/model. Store an optional API key for LM Studio and include it as a Bearer header for local requests.
- Actions: Added optional `apiKey` for LM Studio local endpoint in `src/components/LocalEndpointCard.tsx`, persisted it through local endpoints storage/types (`src/screens/Settings/types.ts`, `src/types/electron.d.ts`, `electron/ipc/settings.ts`), added IPC `ai:testChatCompletion` + preload exposure (`electron/ipc/ai.ts`, `electron/preload.ts`), and added `Test` buttons to all four AI dashboard panels in `src/screens/Settings/Dashboard.tsx`; validated with `npm run build`.

## 2026-04-13 (Activate buttons + per-role latency on AI dashboard)

- Findings: Users needed explicit activation controls on all four AI dashboard panels and wanted latency shown directly under the Active/Inactive status.
- Conclusions: Activation should only be possible when both provider and model are selected; activation should run a connectivity test first and then persist role enabled state with measured latency.
- Actions: Updated `src/screens/Settings/Dashboard.tsx` to add `Activate` buttons for Generation/Improvement/Vision/Research & Reasoning, disable activation until provider+model are selected, run activation via probe test, persist `roleRouting.enabled`, and render per-role latency below status badges; validated with `npm run build`.

## 2026-04-13 (Generator final result word count + 110% improvement cap)

- Findings: On the Generator page, improved prompts needed a visible final-result word count and had to be limited so they can only be up to 10% longer than the configured Max Words slider value.
- Conclusions: Enforce the cap in Generator improvement flow (`ceil(maxWords * 1.1)`) after AI response and show a live final-result count against that cap in the Improvement section.
- Actions: Updated `src/screens/Generator.tsx` to cap improved prompt text to 110% of `maxWords`, override improvement diff with capped text when needed, and use capped text for auto-title flow/status; updated `src/components/generator/ImprovementSection.tsx` to accept `maxWords` and display `Final Result` word count as `current / cap`; validated with `npm run build`.

## 2026-04-13 (Persist AI dashboard model selection + protect greylist saves)

- Findings: Role model selections on AI Configuration could revert after navigation/reload, and greylist autosave could overwrite stored entries when load failed.
- Conclusions: Role routing normalization should keep a valid user-selected model instead of force-syncing to a provider “preferred” model; greylist autosave must be skipped when load errors occur to avoid destructive writes.
- Actions: Updated `src/screens/AIConfig.tsx` to stop overwriting valid `roleRouting` model selections during normalization; updated `src/screens/Generator.tsx` and `src/screens/Settings.tsx` with `greylistLoadError` guards so failed loads do not trigger overwrite saves; fixed related hook dependencies in `src/screens/Generator.tsx`; validated with `npm run build`.

## 2026-04-13 (Greylist last sync status indicator)

- Findings: Greylist sync state was not visible, making it hard to tell whether changes were loading, saving, saved, or failed.
- Conclusions: Surface sync state and last successful sync timestamp directly in the greylist UI in both Generator and Settings.
- Actions: Updated `src/components/generator/GreylistCard.tsx` to accept/render sync status text, updated `src/screens/Generator.tsx` and `src/screens/Settings.tsx` to track `greylistSyncStatus` + `greylistLastSyncedAt` and render human-readable status (`loading/saving/saved/failed`); validated with `npm run build`.

## 2026-04-13 (Keep AI routing persistent across app restarts)

- Findings: AI role routing selections could be overwritten during dashboard normalization when provider/model availability changed, causing apparent reset after exit/restart.
- Conclusions: Normalization should preserve previously saved provider/model for each role unless fields are empty, instead of force-falling back.
- Actions: Updated `src/screens/AIConfig.tsx` normalization logic to keep existing `providerId`/`modelId` when present and only use preferred/fallback values for empty fields; also removed stale unsupported props passed to `Dashboard` to satisfy type checks; validated with `npm run build`.

## 2026-04-14 (Fix Generator “Save to Library” reliability)

- Findings: Save on Generator could fail silently (no try/catch path for IPC failures) and required a manual title to be entered before the button could be used.
- Conclusions: Save flow should be resilient, provide clear status on failures, and allow saving with an automatic fallback title when a prompt exists.
- Actions: Updated `src/screens/Generator.tsx` save handler to validate prompt text, auto-derive title with `buildDefaultTitle(...)` when needed, normalize duplicate checks, and handle thrown IPC errors with explicit status; updated `src/components/generator/TitleSaveSection.tsx` to enable save whenever prompt text exists (title optional due fallback); validated with `npm run build`.

## 2026-04-14 (Add Generator save feedback toasts)

- Findings: Generator save feedback was only status-text based and easy to miss during workflow.
- Conclusions: Save outcomes should also trigger clear toast notifications for success, duplicates, and errors.
- Actions: Updated `src/screens/Generator.tsx` to show notification toasts for duplicate warning, save success, and save failures in `handleSaveToLibrary`; validated with `npm run build`.

## 2026-04-14 (Model Advisor: split conclusion vs thinking)

- Findings: AI advice text could mix reasoning and conclusion, making it hard to quickly see the recommended model while still reviewing detailed thinking.
- Conclusions: Keep the final suggestion visible in the main panel and move reasoning into a collapsible, cleaned-up "thinking process" section.
- Actions: Updated `src/components/generator/ModelAdvisorCard.tsx` to keep `recommendedModel` prominent, filter conclusion-like lines out of reasoning text, normalize reasoning lines for readability, and render them inside a collapsed `details` block labeled "AI thinking process"; validated with `npm run build`.

## 2026-04-14 (Model Advisor: suggested model fallback)

- Findings: Some AI advice responses provide recommendation text in the explanation but may not populate the structured `modelName`, causing the suggested-model row to appear empty.
- Conclusions: The UI should parse and display a suggestion fallback from explanation text so the conclusion remains visible.
- Actions: Updated `src/components/generator/ModelAdvisorCard.tsx` to extract `Recommended/Suggested model: ...` from reasoning as fallback display when `recommendedModel` is empty; kept reasoning collapsed and separate; validated with `npm run build`.

## 2026-04-14 (Model Advisor: reasons only, no thinking process)

- Findings: The advisor still exposed an explicit "thinking process" section, while the desired UI should only show the chosen model and concise reasons.
- Conclusions: Remove any thinking-process framing and render only a readable reasons list beneath the chosen model.
- Actions: Updated `src/components/generator/ModelAdvisorCard.tsx` to replace the collapsible "AI thinking process" block with a direct "Reason(s)" list and keep the chosen-model display/fallback logic; validated with `npm run build`.

## 2026-04-14 (AI Advisory Panel: show three model picks with reasons)

- Findings: The AI advisory panel only showed one model recommendation without displaying the cheap/balanced/premium options or their reasons.
- Conclusions: Display all three model picks (cheap, balanced, premium) with up to three reasons each, showing why each model was selected for its category.
- Actions: Updated `electron/ipc/ai.ts` with `BudgetPick` type and enhanced `computeBudgetPicks` to return model name plus up to 3 reasons per pick. Updated `src/types/electron.d.ts` with new `BudgetPick` type. Updated `Generator.tsx` to pass full budget pick objects. Rewrote `ModelAdvisorCard.tsx` to display three model pick cards (cheap/balanced/premium) in a grid with colored borders (emerald/amber/purple), each showing the model name and reasons list, plus a "Why [model] for [budget]?" section for the currently selected budget mode; validated with `npm run build`.

## 2026-04-15 (Rule-based Model Advisor: richer hints + deterministic ties)

- Findings: Rule-based model advisor returned the same model too often because AI-generated prompts use richer terms ("golden hour", "ethereal", "bokeh") that rarely matched the previous hint lists, resulting in 0-hit default weights.
- Conclusions: Expand hint vocab for realism/typography/art and add deterministic tie-breaking while keeping the existing scoring logic unchanged.
- Actions: Updated `electron/ipc/ai.ts` REALISM_HINTS / TYPOGRAPHY_HINTS / ART_HINTS to include richer prompt language, and added a tiebreaker sort by modelName for near-equal scores in `getRuleBasedRecommendation` (finalScore) and `computeBudgetPicks` (score); validated with `npm run build`.

## 2026-04-15 (Model Advisor AI-modus: shuffle modellijst + scherpere instructie)

- Findings: AI-modus gaf altijd hetzelfde model terug door vaste DB-volgorde van de modellijst en een te vage LLM-instructie.
- Conclusions: Shuffle + slice naar 60 modellen doorbreekt de volgorde-bias; expliciete score-interpretatie en anti-herhaling instructie sturen het LLM naar prompt-specifieke keuzes.
- Actions: shuffleArray helper toegevoegd; compactModels geshuffle en verkleind naar 60; advisorInstruction verscherpt met score-uitleg, budget-mapping en anti-default instructie in `electron/ipc/ai.ts`; validated with `npm run build`.

## 2026-04-15 (Per-screen React error boundaries)

- Findings: Een renderfout in een individueel scherm moet op schermniveau opgevangen worden zodat de rest van de app bruikbaar blijft.
- Conclusions: Een class-based `ScreenErrorBoundary` met generieke fallback en retry-knop per screen geeft gecontroleerde foutafhandeling zonder screen- of IPC-logica aan te passen.
- Actions: `src/components/ScreenErrorBoundary.tsx` bijgewerkt naar gevraagde `Props`-vorm, `componentDidCatch` logging via `console.error`, generieke fallback-UI met schermnaam en knop “Probeer opnieuw” (`setState({ hasError: false })`); bevestigd dat `src/App.tsx` alle gevraagde screens wrapped (Dashboard, Generator, Library, Characters, StyleProfiles, Gallery, Usage, Settings, AIConfig); validated with `npm run build`.

## 2026-04-15 (Generator.tsx refactor: sub-componenten + usePromptImprovement)

- Findings: `Generator.tsx` was te groot; improve-logica was gedupliceerd.
- Conclusions: Extractie vermindert agent-drift risico en verwijdert duplicatie.
- Actions: Bevestigd dat `QuickstartPanel.tsx`, `ModelAdvisorCard.tsx`, `TitleSaveSection.tsx` en `GreylistCard.tsx` zijn geëxtraheerd onder `src/components/generator/`; `usePromptImprovement` staat als shared hook in `src/hooks/usePromptImprovement.ts` en wordt gebruikt door zowel `Generator.tsx` als `PromptBuilder.tsx`; `Generator.tsx` fungeert als orkestratielaag zonder gedragswijziging; validated with `npm run build`.

## 2026-04-15 (Generator + Prompt Builder: clear-all knoppen per tab)

- Findings: Er was geen snelle manier om alle velden per tab leeg te maken (Quickstart vs Prompt Builder) zonder side-effects op de andere tab.
- Conclusions: Een per-tab “Clear all” knop die alleen tab-specifieke velden reset maakt itereren sneller en voorkomt onbedoelde resets elders.
- Actions: Added “Clear all” onder de Auto title toggle in Quickstart (reset quickstart input/output, diffs, title en model advice). Added “Clear all” in de Prompt Builder tab settings (reset style profile selectie en triggert embedded PromptBuilder clear via `clearNonce` prop). Updated `src/screens/Generator.tsx` en `src/screens/PromptBuilder.tsx`; validated with `npm run build`.

## 2026-04-15 (Quickstart: presets losgekoppeld + Magic Quickstart knop klikbaar)

- Findings: Preset dropdowns in Magic Quickstart en Magic Random zaten gekoppeld en de Magic Quickstart knop leek soms niet actief/klikbaar.
- Conclusions: Losse preset state per sectie voorkomt ongewenste sync; pointer-events op de status-indicator voorkomt click-blocking door overlay.
- Actions: Updated `src/components/generator/QuickstartPanel.tsx` om aparte presets te gebruiken voor Quickstart vs Magic Random en `pointer-events-none` toe te passen op de status-indicator overlays. Updated `src/screens/Generator.tsx` om `quickstartPreset`, `magicRandomPreset` en `builderPreset` apart te beheren en door te geven; validated with `npm run build`.

## 2026-04-15 (Quickstart: character dropdowns losgekoppeld)

- Findings: “Add character” selectie in Magic Quickstart en Magic Random deelde dezelfde state waardoor beide secties altijd synchroon waren.
- Conclusions: Losse character state per sectie voorkomt ongewenste sync en houdt context-specifieke keuzes intact.
- Actions: Updated `src/components/generator/QuickstartPanel.tsx` om aparte character pickers te gebruiken voor Quickstart vs Magic Random. Updated `src/screens/Generator.tsx` om `quickstartCharacterId` en `magicRandomCharacterId` apart te beheren en legacy `quickStartCharacterId` te migreren; validated with `npm run build`.

## 2026-04-15 (Magic Random: voorkom “cut-off” prompt)

- Findings: Magic Random output leek soms afgekapt, vooral bij langere prompts (bijv. met preset/character context).
- Conclusions: Forceer een complete zin-einde in de generatie-instructie en maak de preview hoger/scrollbaar zodat langere output zichtbaar blijft.
- Actions: Updated `electron/ipc/ai.ts` `generator:magicRandom` prompt-instructie om te eindigen met een complete zin en final full stop. Updated `src/components/generator/QuickstartPanel.tsx` Magic Random preview textarea met meer hoogte en scroll (`rows=6`, `min-h-44`, `overflow-y-auto`); validated with `npm run build`.

## 2026-04-15 (Improve Prompt: voorkom “cut-off” eindes)

- Findings: Improved prompts konden soms mid-zin eindigen wanneer de verbeterde output boven de 110% word-limit kwam en daarna hard werd afgekapt.
- Conclusions: Laat de model-instructie expliciet eindigen met een volledige zin én zorg dat de client-side word-limit truncatie altijd op een zin-einde eindigt (of een punt toevoegt).
- Actions: Updated `electron/ipc/ai.ts` `IMPROVE_INSTRUCTION` met “end with a complete sentence and a final full stop”. Updated `src/screens/Generator.tsx` truncatiepad voor improved prompt zodat het resultaat op zin-einde afsluit. Validated with `npm run build`.

## 2026-04-15 (Security: ReDoS-safe title normalisatie)

- Findings: `normalizeGeneratedTitle` gebruikte een regex die door backtracking potentieel super-lineair kan worden op kwaadaardige input.
- Conclusions: Vervang de regex door een lineaire, character-based strip van omringende quotes om ReDoS/DoS te voorkomen.
- Actions: Updated `electron/ipc/ai.ts` `normalizeGeneratedTitle` om outer-quote stripping zonder regex uit te voeren; validated with `npm run build`.

## 2026-04-15 (Settings: exportfunctie voor prompts en afbeeldingen)

- Findings: Er was geen centrale exportoptie in Settings om prompts en bijbehorende lokale afbeeldingen in één keer te backuppen.
- Conclusions: Een Settings-exportactie via IPC met folderpicker, JSON-export en image-copy geeft een veilige, bruikbare backup zonder nieuwe dependencies.
- Actions: Added `settings:exportPromptsAndImages` in `electron/ipc/settings.ts` met opties `{ includePrompts, includeImages }` (select folder, export `prompts` + `prompt_versions` naar JSON, kopie van lokale `file://`/absolute image paths naar `images/` met samenvatting). Exposed via `electron/preload.ts` en `src/types/electron.d.ts`. Added UI in `src/screens/Settings.tsx` met knoppen voor “prompts + images”, “prompts only” en “images only” en betere foutmelding als de app nog niet herstart is na een update; validated with `npm run build`.

## 2026-04-15 (Settings: database backup)

- Findings: Er ontbrak een eenvoudige backup-optie voor de volledige database vanuit Settings.
- Conclusions: Een JSON snapshot backup via IPC (folderpicker + export van alle tabellen) biedt een praktische backup zonder externe tooling of dependencies.
- Actions: Added `settings:backupDatabase` in `electron/ipc/settings.ts` (export alle tabellen naar `db-backup.json`). Exposed via `electron/preload.ts` en `src/types/electron.d.ts`. Added Settings UI knop “Backup database” met statusmelding; validated with `npm run build`.

## 2026-04-15 (Prompt Builder: Magic Fill parsing robuuster)

- Findings: Magic Fill leek te draaien zonder zichtbare updates wanneer het model JSON in onverwachte vorm terugstuurde (bijv. code fences, key aliases of `fields` wrapper).
- Conclusions: Robuuste response parsing met key-normalisatie en JSON-extractie voorkomt “filled but no visible change” gedrag.
- Actions: Updated `electron/ipc/ai.ts` `generator:fillAllFields` met één gedeelde parser die JSON (incl. fenced JSON) en line-fallback ondersteunt, aliases/case-insensitive keys normaliseert (`artStyle` -> `style`, `technicalDetails` -> `technical`, etc.) en daarna pas de result fields invult. Updated `src/screens/PromptBuilder.tsx` om Magic Fill results in één `setParts` update toe te passen en een duidelijke waarschuwing te tonen als er geen bruikbare tekst terugkomt; validated with `npm run build`.

## 2026-04-15 (Settings: Greywords tab opgeschoond + General panel indeling)

- Findings: Greywords tab bevatte niet-verwante instellingen doordat algemene settings/diagnostics onder de tab-layout doorliepen.
- Conclusions: Houd Greywords tab beperkt tot greywords opties; consolideer alle overige settings op General met aparte panelen voor scanbaarheid.
- Actions: Updated `src/screens/Settings.tsx` zodat Greywords tab alleen greywords beheer toont; General tab gegroepeerd in losse panels (Usage, Diagnostics, Storage, Export library, Backup database, NightCafe modelcards, Danger zone); validated with `npm run build`.

## 2026-04-15 (Settings: herstel corrupte settings.json automatisch)

- Findings: Bij corrupte/halfgeschreven `settings.json` faalde parsing en viel de app telkens terug naar defaults zonder het bestand te herstellen.
- Conclusions: Bij parse failure moet de app het corrupte bestand backuppen en een schone default settings.json schrijven; bij salvage moet altijd herschreven worden.
- Actions: Updated `electron/ipc/settings.ts` `readStoredSettings` om BOM te strippen, salvage-detectie toe te passen, corrupte settings.json te backuppen (`settings.json.corrupt.<timestamp>`) en defaults atomisch terug te schrijven; validated with `npm run build`.

## 2026-04-18 (AI Configuration settings naar database)

- Findings: AI Configuration state (OpenRouter, provider-meta, local endpoints en dashboard routing) werd alleen in `settings.json` opgeslagen, terwijl de app al PostgreSQL/Drizzle gebruikt.
- Conclusions: Een singleton DB-tabel voor AI Configuration maakt opslag consistenter, beter backupbaar en minder afhankelijk van bestandsschrijfacties.
- Actions: Added `ai_configuration_settings` in `src/lib/schema.ts` plus migration `drizzle/0026_ai_configuration_settings.sql` en journal entry; refactored `electron/ipc/settings.ts` zodat `get/saveOpenRouter`, `get/saveProviderMeta`, `get/saveLocalEndpoints`, `get/saveAiConfigState` en gerelateerde reads DB-first zijn met fallback/migratie vanaf `settings.json`; updated `electron/main.ts` om DB-aware settings readers te gebruiken; uitgebreid `settings:backupDatabase` met `ai_configuration_settings`; validated with `npm run build`.

## 2026-04-18 (Settings headings — orange accent kleur)

- Findings: Sectiekoppen op de Settings-pagina waren nog wit en misten de visuele accentkleur van de app.
- Conclusions: Gebruik de bestaande amber accentkleur voor settings-sectiekoppen voor betere visuele hiërarchie en design-consistentie.
- Actions: Updated `src/index.css` `settings-section-title` van `text-white` naar `text-amber-400`; validated with `npm run build`.

## 2026-04-18 (AI Improve Prompt — BASE_PERSONA vernieuwd)

- Findings: De bestaande BASE_PERSONA voor promptgeneratie was NightCafe-gericht en relatief formulaïsch, terwijl de gewenste improve-flow meer variatie en expliciete stijlvrijheid nodig heeft.
- Conclusions: Een compactere persona met expliciete UK English, single-paragraph output en variabele compositie/stijl richtlijnen geeft consistenter gedrag voor de Improve Prompt route.
- Actions: Replaced `BASE_PERSONA` in `electron/ipc/ai.ts` met de nieuwe creatieve versie (single paragraph, no labels/bullets/explanations, varied framing/style guidance); validated with `npm run build`.

## 2026-04-18 (Improve Prompt variation modes)

- Findings: Generated prompts lacked variation due to a prescriptive BASE_PERSONA and hardcoded temperature in improvePrompt. No mode choice was offered to the user.
- Conclusions: BASE_PERSONA softened to encourage stylistic variety. Three improvement modes added (Expand / Reframe / Intensify) with per-mode temperature and instruction. Mode selector added as pill UI in ImprovementSection.
- Actions: Updated BASE_PERSONA in `electron/ipc/ai.ts`; added IMPROVE_INSTRUCTIONS and IMPROVE_TEMPERATURES records; extended improvePrompt handler to accept and apply mode; updated IPC types in preload and electron.d.ts; added pill mode selector in ImprovementSection.tsx (positive prompt only, session state).

## 2026-04-18 (Sidebar icon kleuren)

- Findings: Iconen in de linker sidebar hadden een neutrale kleur waardoor navigatie-items minder visueel onderscheid hadden.
- Conclusions: Per navigatie-item een bestaande accentkleur toepassen geeft snellere scanbaarheid zonder layoutwijzigingen.
- Actions: Updated `src/components/Sidebar.tsx` met `iconColorClass` per item en actieve/inactieve icon-state op basis van die accentkleur; validated with `npm run build`.

## 2026-04-18 (Prompt Library image gallery in lightbox)

- Findings: In Prompt Library werd bij prompts met meerdere afbeeldingen slechts één coverafbeelding in de lightbox getoond.
- Conclusions: De lightbox moet als galerij werken per prompt, met doorlopen naar de volgende prompt nadat de laatste afbeelding is bereikt.
- Actions: Updated `src/screens/Library.tsx` met prompt-image galerijstate (`promptIndex` + `imageIndex`), pijlnavigatie (buttons + keyboard), image counter en automatische doorgang naar de volgende prompt na de laatste afbeelding; validated with `npm run build`.

## 2026-04-18 (Library crash fix: filteredPrompts initialisatie)

- Findings: Prompt Library crashte met `ReferenceError: Cannot access 'filteredPrompts' before initialization` door gebruik van `filteredPrompts` in lightbox callbacks vóór declaratie.
- Conclusions: Afgeleide filterdata moet vóór lightbox callbacks worden gedeclareerd om TDZ-initialisatiefouten te vermijden.
- Actions: Reordered `allModels`, `allTags` en `filteredPrompts` declaraties in `src/screens/Library.tsx` zodat callbacks en memo's ze pas na initialisatie gebruiken; validated with `npm run build`.

## 2026-04-18 (Bug fix: computeBudgetPicks altijd hetzelfde model)

- Findings: AI advice gaf voor alle drie de budget-categorieën (cheap/balanced/premium) hetzelfde model (3D Animation Diffusion v10) terug. Oorzaak: computeBudgetPicks filterde niet op costTier vóór de scoring, waardoor een model met hoge quality-score én lage costTier ook de balanced- en premium-categorie won via de zachte penalty (die voor premium altijd 0 is).
- Conclusions: Harde costTier-filter per budget-modus vóór de .map() zorgt dat cheap alleen costTier ≤ 2 en balanced alleen costTier ≤ 3 overweegt; premium blijft onbeperkt. De zachte penalty-logica blijft als tiebreaker behouden.
- Actions: electron/ipc/ai.ts — in computeBudgetPicks / scoreFor een candidateModels-filter toegevoegd vóór de scoring-map; de bestaande penalty-logica en sort ongewijzigd gelaten; validated with npm run build.

## 2026-04-18 (Bug fix: parseCostTier herkent dollar-teken notatie niet)

- Findings: computeBudgetPicks gaf nog steeds hetzelfde model voor alle drie de budget-categorieën, ondanks de eerder toegevoegde harde costTier-filter. Oorzaak: parseCostTier kon de CSV-notatie met dollar-tekens ($$$$) niet parsen — parseInt('$$$$') levert NaN, de string-checks matchen niet, en de fallback is altijd 2. Hierdoor kregen alle modellen costTier 2 en kwamen ze door alle drie filters.
- Conclusions: Dollar-teken notatie ($ t/m $$$$$) toevoegen als eerste check: lengte van de $-string = costTier (1–5). De bestaande numerieke en string-checks blijven als fallback behouden.
- Actions: electron/ipc/ai.ts — parseCostTier uitgebreid met /^\$+$/ regex-check vóór de parseInt; validated with npm run build.

## 2026-04-18 (Prompt Library: image-level custom prompt + lightbox label)

- Findings: In het Prompt Library edit-formulier stond een globale Custom Prompt, terwijl de gewenste flow een optionele custom prompt per afbeelding is. In de lightbox was bovendien niet zichtbaar of de getoonde prompt image-specifiek custom was.
- Conclusions: Verplaats custom prompt van prompt-niveau naar image-niveau met een checkmark-toggle per uploadkaart. Toon bij custom images in de lightbox de image-specifieke prompttekst en een duidelijke `Custom` overlay linksboven.
- Actions: Updated `src/components/PromptForm.tsx` (globale Custom Prompt verwijderd; per-image checkmark + custom prompt textarea), `electron/ipc/prompts.ts` + `src/lib/schema.ts` + `src/types/index.ts` + `src/types/electron.d.ts` (image metadata uitgebreid met `promptSource`/`customPrompt`), en `src/screens/Library.tsx` (lightbox gebruikt image metadata, toont custom prompttekst + `Custom` badge linksboven); validated with `npm run build`.

## 2026-04-18 (Hotfix: PromptForm customPrompt runtime error)

- Findings: Prompt Library edit-form crashte met `ReferenceError: customPrompt is not defined` in `PromptForm` preview-sectie nadat de globale custom prompt state was verwijderd.
- Conclusions: Alle resterende verwijzingen naar de verwijderde globale variabele moeten terugvallen op `promptText`.
- Actions: Updated `src/components/PromptForm.tsx` `PromptPreview` props (`promptText` en `saveDisabled`) om alleen `promptText` te gebruiken; validated with `npm run build`.

## 2026-04-18 (Hotfix: image custom prompt field closes during edit)

- Findings: In Prompt Library edit-form sloot het image-level `Custom Prompt` veld direct wanneer de inhoud tijdelijk leeg werd gemaakt (Delete/Backspace) en kon dit ook optreden tijdens plakacties met Ctrl+V.
- Conclusions: Het veld mag tijdens bewerken niet automatisch terugschakelen naar `generated`; alleen de expliciete toggle-knop mag de mode wisselen.
- Actions: Updated `src/components/PromptForm.tsx` textarea `onChange` voor image custom prompts zodat `promptSource` tijdens input altijd `custom` blijft; validated with `npm run build`.

## 2026-04-18 (Lightbox: used model from image metadata + overlay layering)

- Findings: In de Prompt Library lightbox werd `Used model` getoond op basis van prompt-level modeldata, niet op basis van de geselecteerde afbeelding. Daarnaast kon de model-overlay visueel achter de lightbox-afbeelding vallen door gelijke z-index.
- Conclusions: `Used model` moet primair uit image-level metadata (`imagesJson[].model`) komen, met prompt-level fallback voor oudere records. De model-overlay moet een hogere z-index hebben dan de lightbox-afbeelding.
- Actions: Updated `src/screens/Library.tsx` door `getPromptImages` uit te breiden met `model`, `lightboxImage.model` te koppelen aan de geselecteerde afbeelding, en de `Used model` overlay naar `z-[103]` te verhogen; validated with `npm run build`.

## 2026-04-20 (Security hardening: linear normalizeBaseUrl)

- Findings: `normalizeBaseUrl` gebruikte een regex (`/\/+$/`) om trailing slashes te verwijderen. Dit patroon werd gemarkeerd als potentieel kwetsbaar voor super-lineaire runtime/backtracking in ongunstige gevallen.
- Conclusions: Een expliciete karakter-scan vanaf het stringeinde verwijdert trailing slashes in gegarandeerd lineaire tijd zonder regex-engine/backtracking.
- Actions: Updated `electron/ipc/ai.ts` door `normalizeBaseUrl` te herschrijven naar een `while`-lus met `charCodeAt(... ) === 47` en `slice`; validated with `npm run build`.

## 2026-04-20 (TypeScript 6 baseUrl deprecation warning)

- Findings: TypeScript meldt dat `baseUrl` gedeprecieerd is en in TypeScript 7.0 stopt met werken zonder expliciete deprecation handling.
- Conclusions: De aanbevolen project-brede mitigatie is `ignoreDeprecations: "6.0"` in compilerOptions, zodat huidige alias-configuratie intact blijft tijdens migratieplanning.
- Actions: Updated `tsconfig.json` met `"ignoreDeprecations": "6.0"` naast bestaande `baseUrl`/`paths`; validated with `npm run build`.

## 2026-04-20 (Electron TS config: consistent file name casing)

- Findings: `tsconfig.electron.json` miste `forceConsistentCasingInFileNames`, wat op mixed-OS teams import-padproblemen kan verbergen.
- Conclusions: Deze compiler-optie moet expliciet aan staan voor stabiele casing-validatie over Windows/macOS/Linux.
- Actions: Updated `tsconfig.electron.json` door `"forceConsistentCasingInFileNames": true` toe te voegen onder `compilerOptions`; validated with `npm run build`.

## 2026-04-20 (Docs lint: MD041 top-level heading)

- Findings: `nightcompanion.md` startte met een `##`-heading, waardoor markdownlint regel MD041 (`first-line-h1`) faalde.
- Conclusions: Een expliciete eerste-regel H1 voorkomt lintfouten en maakt documentstructuur consistenter.
- Actions: Updated `nightcompanion.md` door bovenaan `# NightCompanion` toe te voegen; validated with `npm run build`.

## 2026-04-20 (Migration type update: VARCHAR2)

- Findings: In `drizzle/0000_thankful_quentin_quire.sql` stonden kolommen met `varchar` terwijl de gewenste datatype-notatie `VARCHAR2` is.
- Conclusions: Voor deze migratie moeten alle `varchar(...)` definities uniform naar `VARCHAR2(...)` worden gezet.
- Actions: Updated `drizzle/0000_thankful_quentin_quire.sql` door `title`, `model`, `name` en `preferred_model` van `varchar` naar `VARCHAR2` te wijzigen; validated with `npm run build`.

## 2026-04-20 (Lint fix: merge duplicate electron imports)

- Findings: `electron/ipc/ai.ts` importeerde `electron` meerdere keren (`import { ipcMain } ...` en `import { app } ...`), wat lintregel `typescript:S3863` triggert.
- Conclusions: Imports vanuit hetzelfde modulepad moeten samengevoegd worden in een enkele import-declaratie.
- Actions: Updated `electron/ipc/ai.ts` naar `import { app, ipcMain } from 'electron'`; validated with `npm run build`.

## 2026-04-20 (Library: improved prompt indicator)

- Findings: In `src/screens/Library.tsx` ontbraken visuele indicators voor prompts die via de improve-flow zijn opgeslagen, ondanks bestaande TODO-markers.
- Conclusions: Een compacte `Improved` badge op zowel kaartniveau als in de lightbox-header maakt meteen zichtbaar dat een prompt verbeterde inhoud heeft.
- Actions: Added `hasImprovedPrompt(...)` helper in `src/screens/Library.tsx`, wired `isImprovedPrompt` into `lightboxImage`, and rendered `Improved` badges in card and lightbox title rows; updated `nightcompanion.md`; validated with `npm run build`.

## 2026-04-20 (App menu: overige menu's hersteld)

- Findings: In `electron/main.ts` stond een minimale menubalk met alleen `Edit`, waardoor de overige standaardmenu's niet zichtbaar waren.
- Conclusions: Een platform-standaard menu-template (`fileMenu`, `editMenu`, `viewMenu`, `windowMenu`, plus `appMenu` op macOS) herstelt de verwachte menubalk zonder custom onderhoud.
- Actions: Updated `electron/main.ts` met een volledige `Menu.buildFromTemplate(...)` configuratie in plaats van Edit-only; updated `nightcompanion.md`; validated with `npm run build`.

## 2026-04-21 (UI language standardization + sidebar switcher)

- Findings: De UI bevatte gemixte Engelse en Nederlandse teksten zonder centrale taalkeuze, wat inconsistent gedrag gaf.
- Conclusions: Engels moet de standaardtaal zijn met optionele Nederlandse vertaling, beheerd via een centrale language-context en opgeslagen in bestaande `aiConfig` settings-state.
- Actions: Added `src/contexts/LanguageContext.tsx` (English default, Dutch translations), extended `AiConfigStateStore` met `appLanguage` in `electron/ipc/settings.ts`, `electron/preload.ts` en `src/types/electron.d.ts`, wired persistence/loading in `src/App.tsx`, added `English`/`Nederlands` switcher in `src/components/Sidebar.tsx`, and localized mixed Library UI strings/toasts in `src/screens/Library.tsx`; updated `nightcompanion.md`; validated with `npm run build`.

## 2026-04-21 (Language rollout: broader app coverage)

- Findings: Na de eerste i18n-stap bleven nog gemixte NL/EN UI-teksten zichtbaar in Dashboard, ScreenErrorBoundary en Settings-status/toastteksten.
- Conclusions: Voor een consistente app-brede default naar Engels moeten ook deze resterende tekstbronnen taalafhankelijk worden gemaakt op basis van dezelfde `appLanguage` state.
- Actions: Updated `src/contexts/LanguageContext.tsx` met extra keys, localized `src/screens/Dashboard.tsx`, made `src/components/ScreenErrorBoundary.tsx` language-aware via prop vanuit `src/App.tsx`, and localized remaining mixed Settings feedback messages in `src/screens/Settings.tsx`; updated `nightcompanion.md`; validated with `npm run build`.

## 2026-04-21 (Language switcher: page text now changes visibly)

- Findings: Gebruikersfeedback gaf aan dat de taal van pagina's niet zichtbaar wijzigde via de sidebar-switcher, omdat meerdere schermen nog statische headers/labels gebruikten.
- Conclusions: Naast context/persistence moet ook de zichtbare page chrome (titels, subtitels en primaire labels) op alle hoofdschermen aan de language context worden gekoppeld.
- Actions: Extended translation keys in `src/contexts/LanguageContext.tsx`; localized primary page text in `src/screens/Generator.tsx`, `src/screens/Usage.tsx`, `src/screens/StyleProfiles.tsx`, `src/screens/Gallery.tsx`, `src/screens/Characters.tsx`, `src/screens/Settings.tsx`, and `src/screens/Settings/Dashboard.tsx`; updated `nightcompanion.md`; validated with `npm run build`.

## 2026-04-21 (Dashboard: Top Characters image overlay cards)

- Findings: In de Dashboard `Top Characters` sectie werden afbeeldingen klein als avatar getoond, terwijl de gewenste presentatie een grotere image card met overlay-informatie is.
- Conclusions: Een compacte tile met vaste/maximale hoogte en een bottom gradient-overlay maakt de character-afbeelding visueel leidend en houdt naam/beschrijving leesbaar.
- Actions: Updated `src/screens/Dashboard.tsx` zodat `Top Characters` items renderen als `h-28 max-h-28` image tiles met naam + beschrijving als overlay; updated `nightcompanion.md`; validated with `npm run build`.

## 2026-04-21 (Dashboard: Top Characters 1/3 width)

- Findings: De gewenste verdeling is dat `Top Characters` 1/3 van de rij inneemt (en `Recent Prompts` 2/3), in plaats van gelijke breedte.
- Conclusions: Een `xl:grid-cols-3` layout met `Recent Prompts` op `xl:col-span-2` en `Top Characters` op één kolom levert exact de 2/3-1/3 verhouding.
- Actions: Updated `src/screens/Dashboard.tsx` van `xl:grid-cols-2` terug naar `xl:grid-cols-3` en `Recent Prompts` naar `xl:col-span-2`; updated `nightcompanion.md`; validated with `npm run build`.

## 2026-04-21 (Generator model advisor: explicit AI-only flow)

- Findings: The Generator auto-ran rule-based model advice after prompt generation, and the explicit AI advice action still reused rule-based budget picks, which made the advisor cards look stuck on defaults.
- Conclusions: Model advice should stay empty until explicitly requested, and explicit AI advice should be able to supply the cheap/balanced/premium cards instead of always defaulting to local scoring.
- Actions: Updated `src/screens/Generator.tsx` to clear stale advisor state instead of auto-requesting rule advice, extended `electron/ipc/ai.ts` so AI advisor responses can include cheap/balanced/premium picks with rule-based fallback only when omitted, and updated `electron/ipc/settings.ts` to persist and normalise advisor budget picks correctly; validated with `npm run build`.

## 2026-04-21 (Prompt Library absorbs Gallery)

- Findings: The standalone Gallery overlapped heavily with Prompt Library, while most of the image-management workflow could be reused without a separate top-level destination.
- Conclusions: The cleanest simplification is to keep one saved-content area and split it into `Prompts` and `Media` views, while preserving the existing gallery implementation under the hood.
- Actions: Updated `src/screens/Library.tsx` with a `Prompts | Media` switch and embedded `src/screens/Gallery.tsx`, updated `src/screens/Gallery.tsx` to support embedded mode, removed Gallery from `src/components/Sidebar.tsx`, redirected image browsing from `src/App.tsx` and `src/screens/Dashboard.tsx` into Library media view, and added the new Library view labels in `src/contexts/LanguageContext.tsx`; validated with `npm run build`.

## 2026-04-21 (Prompt Library: style preset moved to image metadata)

- Findings: In the Prompt Library edit form, Style Preset was only available as a global prompt field while uploaded images already store per-image generation metadata.
- Conclusions: Style preset selection should live inside each uploaded image block so presets can be attached per image; keep prompt-level `stylePreset` compatibility by deriving it from the cover image preset.
- Actions: Updated `src/components/PromptForm.tsx` to remove the global Style Preset field and add per-image style preset controls in the image subform; updated image metadata typing and normalization in `src/types/index.ts`, `src/types/electron.d.ts`, `src/lib/schema.ts`, and `electron/ipc/prompts.ts`; updated lightbox style-preset sourcing in `src/screens/Library.tsx` to prefer selected-image metadata with prompt fallback; validated with `npm run build`.

## 2026-04-21 (Prompt Library lightbox: foreground layering + wider counter pill)

- Findings: Some lightbox UI controls could visually end up behind/on the same layer as the main image, and the image counter pill could render cramped for values like `3 / 3`.
- Conclusions: Keep the main image on a lower z-layer and raise all interactive/overlay UI layers consistently; make the counter pill wider with non-wrapping, tabular numerals.
- Actions: Updated `src/screens/Library.tsx` lightbox z-index assignments so controls/overlay cards render in front of the image, lowered the main image layer, and widened the counter pill with `min-w`, `whitespace-nowrap`, and `tabular-nums`; validated with `npm run build`.

## 2026-04-21 (Prompt Library cards: cover-image model and preset)

- Findings: The card footer in Prompt Library still showed the negative prompt snippet, while users need quick access to metadata tied to the shown cover image.
- Conclusions: Replace the footer negative prompt line with image-level metadata and source values from the cover image (`imagesJson[0]`) with prompt-level fallback for older records.
- Actions: Updated `src/screens/Library.tsx` to remove the negative prompt/footer message and render `Used model` plus `Preset` from the current cover image metadata (fallback to prompt-level fields); validated with `npm run build`.

## 2026-04-21 (Gallery lightbox: larger media viewport + prompt toggle panel)

- Findings: Gallery lightbox media area was constrained (`~70vh`) and prompt text was rendered in an inline section that competed with metadata layout.
- Conclusions: Increase usable media space to near-viewport maximum while preserving aspect ratio; keep title/model/preset visible in metadata and move prompt into a dedicated toggle panel.
- Actions: Updated `src/components/GalleryLightbox.tsx` to use dynamic near-viewport max-height classes with `object-contain`, derive and render `Used model` + `Used preset` from the shown item/connected prompt metadata, and replace the old inline prompt block with a dedicated toggleable prompt panel; updated `src/screens/Gallery.tsx` to pass `promptOptions` into the lightbox for connected-prompt metadata lookup; validated with `npm run build`.

## 2026-04-21 (Gallery lightbox: centered info card + strict no-crop media fit)

- Findings: The Gallery lightbox metadata remained at the bottom flow area instead of a centered overlay (Prompt Library style), and media sizing needed to prioritize maximum fit without any cropping.
- Conclusions: Render metadata/prompt controls in a centered overlay card and keep media constrained with full-fit `object-contain` sizing (`max-h/max-w`) so nothing is cut off.
- Actions: Updated `src/components/GalleryLightbox.tsx` to place title/rating/model/preset/date and prompt controls inside a centered bottom overlay card, while setting media container sizing to full available viewport area with `object-contain` and no crop behavior; validated with `npm run build`.

## 2026-04-21 (Gallery lightbox: correct image model source + prompt under title)

- Findings: `Used model` in the Gallery lightbox could show a connected-prompt fallback instead of the model attached to the shown image item, and prompt controls were positioned away from the title.
- Conclusions: `Used model` must come directly from the current image item metadata, and prompt toggle/copy controls should be placed directly below the title for clearer hierarchy.
- Actions: Updated `src/components/GalleryLightbox.tsx` to derive `usedModel` only from `currentItem.model` and moved prompt controls under the title within the centered overlay card; validated with `npm run build`.
