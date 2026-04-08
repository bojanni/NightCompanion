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
