# Walkthrough

## 2026-03-28 (AI config — add Research & Reasoning model selector)

- Findings: Provider configuration only offered Generation/Improvement/Vision model selectors, while the dashboard supports a combined Research & Reasoning role.
- Conclusions: Adding a dedicated provider preference for the combined role keeps provider-level model selection aligned with the dashboard routing and makes it easy to pick capable models.
- Actions: Added `model_general` to `ProviderMetaStore` in `electron/ipc/settings.ts`, `electron/preload.ts`, and `src/types/electron.d.ts`; extended provider config types in `src/screens/Settings/ProviderConfig/types.ts`; updated `ProviderConfigForm` + `ModelSelectorSection` to render 4 selectors in a 2x2 grid and persist `model_general`; validated with `npm run build`.

## 2026-03-28 (AI config — activate Research & Reasoning + local provider support)

- Findings: The combined Research & Reasoning role could be selected on the dashboard, but cloud provider activation buttons and local provider cards did not allow setting an active model for that role.
- Conclusions: Treat Research & Reasoning as a first-class role (`general`) across cloud and local providers to keep role routing consistent and make switching active models predictable.
- Actions: Extended `AIRole` with `general` in `src/lib/constants.ts`; expanded provider meta to include `is_active_general` across `electron/ipc/settings.ts`, `electron/preload.ts`, `src/types/electron.d.ts`, and `src/screens/Settings/ProviderConfig/types.ts`; updated cloud activation UI in `src/screens/Settings/ProviderConfig/components/ModelAndActivation.tsx` + `forms/ProviderConfigForm.tsx`; updated local provider model fields and activation buttons in `src/components/LocalEndpointCard.tsx` + `src/screens/Settings/ConfigurationWizard.tsx`; ensured AI config state hydration includes `model_general` / `is_active_general` in `src/screens/AIConfig.tsx`; validated with `npm run build`.

## 2026-03-28 (Model selector — read more modal)

- Findings: Model descriptions in the selector list were truncated, making it hard to review full details before selecting.
- Conclusions: A lightweight modal keeps the list compact while still allowing full inspection of model details on demand.
- Actions: Updated `src/components/ModelSelector.tsx` to add a `Read more` action that opens a modal showing full model details (capabilities, prices, ID, and full description) and uses a lightbox-style blurred backdrop; validated with `npm run build`.

## 2026-03-28 (AI config — show last updated for models list)

- Findings: The AI configuration provider setup allowed refreshing the models list, but it was not visible when the list was last fetched.
- Conclusions: A small timestamp shown next to the refresh control provides immediate feedback that the models list is current without changing the underlying fetch logic.
- Actions: Extended `ModelSelectorSectionProps` in `src/screens/Settings/ProviderConfig/types.ts`; wired a `lastModelsUpdatedAt` timestamp in `src/screens/Settings/ProviderConfig/forms/ProviderConfigForm.tsx` (updated on successful model sync/refresh) and displayed it in `src/screens/Settings/ProviderConfig/components/ModelAndActivation.tsx`; validated with `npm run build`.

## 2026-03-24 (Remove Save changes button from PromptPreview)

- Findings: User wanted the Save changes button removed from the edit prompt form next to the Copy button.
- Conclusions: The duplicate save action in the preview panel was redundant since the form already has a primary Save changes button in the footer.
- Actions: Removed the conditional Save changes button from `src/components/PromptPreview.tsx`; cleaned up unused `onSave`, `saveLabel`, and `saveDisabled` props from the component; validated with `npm run build`.

## 2026-03-24 (Gallery page — full feature implementation)

- Findings: User requested a Gallery page to display AI-generated images and videos with collections, filtering, lightbox viewer, and slideshow mode.
- Conclusions: Implemented as a complete feature following all 5 IPC steps, with Drizzle schema, migration, reusable components (MediaRenderer, StarRating, GridDensitySelector, GalleryLightbox), a state hook, and the Gallery screen. Used framer-motion for card animations and react-blurhash for image placeholders.
- Actions: Added `collections` and `gallery_items` tables to `src/lib/schema.ts` with types; created migration `drizzle/0020_gallery_collections.sql` + journal entry; created `src/components/MediaRenderer.tsx`, `src/components/StarRating.tsx`, `src/components/GridDensitySelector.tsx`, `src/components/GalleryLightbox.tsx`; created `src/hooks/useGalleryState.ts`; created IPC handler `electron/ipc/gallery.ts` and registered in `electron/services/ipcRegistry.ts`; exposed in `electron/preload.ts`; added types in `src/types/electron.d.ts`; added `'gallery'` to `Screen` type in `src/types/index.ts`; created `src/screens/Gallery.tsx`; added route in `src/App.tsx` and nav item in `src/components/Sidebar.tsx`; added `.dynamic-grid` CSS class to `src/index.css`; installed `react-blurhash` and `framer-motion`; validated with `npm run build`.

## 2026-03-24 (Save to Library colours unified for consistency)

- Findings: Na de vorige wijziging hadden `Save to Library` varianten elk een andere kleur, maar de gebruiker wilde onderlinge kleurconsistentie.
- Conclusions: De drie save-varianten behouden hun aparte class-namen per context, maar gebruiken exact dezelfde kleurstijl voor consistente visuele herkenning.
- Actions: In `src/index.css` `.btn-save-library-main`, `.btn-save-library-secondary` en `.btn-save-library-builder` gelijkgetrokken naar dezelfde blauw-teal gradient en shadowstijl; gevalideerd met `npm run build`.

## 2026-03-24 (Save to Library variants with distinct colours)

- Findings: De gebruiker wilde dat `Save to Library` en varianten niet allemaal dezelfde buttonkleur gebruiken.
- Conclusions: Drie aparte varianten met duidelijke kleur-identiteit maken de save-acties sneller herkenbaar per context.
- Actions: In `src/index.css` nieuwe classes toegevoegd: `.btn-save-library-main` (blauw-teal), `.btn-save-library-secondary` (pink-purple), `.btn-save-library-builder` (cyan-teal); in `src/screens/Generator.tsx` beide `Save to Library` knoppen omgezet naar respectievelijk `btn-save-library-main` en `btn-save-library-secondary`; in `src/screens/PromptBuilder.tsx` de `Save to Library` knop omgezet naar `btn-save-library-builder`; gevalideerd met `npm run build`.

## 2026-03-24 (Generator layout restyling - compact buttons and separated panels)

- Findings: De Generator layout moest meer lijken op de referentie-afbeelding met kleinere, compacte knoppen, duidelijke panelen los van elkaar, en knoppen eronder.
- Conclusions: Nieuwe compacte button classes creëren (`btn-compact`, `btn-compact-primary`, `btn-compact-teal`, `btn-compact-ghost`) voor kleinere knoppen met iconen; panels apart zetten met duidelijke visuele scheiding; knoppen verplaatsen naar onder de panelen.
- Actions: `src/index.css` uitgebreid met compacte button styles; `src/screens/Generator.tsx` herstructureerd: Generated Output Card bovenaan met compacte actieknoppen eronder (Copy Prompt, Copy Negative, Edit in Manual, Save to Library, Guided Mode); Suggested Model section apart; Improve Prompt section met teal styling en los paneel; Negative Prompt in eigen rode sectie; ongebruikte code opgeschoond; gevalideerd met `npm run build`.

## 2026-03-24 (Magic AI Expansion teal gradient)

- Findings: Magic AI Expansion knop had dezelfde oranje gradient als andere AI knoppen, maar de gebruiker wilde een teal/cyan kleur (#1ee7d0) voor deze specifieke actie.
- Conclusions: Een aparte teal gradient voor Magic AI Expansion maakt het visueel onderscheidend van de andere oranje AI knoppen.
- Actions: Nieuwe `.btn-ai-expansion` class toegevoegd in `src/index.css` met teal gradient (`from-teal-500 to-teal-600`); `teal-500` in `tailwind.config.js` aangepast naar `#1ee7d0`; `Magic AI Expansion` knop in `Generator.tsx` omgezet naar `btn-ai-expansion` class; gevalideerd met `npm run build`.

## 2026-03-24 (Unified orange gradient for all AI generation buttons)

- Findings: AI-activatie knoppen hadden inconsistente styling - sommige teal, sommige amber ghost, sommige custom borders - terwijl de referentie een uniforme oranje CTA gradient toont.
- Conclusions: Alle AI-generatie knoppen dezelfde `.btn-primary` gradient geven (`from-amber-500 to-orange-600`) creëert visuele consistentie en herkenbaarheid voor AI-acties.
- Actions: In `src/screens/Generator.tsx` alle AI knoppen omgezet naar `btn-primary`: `Magic AI Expansion`, `Magic Random (AI)`, `Improve Prompt`, `Generate Negative Prompt`, `Improve Negative Prompt`, `Get AI Advice`, `Generate Title (AI)`; `btn-primary` class in `src/index.css` bijgewerkt met de gradient spec; kleur basis `#f59e0b` ingesteld in `tailwind.config.js`; gevalideerd met `npm run build`.

## 2026-03-24 (Color System Migration to Slate/Amber/Teal)

- Findings: The project used a custom `night-*` color palette that was inconsistent with modern design systems and did not follow the standardized Slate/Amber/Teal convention from the reference application.
- Conclusions: Migrating to the Slate-based design system provides better consistency, accessibility, and maintainability while keeping the dark aesthetic. Primary accent changed to amber-500, secondary to teal-500, with standardized element conventions.
- Actions: Updated `tailwind.config.js` with new Slate color palette (950-100), Amber (500-300), Teal (500-300), and Red (500-400); rewrote `src/index.css` with new CSS conventions for buttons (btn-primary amber CTA, btn-secondary ghost, btn-danger), cards (.card with slate-900/bg-slate-800 border), inputs (.input with amber focus), badges (.badge-info/warning/error/success/neutral), and light mode CSS variables; replaced all `night-*` utility classes across components with Slate equivalents (`bg-night-900` → `bg-slate-900`, `text-night-400` → `text-slate-500`, `border-night-600` → `border-slate-700`, etc.) in `Generator.tsx`, `Library.tsx`, `Settings.tsx`, `StyleProfiles.tsx`, `PromptBuilder.tsx`, `GenerationLog.tsx`, `PromptForm.tsx`, `PromptPreview.tsx`, and `Sidebar.tsx`; validated with `npm run build`.

## 2026-03-24 (Generator colour tuning toward amber reference look)

- Findings: De huidige Generator gebruikte vooral koele paars/blauwe accenten, terwijl de referentie visueel meer nadruk legt op een warme amber-accentzone rond de random-kaart en CTA.
- Conclusions: Door alleen de Magic Random kaart en bijbehorende controls warm amber te maken blijft de huidige design language behouden, maar komt de pagina dichter bij de referentie-look.
- Actions: In `src/screens/Generator.tsx` de `Magic Random` kaart voorzien van amber-tinted gradient + border (`to-glow-amber/5`, `border-glow-amber/25`), random-header icon en actieve character states naar amber gezet, random sliders omgezet naar `accent-glow-amber`, en de `Magic Random (AI)` knop restyled naar een amber rounded CTA met `shadow-glow-amber`; gevalideerd met `npm run build`.

## 2026-03-24 (Improve Prompt moved under generated field)

- Findings: `Improve Prompt` stond onderaan de kaart, los van het generated prompt-veld, waardoor de actie niet dicht bij de hoofdoutput zat.
- Conclusions: De knop direct onder het generated prompt-veld plaatsen maakt de flow logischer; amber styling maakt het een duidelijke secundaire focusactie.
- Actions: In `src/screens/Generator.tsx` de `Improve Prompt` knop verplaatst naar direct onder de generated textarea en opnieuw gestyled als afgeronde amber knop (`bg-glow-amber/10`, `border-glow-amber/40`, `text-glow-amber`, `shadow-glow-amber`); oude knoppositie onderaan verwijderd; gevalideerd met `npm run build`.

## 2026-03-24 (Copy/Clear actions under Negative Prompt controls)

- Findings: In de Generated Prompt-kaart ontbraken directe `Copy Prompt` en `Clear all` acties onder de `Generate Negative Prompt`/`Improve Negative Prompt` knoppen.
- Conclusions: Door dezelfde snelle acties direct onder de negative-controls te plaatsen wordt de workflow sneller zonder extra scroll of contextwissel.
- Actions: In `src/screens/Generator.tsx` onder de bestaande negative action row een tweede actie-row toegevoegd met `Copy Prompt` (`handleCopy`) en `Clear all` (`handleClearAll`), beide met bestaande knopstijlen; gevalideerd met `npm run build`.

## 2026-03-24 (Fixed subtitle height in Generator cards)

- Findings: De subtitles in de headers van `Magic Quickstart` en `Magic Random` hadden verschillende visuele hoogte, waardoor de kaartkoppen niet netjes uitlijnen.
- Conclusions: Een vaste minimale hoogte op beide subtitle-regels houdt de headerlay-out consistent zonder inhoudelijke tekstwijzigingen.
- Actions: In `src/screens/Generator.tsx` beide subtitle-paragrafen voorzien van `min-h-8` (`Magic Quickstart` en `Magic Random`) zodat de headerhoogte gelijk blijft; gevalideerd met `npm run build`.

## 2026-03-24 (Read-only generated prompt field in Magic Random card)

- Findings: Magic Random had no preview text area in the card itself, waardoor de kaartindeling afweek van Magic Quickstart.
- Conclusions: Een read-only promptveld in dezelfde positie/stijl maakt de layout consistenter en toont direct waar de gegenereerde prompt verschijnt.
- Actions: In `src/screens/Generator.tsx` een read-only textarea toegevoegd aan de Magic Random kaart (met `value={generatedPrompt}`, `readOnly`, `min-h-36`) direct onder de header; geen editable input toegevoegd; gevalideerd met `npm run build`.

## 2026-03-24 (Glow amber token rollout)

- Findings: In meerdere schermen werden losse Tailwind yellow-utilities gebruikt voor ratings en highlights, buiten de design token-set.
- Conclusions: Een centrale `glow.amber` token + bijhorende shadow zorgt voor consistente styling en voorkomt hardcoded kleurvarianten.
- Actions: In `tailwind.config.js` `glow.amber: '#d97706'` en `boxShadow.glow-amber` toegevoegd; gele utility-klassen vervangen in `src/components/PromptForm.tsx`, `src/screens/Library.tsx`, `src/screens/GenerationLog.tsx`, `src/screens/Generator.tsx`, `src/screens/PromptBuilder.tsx`, en `src/components/PromptPreview.tsx` volgens de afgesproken tokenmapping (`text-glow-amber`, `bg-glow-amber/10`, `border-glow-amber/40`); gevalideerd met `npm run build`.

## 2026-03-24 (Magic Random controls aligned with Quickstart)

- Findings: In de Generator stonden in Magic Random de actieknoppen in een andere volgorde dan gewenst (primary niet rechts) en de volgorde van sliders was omgekeerd t.o.v. Magic Quickstart.
- Conclusions: Voor consistente UX moet de primaire actieknop visueel rechtsonder staan en moet Magic Random dezelfde control-volgorde volgen als Quickstart (Creativity boven Max words).
- Actions: In `src/screens/Generator.tsx` de knopvolgorde in Magic Random aangepast naar `Copy Prompt` → `Clear all` → `Magic Random (AI)` zodat de primaire knop rechts eindigt; sliderblokken omgewisseld naar eerst `Creativity Level`, daarna `Max words`; gevalideerd met `npm run build`.

## 2026-03-24 (Generator cards aligned for Quickstart and Magic Random)

- Findings: Magic Random blok miste een consistente titel/header zoals Magic Quickstart, knoppen stonden niet op dezelfde plek en de twee kaarten hadden ongelijke visuele hoogte.
- Conclusions: Beide kaarten moesten dezelfde kaartstructuur krijgen (`h-full` + `flex` layout), met actieknoppen rechtsonder voor consistente scanbaarheid en interactie.
- Actions: In `src/screens/Generator.tsx` de generator-grid op `items-stretch` gezet; beide kaarten aangepast naar `h-full flex flex-col`; Magic Random header toegevoegd met titel en subtitel in dezelfde stijl als Quickstart; acties voor beide blokken naar een bottom-right actiesectie verplaatst (`mt-auto ... justify-end`); JSX-structuur opgeschoond na mergeconflict; gevalideerd met `npm run build`.

## 2026-03-24 (Leesbare modeluitleg in Suggested Model)

- Findings: De rule-based modeluitleg gebruikte technische scoretekst (art/realism/typography/prompting), wat voor eindgebruikers weinig begrijpelijk is.
- Conclusions: Gebruik `matchedSignals` + `budgetMode` om natuurlijke Nederlandse uitleg te bouwen, met aparte formulering voor hoofdaanbeveling en alternatieven.
- Actions: In `electron/ipc/ai.ts` een pure helper `buildRuleExplanation(signals, budgetMode, isAlternative)` toegevoegd met signaalmapping (`realism`, `typography`, `artistic style`, `general balance`), fallback-zinnen voor alround-situaties, en budget-suffixen voor hoofdaanbeveling (`cheap`/`premium`); technische explanation-strings in `getRuleBasedRecommendation` vervangen door helper-aanroepen voor recommendation en alternatives; AI-modus ongemoeid gelaten; gevalideerd met `npm run build`.

## 2026-03-23 (Three contextual model suggestions in Generator)

- Findings: Suggested Model kaart toonde alleen één hoofdaanbeveling, terwijl de rule-based scoringlijst al genoeg data bevatte voor extra contextuele suggesties.
- Conclusions: Voeg twee aanvullende aanbevelingen toe (`bestValue`, `fastest`) zonder de bestaande hoofdaanbeveling te vervangen; AI-modus blijft ongewijzigd.
- Actions: Uitgebreid `AdvisorResult` met optionele `bestValue` en `fastest` in `electron/ipc/ai.ts`; toegevoegd: `ScoredAdvisorModel`, `findBestValue` (budget-aware cost-tier filter) en `findFastest` (modelnaam-hints: turbo/lightning/lite/schnell/fast/quick/speed), plus deduplicatie t.o.v. hoofdaanbeveling; `ModelAdvisorResult` geüpdatet in `src/types/electron.d.ts`; in `src/screens/Generator.tsx` nieuwe state `advisorBestValue`/`advisorFastest` toegevoegd met localStorage hydration/persist/reset en compacte UI-rijen onder de hoofdaanbeveling in Suggested Model kaart; gevalideerd met `npm run build`.

## 2026-03-23 (Budget mode for NightCafe Model Advisor)

- Findings: The rule-based model advisor used keyword-matching (COST_SENSITIVE_HINTS) on prompt text to detect cost sensitivity. Users never type "cheap" in creative prompts, making this detection useless.
- Conclusions: Replace keyword detection with an explicit budget mode UI (Goedkoop / Gebalanceerd / Premium) that the user controls. Pass budgetMode through to both rule-based and AI advisor paths.
- Actions: Added `BudgetMode` type and replaced `COST_SENSITIVE_HINTS` + `costHits` logic with `budgetMode`-based `costPenalty` in `getRuleBasedRecommendation` in `electron/ipc/ai.ts`; updated `generator:adviseModel` handler to accept and parse `budgetMode`; added budget preference line to AI advisor instruction; updated IPC types in `electron/preload.ts` and `src/types/electron.d.ts`; added `budgetMode` state with localStorage persistence and three-pill selector UI in the Suggested Model card in `src/screens/Generator.tsx`; validated with `npm run build`.

## 2026-03-23 (Add character option to Magic Random AI)

- Findings: User requested to add character selection to the Magic Random (AI) option on the Generator page, similar to the existing character picker in Magic Quickstart.
- Conclusions: The Magic Random section needed a character picker UI and the backend IPC handler needed to support creativity and character parameters for consistent behavior with Quickstart.
- Actions: Added character picker to Magic Random AI card in `src/screens/Generator.tsx`; updated `magicRandom` IPC types in `src/types/electron.d.ts` and `electron/preload.ts`; extended `generator:magicRandom` handler in `electron/ipc/ai.ts` to accept `creativity` and `character` parameters; implemented creativity-based temperature mapping (focused: 0.7, balanced: 1.0, wild: 1.3) and character context injection in prompt generation; validated with `npm run build`.

## 2026-03-21 (Fix garbled UTF-8 characters in Generator UI)

- Findings: UI showed garbled characters like `â¯º` instead of proper icons due to UTF-8 emoji/special characters being misinterpreted.
- Conclusions: Replace Unicode emoji characters with Lucide icons to eliminate encoding issues entirely.
- Actions: Replaced `☺` smiley with `<User>` icon and `✦` star with `<Sparkles>` icon in `src/screens/Generator.tsx`; replaced em-dash `—` with simple dash `-`; added imports for `User` and `Sparkles` from `lucide-react`; validated with `npm run build`.

## 2026-03-19 (Fix greylist migration for fresh DB)

- Findings: Startup database check failed with `PostgresError: relation "greylist" does not exist` because migration `drizzle/0018_greylist_table.sql` only used `ALTER TABLE greylist ...`, which breaks on databases where the table was never created.
- Conclusions: Migration should be idempotent on fresh installs by creating the table if missing, while still safely adding columns/indexes for existing installs.
- Actions: Updated `drizzle/0018_greylist_table.sql` to `CREATE TABLE IF NOT EXISTS greylist (...)` before applying `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and indexes; validated with `npm run build`.

## 2026-03-19 (Center layouts with PageContainer)

- Findings: Several screens needed to be centered with a fixed 1000px content width on viewports >= 1000px, while Dashboard/Home, Library, and Characters should remain full width. Previous ad-hoc changes caused JSX/syntax issues.
- Conclusions: A small reusable layout wrapper keeps styling consistent and prevents JSX wrapper drift.
- Actions: Added `src/components/PageContainer.tsx` and refactored centered screens (`src/screens/Settings.tsx`, `src/screens/Generator.tsx`, `src/screens/StyleProfiles.tsx`, `src/screens/GenerationLog.tsx`, `src/screens/AIConfig.tsx`) to use it; kept `src/screens/Dashboard.tsx`, `src/screens/Library.tsx`, and `src/screens/Characters.tsx` full width; validated with `npm run build`.

## 2026-03-19 (OpenRouter model capabilities + role filtering)

- Findings: AIConfig showed irrelevant OpenRouter models (e.g. Vision role listing models without image input support).
- Conclusions: Parse OpenRouter `/api/v1/models` metadata into a capabilities list and filter model pickers per role (Vision => only `vision` models, Research & Reasoning => only `reasoning`/`web_search` models) while keeping existing selections visible.
- Actions: Added `capabilities` JSONB column to `openrouter_models` via `drizzle/0019_openrouter_model_capabilities.sql` (+ journal entry); extended OpenRouter model sync in `electron/ipc/settings.ts` to derive `capabilities` from `architecture.*_modalities`, `supported_parameters`, and pricing hints; plumbed capabilities through `electron/preload.ts` + `src/types/electron.d.ts` and used them in `src/screens/AIConfig.tsx`; filtered Vision + Research & Reasoning role model lists in `src/screens/Settings/Dashboard.tsx`; validated with `npm run build`.

## 2026-03-19 (Model dropdown capability chips)

- Findings: Model dropdown entries did not clearly show which capabilities (Text/Vision/Reasoning/Web search/Code/Audio/Video) each model supports.
- Conclusions: Surface capabilities as compact icon+label chips in `ModelSelector` so users can choose the right model at a glance.
- Actions: Updated `src/components/ModelSelector.tsx` to render normalised capability chips with icons; added `.line-clamp-2` utility class in `src/index.css` to avoid inline styles; removed redundant right-side price labels and display `Free` for models with zero/negative pricing; validated with `npm run build`.

## 2026-03-17 (Greylist database persistence)

- Findings: Greylist words were only stored in localStorage, making them non-permanent across app reinstalls and devices.
- Conclusions: Greylist should be stored in the database for persistence, with proper table schema and IPC handlers.
- Actions: Added `greylistTable` schema to `src/lib/schema.ts`; created migration `drizzle/0018_greylist_table.sql` and applied via `apply-greylist-migration.ts`; implemented IPC handlers in `electron/ipc/greylist.ts`; added API to preload and electron types; updated `src/screens/Generator.tsx` to use database storage instead of localStorage; validated with `npm run build`.

## 2026-03-16 (Generator pagina: NightCafe preset dropdowns empty fix)

- Findings: De NightCafe preset dropdowns in Generator waren leeg door twee problemen: (1) de `preset_prompt` kolom ontbrak in de database omdat migratie 0017 niet was toegepast, en (2) in development mode werden de CSV-bestanden niet gevonden via `app.getAppPath()` en `process.resourcesPath`.
- Conclusions: Database migratie 0017 toepassen om de `preset_prompt` kolom toe te voegen aan `nightcafe_presets`, en extra fallback paden (`process.cwd()`) nodig voor development mode.
- Actions: Migratie `drizzle/0017_nightcafe_preset_prompt.sql` aangemaakt en toegepast via `npm run db:migrate`; in `electron/services/nightcafeSync.ts` extra `process.cwd()` pad toegevoegd aan `getNightCafePresetsCandidates()` en `getNightCafePresetPromptsCandidates()`; logging toegevoegd aan `readNightCafePresetsCsv()`; gevalideerd met `npm run build`. Console toont nu: "Nightcafe presets synced: 44 total".

## 2026-03-16 (Generator pagina: Greylist verplaatst en sliders toegevoegd)

- Findings: Greylist stond onderaan de Magic Random AI sectie, buiten de natuurlijke leesflow; Magic Quickstart miste een max words slider; Magic Random AI miste een creativity slider terwijl deze wel bestond voor Quickstart.
- Conclusions: Greylist moet boven de twee kolommen staan als gedeelde instelling; beide AI-modi moeten consistent hun eigen creativity level en max words kunnen instellen.
- Actions: Greylist verplaatst naar boven de Quickstart/Random grid in `src/screens/Generator.tsx`; max words slider toegevoegd aan Magic Quickstart card; separate `magicRandomCreativity` state toegevoegd (naast `quickStartCreativity`) met persistence; creativity slider toegevoegd aan Magic Random AI card; gevalideerd met `npm run build`.

## 2026-03-16 (ProviderConfigForm opgesplitst in modulaire componenten)

- Findings: `src/screens/Settings/ProviderConfigForm.tsx` was 21KB met hardcoded OpenRouter-specifieke logica (key validatie, test verbinding, model refresh, prijs formatting) door elkaar gemengd in één monolithisch component.
- Conclusions: Provider-specifieke logica moet worden geïsoleerd via een adapter pattern; generieke UI componenten (API key input, model selectie, activatie knoppen) moeten herbruikbaar zijn; een provider registry maakt toekomstige providers eenvoudig toe te voegen zonder bestaande code te wijzigen.
- Actions: Nieuwe modulaire structuur aangemaakt in `src/screens/Settings/ProviderConfig/` met: `types.ts` (provider-agnostische interfaces), `providerRegistry.ts` (extensible provider factory), `adapters/openRouter.ts` (OpenRouter-specifieke implementatie), `components/ApiKeyInput.tsx` (herbruikbare key input met mask/visibility toggle), `components/ModelAndActivation.tsx` (model selector grid + role activation buttons), `forms/ProviderConfigForm.tsx` (samengestelde container component ~11KB); oude monolithische form vervangen door re-export; gevalideerd met `npm run build`.

## 2026-03-16 (Shared loading skeletons for key screens)

- Findings: First-load states in `Dashboard`, `Library`, `StyleProfiles`, and `GenerationLog` used spinner/text placeholders, which can feel slow and abrupt when Electron IPC responses are delayed.
- Conclusions: Reusable skeleton components provide better perceived performance and visual continuity while keeping loading behavior and data flow unchanged.
- Actions: Added shared skeleton primitives/layouts in `src/components/skeletons/SkeletonBlock.tsx`, `src/components/skeletons/DashboardSkeleton.tsx`, `src/components/skeletons/LibrarySkeleton.tsx`, `src/components/skeletons/StyleProfilesSkeleton.tsx`, and `src/components/skeletons/GenerationLogSkeleton.tsx`; wired loading branches in `src/screens/Dashboard.tsx`, `src/screens/Library.tsx`, `src/screens/StyleProfiles.tsx`, and `src/screens/GenerationLog.tsx`; validated with `npm run build`.

## 2026-03-16 (Characters screen opgesplitst in onderhoudbare componenten)

- Findings: `src/screens/Characters.tsx` was te groot (~27KB) en combineerde meerdere verantwoordelijkheden in één bestand.
- Conclusions: Opsplitsen in gerichte presentational componenten (form modal, trait editor, image uploader, card/detail panel) maakt onderhoud en testbaarheid beter zonder functionele wijziging.
- Actions: Nieuwe componenten toegevoegd in [src/components/characters/types.ts](src/components/characters/types.ts), [src/components/characters/CharacterFormModal.tsx](src/components/characters/CharacterFormModal.tsx), [src/components/characters/CharacterTraitEditor.tsx](src/components/characters/CharacterTraitEditor.tsx), [src/components/characters/CharacterImageUploader.tsx](src/components/characters/CharacterImageUploader.tsx), [src/components/characters/CharacterCard.tsx](src/components/characters/CharacterCard.tsx), [src/components/characters/CharacterDetailPanel.tsx](src/components/characters/CharacterDetailPanel.tsx); [src/screens/Characters.tsx](src/screens/Characters.tsx) gereduceerd tot state/orchestration + helperfuncties; gevalideerd met `npm run build`.

## 2026-03-16 (Globale fallback voor stille IPC-fouten)

- Findings: User gaf aan dat sommige IPC-fouten stil mislukken zonder toast, waardoor er geen zichtbare feedback is.
- Conclusions: Een centrale `invoke`-interceptor in preload moet onverwachte IPC failures altijd loggen en een renderer-brede fallback hook aanbieden voor minimale gebruikersfeedback.
- Actions: In [electron/preload.ts](electron/preload.ts) alle `ipcRenderer.invoke` calls omgezet naar `invokeWithFallback` met globale error logging (`console.error`) en nieuwe `onUnexpectedIpcError` subscription API; in [src/types/electron.d.ts](src/types/electron.d.ts) de nieuwe payload + API getypt; in [src/App.tsx](src/App.tsx) globale fallback toast toegevoegd via `sonner` bij onverwachte IPC-fout; gevalideerd met `npm run build`.

## 2026-03-16 (Fallback IPC toast deduplicatie)

- Findings: User bevestigde dat fallback toasts gewenst zijn maar zonder spam bij meerdere identieke fouten kort na elkaar.
- Conclusions: Een korte cooldown per foutsignatuur (`channel + message`) voorkomt toast-spam terwijl logging en eerste feedback intact blijven.
- Actions: In [src/App.tsx](src/App.tsx) deduplicatie toegevoegd voor `onUnexpectedIpcError` met `Map`-gebaseerde cooldown (`2500ms`) per unieke foutkey; identieke fouten binnen cooldown tonen geen extra toast.

## 2026-03-15 (Configureerbare NightCompanion opslagmap + AppData Local default)

- Findings: User wilde dat image-bestanden standaard onder `C:\Users\<user>\AppData\Local\NightCompanion` worden opgeslagen en via Settings aanpasbaar zijn.
- Conclusions: Een centrale path-resolver met fallback naar Local AppData voorkomt verspreide hardcoded paden en maakt consistent beheer mogelijk voor prompt- en character-images.
- Actions: Toegevoegd [electron/services/storagePaths.ts](electron/services/storagePaths.ts) met default/configured root-resolutie; prompt- en character-image opslag gemigreerd in [electron/ipc/prompts.ts](electron/ipc/prompts.ts) en [electron/ipc/characters.ts](electron/ipc/characters.ts); nieuwe settings IPC-methodes toegevoegd in [electron/ipc/settings.ts](electron/ipc/settings.ts), geëxposed in [electron/preload.ts](electron/preload.ts), getypt in [src/types/electron.d.ts](src/types/electron.d.ts), en UI-besturing toegevoegd in [src/screens/Settings.tsx](src/screens/Settings.tsx) (`Browse` + `Save` + `Reset default` voor folderlocatie).

## 2026-03-15 (Lightbox GPU-smoothness polish)

- Findings: User vroeg om een mini performance polish voor de Library-lightbox op tragere GPU's.
- Conclusions: Een gerichte `will-change` hint op alleen backdrop-fade en lightbox-images kan transitions stabieler maken zonder onnodige globale render-cost.
- Actions: In [src/screens/Library.tsx](src/screens/Library.tsx) `willChange` toegevoegd op de backdrop fade-container (`opacity`), blur-backdrop image (`transform`) en de foreground lightbox image (`transform, opacity`).

## 2026-03-15 (Library lightbox metadata overlay)

- Findings: User wilde in de Library lightbox extra context op de afbeelding: onderaan de prompt met sterwaardering, rechtsboven het gebruikte model, en de mogelijkheid om die overlay te togglen.
- Conclusions: De lightbox moet niet alleen een afbeelding bevatten maar ook promptmetadata meenemen in de open-state; een aparte overlay-toggle voorkomt visuele drukte en blijft bruikbaar met toetsenbordbediening.
- Actions: In [src/screens/Library.tsx](src/screens/Library.tsx) lightbox state uitgebreid met `promptText`, `rating` en `model`; een togglebare info-overlay toegevoegd met knop linksboven en `I`-sneltoets; rechtsboven een `Used model` badge toegevoegd; onderaan een glazen metadata-panel toegevoegd met sterweergave en volledige prompttekst; `Esc` sluit de lightbox.

## 2026-03-15 (App-wide halve sterren)

- Findings: User vroeg om halve sterren app-wide toe te staan, niet alleen in Prompt Library/Form.
- Conclusions: Naast prompts moest ook Generation Log worden omgezet naar 0.5-stappen, inclusief databasekolom en UI in zowel lijst/kaartweergave als edit/create modal.
- Actions: `generation_log.rating` omgezet van integer naar real in [src/lib/schema.ts](src/lib/schema.ts) met migratie [drizzle/0016_generation_log_half_star_ratings.sql](drizzle/0016_generation_log_half_star_ratings.sql) en journal update; [src/screens/GenerationLog.tsx](src/screens/GenerationLog.tsx) uitgebreid met half-star rendering (`Star`/`StarHalf`) en half-step input (links/rechts klikzones per ster) inclusief 1-decimal label; gevalideerd met `npm run db:migrate` en `npm run build`.

## 2026-03-15 (Halve sterren bij promptwaardering)

- Findings: User vroeg om halve sterren toe te staan bij waardering in plaats van alleen hele sterren.
- Conclusions: Dit vereist zowel UI-aanpassing (half-star click targets) als opslag als decimale waarde in de database.
- Actions: `rating` in `prompts` en `prompt_versions` omgezet van integer naar real in [src/lib/schema.ts](src/lib/schema.ts) met migratie [drizzle/0015_prompt_half_star_ratings.sql](drizzle/0015_prompt_half_star_ratings.sql) en journal update; in [src/components/PromptForm.tsx](src/components/PromptForm.tsx) half-star selectie toegevoegd via links/rechts klikzones per ster met `Star`/`StarHalf` iconen; in [src/screens/Library.tsx](src/screens/Library.tsx) kaart-rating idem uitgebreid naar halve stappen (0.5); migratie uitgevoerd via `npm run db:migrate` en gevalideerd met `npm run build`.

## 2026-03-15 (Soepele lightbox-transitie in Prompt Library)

- Findings: User vroeg om een vloeiendere overgang bij het openen van een promptafbeelding in de Library lightbox.
- Conclusions: Een zachte open/close animatie met fade + scale + subtiele vertical motion en delayed unmount voorkomt abrupte visuele sprongen.
- Actions: In [src/screens/Library.tsx](src/screens/Library.tsx) lightbox state uitgebreid met `lightboxVisible`, helper handlers (`openLightbox`/`closeLightbox`), `requestAnimationFrame`-gestuurde enter transition, en timeout-gebaseerde unmount na exit; backdrop, close-knop en hoofdafbeelding kregen `transition-*` classes voor soepel in/uitfaden en in-/uitzoomen; gevalideerd met `npm run build`.

## 2026-03-15 (Lightbox timing premium getuned)

- Findings: User bevestigde dat de overgang nog meer premium mocht aanvoelen.
- Conclusions: Openen moet net iets langzamer en sluiten iets sneller voor een vloeiendere maar responsieve interactie.
- Actions: In [src/screens/Library.tsx](src/screens/Library.tsx) transities aangepast naar `320ms` voor enter en `200ms` voor exit voor backdrop, close-knop en hoofdafbeelding; unmount-delay afgestemd op close-tijd (`210ms`); gevalideerd met `npm run build`.

## 2026-03-15 (Togglebare native Windows-titelbalk)

- Findings: User vroeg om een native Windowsbalk (titelbalk/frame) met toggle-optie.
- Conclusions: Omdat `BrowserWindow.frame` niet runtime-in-place wisselt, is de juiste aanpak een persistente instelling met automatische window-recreate na togglen; renderer drag-region moet conditioneel uit bij native frame.
- Actions: Uitgebreid settings state met `nativeWindowFrameEnabled` in [electron/ipc/settings.ts](electron/ipc/settings.ts), [electron/preload.ts](electron/preload.ts) en [src/types/electron.d.ts](src/types/electron.d.ts); startup gebruikt nu deze voorkeur in [electron/main.ts](electron/main.ts) + [electron/services/windowManager.ts](electron/services/windowManager.ts); togglen in Settings triggert directe window-recreate met behoud van grootte/positie via callback pad in [electron/services/ipcRegistry.ts](electron/services/ipcRegistry.ts); [src/screens/Settings.tsx](src/screens/Settings.tsx) kreeg een nieuwe `Native Windows title bar` switch; [src/App.tsx](src/App.tsx) toont de custom `drag-region` alleen nog in frameless modus.

## 2026-03-15 (Library prompt image lightbox)

- Findings: User asked that clicking a prompt image in Library opens it in a lightbox, with the largest possible preview and an Apple-style blurred background using a zoomed section of the same image.
- Conclusions: The cleanest implementation is an in-screen lightbox overlay in Library itself with a full-screen zoomed/blurred image layer plus a centered foreground image constrained by viewport height/width.
- Actions: Updated [src/screens/Library.tsx](src/screens/Library.tsx) to make card images clickable (`cursor-zoom-in`), open a fullscreen lightbox on click, render a zoomed/blurred backdrop sourced from the same image, and display the opened image at `max-w-[96vw]` and `max-h-[94vh]` with close-on-backdrop and close button behavior.

## 2026-03-15 (Dev local resource loading enabled)

- Findings: User asked to allow loading local resources in the development environment.
- Conclusions: Two blockers were addressed: renderer CSP needed explicit `file:` support for local image URLs, and Electron dev window needed relaxed web security only during development.
- Actions: Updated [index.html](index.html) CSP `img-src` to include `file:` for local `file://` image rendering; updated [electron/services/windowManager.ts](electron/services/windowManager.ts) to set `webPreferences.webSecurity` to `false` only in dev (`NODE_ENV=development` or unpackaged) and keep it enabled in production.

## 2026-03-15 (Suggested model field + AI tags on prompts)

- Findings: User asked for a non-editable `Suggested Model` field in prompt edit/library views, populated from Generator saves, plus an AI-assisted tag option with a maximum of 15 tags.
- Conclusions: `suggestedModel` must be persisted separately from the editable `model` field so generator advice can be preserved even when library prompts are edited later; AI tag generation belongs in the existing generator AI IPC because it already has provider routing and request logging.
- Actions: Added `suggested_model` to prompts and prompt versions in [src/lib/schema.ts](src/lib/schema.ts) with migration `drizzle/0014_prompt_suggested_model.sql`; updated prompt persistence/version snapshots in [electron/ipc/prompts.ts](electron/ipc/prompts.ts); added `generator:generateTags` in [electron/ipc/ai.ts](electron/ipc/ai.ts) with max-15 tag normalization and request logging, plus bridge/types in [electron/preload.ts](electron/preload.ts) and [src/types/electron.d.ts](src/types/electron.d.ts); updated [src/components/PromptForm.tsx](src/components/PromptForm.tsx) with read-only `Suggested Model`, `Add Tags with AI`, and a hard 15-tag limit; updated [src/screens/Generator.tsx](src/screens/Generator.tsx) to save `suggestedModel` from the recommended model; updated [src/screens/Library.tsx](src/screens/Library.tsx) to show suggested model metadata.

## 2026-03-15 (Prompt edit form: local image upload)

- Findings: User asked for a prompt image upload option directly in the Prompt Library edit form, with files stored under the user profile in `NightCompanion/images`.
- Conclusions: This requires a real prompt-level `imageUrl` field in the database plus prompt-specific file lifecycle handling in Electron IPC; reusing the character upload pattern only at the UI layer would miss persistence and cleanup.
- Actions: Added `image_url` to `prompts` and `prompt_versions` in [src/lib/schema.ts](src/lib/schema.ts) with migration `drizzle/0013_prompt_images.sql`; updated [electron/ipc/prompts.ts](electron/ipc/prompts.ts) to save prompt images under the home-directory path `NightCompanion/images`, preserve historical image references in prompt versions, and delete all referenced local prompt images when a prompt is deleted; extended bridge/types in [electron/preload.ts](electron/preload.ts), [src/types/electron.d.ts](src/types/electron.d.ts), and [src/types/index.ts](src/types/index.ts); added upload/replace/remove image UI with preview to [src/components/PromptForm.tsx](src/components/PromptForm.tsx); updated [src/screens/Library.tsx](src/screens/Library.tsx) to render prompt thumbnails when present.

## 2026-03-15 (Magic Quickstart: NightCafe preset dropdown toegevoegd)

- Findings: User vroeg om een NightCafe preset-keuzelijst direct in het Magic Quickstart blok.
- Conclusions: De preset-selector in Quickstart moet dezelfde `selectedPreset` state gebruiken als Magic Random, zodat beide blokken consistent blijven; `quickExpand` moet de gekozen preset als verplichte stijlcontext ontvangen.
- Actions: In [src/screens/Generator.tsx](src/screens/Generator.tsx) een `NightCafe Preset` dropdown toegevoegd binnen de `Magic Quickstart` card en `selectedPreset` doorgegeven aan `generator:quickExpand`; `quickExpand` input uitgebreid met `presetName` in [electron/ipc/ai.ts](electron/ipc/ai.ts), [electron/preload.ts](electron/preload.ts), en [src/types/electron.d.ts](src/types/electron.d.ts); backend `quickExpand` promptopbouw gebruikt nu expliciete preset-guidance (`Use this preset as mandatory style guidance`); gevalideerd met `npm run build`.

## 2026-03-15 (Settings: laatste Hugging Face sync tijd zichtbaar)

- Findings: User vroeg om expliciet de laatste Hugging Face sync-tijd in Settings te tonen.
- Conclusions: Een compacte sync-info endpoint (`lastSyncedAt` + statusaantallen) maakt de refresh-sectie informatief zonder extra pagina of complexiteit.
- Actions: Toegevoegd `nightcafeModels:getHuggingFaceSyncInfo` in [electron/ipc/nightcafe.ts](electron/ipc/nightcafe.ts) met `lastSyncedAt` en tellingen per status (`matched/unmatched/error/pending`); bridge/types uitgebreid in [electron/preload.ts](electron/preload.ts) en [src/types/electron.d.ts](src/types/electron.d.ts); [src/screens/Settings.tsx](src/screens/Settings.tsx) laadt nu sync-info bij openen en na handmatige refresh, en toont `Laatste sync` + status-overzicht; gevalideerd met `npm run build`.

## 2026-03-15 (NightCafe modelinformatie verrijkt met Hugging Face modelcards)

- Findings: User vroeg om NightCafe modelinformatie te verrijken met modelcard-data van Hugging Face, inclusief handmatige refresh en automatische sync.
- Conclusions: Een veilige aanpak is NightCafe-only verrijking met persistente metadata (`summary`, `downloads`, `likes`, `lastModified`) via startup TTL-sync (24u) plus force-refresh vanuit Settings; bestaande flows moeten non-blocking blijven als HF-data ontbreekt.
- Actions: Uitgebreid `nightcafe_models` schema met HF-velden in [src/lib/schema.ts](src/lib/schema.ts) en migratie `drizzle/0012_nightcafe_huggingface_modelcards.sql` (+ journal); nieuwe service [electron/services/huggingfaceSync.ts](electron/services/huggingfaceSync.ts) toegevoegd voor model matching/search/details met bounded concurrency, timeout en status (`matched/unmatched/error`); startup pad in [electron/services/nightcafeSync.ts](electron/services/nightcafeSync.ts) uitgebreid met TTL-gebaseerde HF-sync; IPC in [electron/ipc/nightcafe.ts](electron/ipc/nightcafe.ts) uitgebreid met enriched `nightcafeModels:list` payload en `nightcafeModels:refreshHuggingFace`; bridge/types geüpdatet in [electron/preload.ts](electron/preload.ts) en [src/types/electron.d.ts](src/types/electron.d.ts); handmatige refreshknop + sync-resultaat toegevoegd in [src/screens/Settings.tsx](src/screens/Settings.tsx); `Suggested Model` kaart in [src/screens/Generator.tsx](src/screens/Generator.tsx) toont nu HF summary/likes/downloads/update/sync-status voor zichtbaar verrijkte modelinformatie; gevalideerd met `npm run build`.

## 2026-03-15 (Suggested Model onder Negative Prompt)

- Findings: User wilde de `Suggested Model`-kaart visueel onder het `Negative Prompt`-blok plaatsen op de Generator-pagina.
- Conclusions: De juiste plaats is in de onderste contentkaart, direct na het conditionele `Negative Prompt`-gedeelte (zowel zichtbaar als verborgen-state), zodat de volgorde overeenkomt met de gewenste UX.
- Actions: Verplaatst in [src/screens/Generator.tsx](src/screens/Generator.tsx): `Suggested Model`-kaart weggehaald uit de rechter controlcard en toegevoegd direct onder het `Negative Prompt`-blok; buildvalidatie uitgevoerd.

## 2026-03-15 (Generator: rule-first Suggested Model + conditionele negative prompt)

- Findings: User wilde de modeladvies-toggle verwijderen, eerst rule-based modeladvies tonen zoals in de referentie-UI, en de negative prompt opties alleen tonen wanneer het geadviseerde model dit ondersteunt.
- Conclusions: Een vaste `Suggested Model`-kaart met standaard rule-based advies na generatie en een optionele `Get AI Advice` knop geeft de gewenste flow. De negative prompt sectie moet conditioneel renderen op basis van model-capability uit de database.
- Actions: In [src/screens/Generator.tsx](src/screens/Generator.tsx) de toggle verwijderd, automatische rule-based adviesaanvraag toegevoegd na `Magic Random` en `Magic Quickstart`, `Suggested Model` presentatie toegevoegd met modelnaam/uitleg/modus en `Get AI Advice`; negative prompt veld + generatie/improve-opties conditioneel gemaakt met `supportsNegativePrompt`. Toegevoegd IPC-capability lookup `nightcafeModels:getSupport` in [electron/ipc/nightcafe.ts](electron/ipc/nightcafe.ts), exposed in [electron/preload.ts](electron/preload.ts) en getypt in [src/types/electron.d.ts](src/types/electron.d.ts); build gevalideerd.

## 2026-03-15 (Prompt Preview: modeladvies badge)

- Findings: User bevestigde dat de Prompt Preview expliciet moet tonen of automatisch modeladvies actief is.
- Conclusions: Een compacte statusregel in de Preview-metadata (`Modeladvies: Aan/Uit`) geeft directe zichtbaarheid zonder extra UI-complexiteit.
- Actions: Uitgebreid [src/components/PromptPreview.tsx](src/components/PromptPreview.tsx) met optionele `modelAdviceEnabled` prop en visuele statusweergave; [src/screens/Generator.tsx](src/screens/Generator.tsx) geüpdatet om `autoModelAdviceEnabled` door te geven aan `PromptPreview`; validatie uitgevoerd met `npm run build`.

## 2026-03-15 (Generator: automatische AI-modelaanbeveling met toggle)

- Findings: User wilde alle zichtbare `Model Advisor`-elementen van de Generator verwijderen en modeladvies automatisch laten ophalen na promptgeneratie.
- Conclusions: De meest consistente UX is één schakelaar voor automatische AI-modelaanbeveling; wanneer ingeschakeld wordt na `Magic Random` en `Magic Quickstart` automatisch `generator:adviseModel` in AI-modus aangeroepen met de gegenereerde prompttekst.
- Actions: Verwijderd: volledige `Model Advisor`-kaart en handmatige adviesknoppen op [src/screens/Generator.tsx](src/screens/Generator.tsx); toegevoegd: toggle `Automatisch AI-modeladvies na promptgeneratie`, statusnotitie, en aanbevolen-modelweergave; save-flow gebruikt nu automatisch het laatst geadviseerde model (`recommendedModel`) bij `Save to Library`; state persistent gemaakt via `generatorUiState`; gevalideerd met `npm run build`.

## 2026-03-15 (NightCafe Negative Prompt Support opgeslagen in DB)

- Findings: Volgens het NightCafe-artikel over negatieve prompts zijn negatieve prompts alleen ondersteund voor Stable Diffusion-families (incl. SDXL/checkpoint), Coherent en Artistic.
- Conclusions: De juiste oplossing is een expliciet capability-veld per model in `nightcafe_models`, zodat de app niet hoeft te gokken op basis van alleen huidige UI-state.
- Actions: Toegevoegd `supports_negative_prompt` in `nightcafe_models` via migratie `drizzle/0011_nightcafe_negative_prompt_support.sql`; bestaande records direct geclassificeerd met SQL-regels op basis van modelnaam/beschrijving; `src/lib/schema.ts` uitgebreid met `supportsNegativePrompt`; `electron/services/nightcafeSync.ts` bijgewerkt om dit veld bij elke CSV-sync opnieuw te berekenen volgens artikelregels; `npm run db:migrate` uitgevoerd en `npm run build` gevalideerd.

## 2026-03-15 (Model Advisor Uses Prompt Fields Directly)

- Findings: User wanted the dedicated Model Advisor text field removed and the advisor actions moved closer to the actual prompt outputs.
- Conclusions: The cleanest flow is to keep Model Advisor as a result panel only, and place the rule-based and AI-based analysis buttons directly under the Generated Prompt and Improved Prompt sections so each action uses that field's text.
- Actions: Updated `src/screens/Generator.tsx` to remove the `advisorInput` UI/state/localStorage persistence, place advisor buttons under the `Generated Prompt` textarea and under the `Improved Prompt` section, and pass the respective field text into `handleModelAdvice(...)` for model recommendation.

## 2026-03-15 (Generator Prompt Preview Placement)

- Findings: The shared prompt preview on Generator was positioned inside the Quick Start content column instead of directly beneath the Quickstart/Prompt Builder tab switcher.
- Conclusions: The preview is easier to scan and feels more global to the page when it sits immediately below the tab controls, before the selected tab content.
- Actions: Updated `src/screens/Generator.tsx` to render the shared `PromptPreview` directly under the Generator tab switcher and removed the older embedded preview block from the right-side Magic Random controls column.

## 2026-03-15 (Model Advisor: 1-click Apply Recommended Model)

- Findings: User approved adding a direct action to apply the advisor recommendation so saved prompts retain the advised NightCafe model.
- Conclusions: The cleanest UX is a single button in the Model Advisor result card that sets the save model immediately and reuses it in Generator save flow.
- Actions: Updated `src/screens/Generator.tsx` to add `Gebruik aanbevolen model` button on advisor recommendation, persist `advisorSelectedModel` in `generatorUiState`, show active save-model indicator, and save this model in `handleSaveToLibrary` (`model: advisorSelectedModel.trim()`); validated with `npm run build`.

## 2026-03-15 (Model Advisor: Rule-based + AI-based)

- Findings: User requested a model advisor that can recommend the best NightCafe model from a prompt/concept, with both offline scoring and AI-assisted reasoning.
- Conclusions: Best fit is a dual-mode implementation inside Generator: (A) local rule-based ranking over cached NightCafe model scores (`artScore`, `realismScore`, `typographyScore`, `promptingScore`, `costTier`) and (B) AI-based recommendation using the existing Research & Reasoning route (`general`) configured in AI Configuration.
- Actions: Added `generator:adviseModel` in `electron/ipc/ai.ts` with two modes (`rule` and `ai`), including keyword-driven weighting for rule mode and structured JSON recommendation parsing for AI mode; wired DB access into AI IPC via `electron/services/ipcRegistry.ts`; exposed API in `electron/preload.ts` and `src/types/electron.d.ts`; added a new `Model Advisor` section in `src/screens/Generator.tsx` with prompt input, two analysis buttons, recommendation card, alternatives, and persisted advisor state in `generatorUiState`; validated with `npm run build`.

## 2026-03-14 (Magic Quick Start In Generator)

- Findings: Generator page had only Magic Random and Prompt Builder tabs, with no guided entry point for users who want AI help from a plain idea description.
- Conclusions: A Quick Start tab with a free-form idea textarea, creativity level slider (Focused/Balanced/Wild), optional character picker, and one-click AI expansion gives a simpler on-ramp that auto-generates a full prompt and switches to Magic Random view with the result.
- Actions: Added generator:quickExpand IPC handler in electron/ipc/ai.ts with creativity-tuned temperatures (0.7/1.0/1.4) and optional character context injection; wired bridge in electron/preload.ts and types in src/types/electron.d.ts; added Quick Start tab in src/screens/Generator.tsx with all state persisted to localStorage via generatorUiState.

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

## 2026-03-13 (Characters JSON Text -> JSONB)

- Findings: `characters.images_json` and `characters.details_json` were stored as text-serialized JSON, requiring manual `JSON.parse/stringify` in IPC and limiting DB-level JSON querying.
- Conclusions: Switching to native PostgreSQL `jsonb` improves type-safety in Drizzle and enables structured JSON operations directly in SQL.
- Actions: Updated `src/lib/schema.ts` to use `jsonb(...).$type<...>().default([]).notNull()` for both character JSON columns; refactored `electron/ipc/characters.ts` to handle array values directly (removed string parse/stringify flow); added migration `drizzle/0008_characters_jsonb.sql` converting existing text values to `jsonb` with defaults, and registered it in `drizzle/meta/_journal.json`.

## 2026-03-13 (Fix: JSONB Migration Default Cast Error)

- Findings: Applying `0008_characters_jsonb` failed with Postgres `42804` because existing text defaults on `images_json`/`details_json` could not be auto-cast during `ALTER COLUMN ... TYPE jsonb`.
- Conclusions: For Postgres type conversion, text defaults must be dropped before `TYPE ... USING ...`, then reapplied as `jsonb` defaults.
- Actions: Updated `drizzle/0008_characters_jsonb.sql` to first `DROP DEFAULT` for both columns, then run `TYPE jsonb USING ...`, then `SET DEFAULT '[]'::jsonb`; reran `npm run db:migrate` successfully.

## 2026-03-13 (Characters PK: varchar -> uuid)

- Findings: `characters.id` was modeled as `varchar(64)` while values are UUID-like and used as technical identifiers.
- Conclusions: `uuid` with DB-generated defaults is more expressive and safer than free-form text IDs.
- Actions: Updated `src/lib/schema.ts` to `id: uuid('id').defaultRandom().primaryKey()`; added migration `drizzle/0009_characters_uuid_pk.sql` (with `pgcrypto` extension, safe cast from existing IDs, and `gen_random_uuid()` default); updated `electron/ipc/characters.ts` create flow to rely on DB default UUID when no valid UUID is provided; validated with `npm run build` and `npm run db:migrate`.

## 2026-03-13 (settings.json Schema-Check on Load)

- Findings: `settings.json` was parsed as raw JSON without runtime shape validation, which could silently pass malformed structures for `providerMeta` and `aiConfig.dashboardRoleRouting`.
- Conclusions: Load-time normalization is needed so invalid/legacy values are constrained to expected object shapes before use.
- Actions: Updated `electron/ipc/settings.ts` to validate and normalize loaded settings via explicit runtime guards (`isRecord`, `normalizeProviderMetaMap`, `normalizeRoleRouteState`, `normalizeAiConfigState`, `normalizeStoredSettings`); `readStoredSettings()` now returns sanitized data instead of direct `JSON.parse` output.

## 2026-03-13 (Self-Healing settings.json Write-Back)

- Findings: Runtime normalization prevented malformed config usage in memory, but the underlying `settings.json` file could remain stale/corrupt in structure.
- Conclusions: If parsed settings differ from normalized settings, the cleaned version should be persisted immediately to prevent repeated normalization and future drift.
- Actions: Updated `readStoredSettings()` in `electron/ipc/settings.ts` to compare parsed vs normalized settings and automatically rewrite `settings.json` with normalized content when differences are detected.

## 2026-03-13 (Self-Heal Logging)

- Findings: User requested explicit visibility when self-healing rewrite occurs.
- Conclusions: A small informational log line is enough for diagnostics without changing behavior.
- Actions: Added `console.info('[settings] settings.json normalized and rewritten to disk')` in `electron/ipc/settings.ts` immediately after successful self-heal write-back.

## 2026-03-13 (main.ts Modularization)

- Findings: `electron/main.ts` mixed database bootstrap, migration execution, window creation, and app orchestration in a single large file.
- Conclusions: Moving bootstrap and window concerns into dedicated modules improves maintainability while preserving startup flow.
- Actions: Added `electron/services/databaseBootstrap.ts` (exports `ensurePostgresAndDatabase`, `runMigrations`, `formatErrorMessage`) and `electron/services/windowManager.ts` (exports `createMainWindow`); refactored `electron/main.ts` to orchestrate only (session path setup, db client init, startup sequence, IPC registration, lifecycle hooks); validated with `npm run build` and `npm run db:migrate`.

## 2026-03-13 (Session/GPU Setup Extracted)

- Findings: `main.ts` still contained inline app environment setup (`sessionData` path and GPU shader disk cache switch).
- Conclusions: Extracting this into a dedicated service keeps `main.ts` slimmer and startup concerns better separated.
- Actions: Added `electron/services/appEnvironment.ts` with `configureAppEnvironment()` and replaced inline setup in `electron/main.ts` with a single service call.

## 2026-03-13 (IPC Registry Extracted)

- Findings: `main.ts` still had IPC registration wiring logic mixed into startup orchestration.
- Conclusions: Centralizing handler registration in a dedicated registry service further reduces `main.ts` complexity and keeps startup responsibilities focused.
- Actions: Added `electron/services/ipcRegistry.ts` with `registerIpcHandlers({ db, getOpenRouterSettings, getAiApiRequestLoggingEnabled })`; updated `electron/main.ts` to remove inline registration function and call the registry service.

## 2026-03-13 (Prompt Versioning)

- Findings: Editing a prompt overwrote previous content with no built-in revision history.
- Conclusions: A lightweight snapshot-per-update model provides useful history with minimal UX complexity.
- Actions: Added `prompt_versions` table in `src/lib/schema.ts` and migration `drizzle/0010_prompt_versions.sql` (+ journal update); updated `electron/ipc/prompts.ts` so every `prompts:update` first snapshots current prompt into `prompt_versions` with incrementing `version_number`; added `prompts:listVersions` IPC endpoint and typings in preload/renderer declarations; updated `src/components/PromptForm.tsx` edit mode to show recent history and allow one-click restore into the form before saving.

## 2026-03-13 (Generator Negative Prompt + Improve)

- Findings: Generator page had no dedicated negative prompt field and no AI improvement flow for negative prompts.
- Conclusions: Adding a persistent negative prompt textarea with a separate improve action allows faster iteration while keeping positive/negative flows independent.
- Actions: Updated `src/screens/Generator.tsx` with `negativePrompt` state, persistence in `generatorUiState`, clear/reset behavior, UI textarea, and `Improve Negative Prompt` action; updated save-to-library to store entered negative prompt; added IPC endpoint `generator:improveNegativePrompt` in `electron/ipc/ai.ts` with dedicated instruction for concise comma-separated negative prompts; exposed new method via `electron/preload.ts` and `src/types/electron.d.ts`.

## 2026-03-13 (Negative Prompt Diff View Tabs)

- Findings: User requested a diff/final comparison UX for negative prompt improvements as well.
- Conclusions: Reusing the existing diff viewer component with a dedicated negative tab state keeps UX consistent with positive prompt improvements.
- Actions: Updated `src/screens/Generator.tsx` to track `negativeImprovementDiff` and `negativePromptViewTab`, show `Diff View` / `Final Result` tabs after improving negative prompt, render `PromptDiffView` for comparison, and persist this UI state in `generatorUiState`.
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

## 2026-03-14 � Magic Quickstart merged into Quickstart tab

- Removed the separate **Quick Start** tab from Generator
- Renamed **Magic Random** tab to **Quickstart**
- **Magic Quickstart** card (idea textarea, creativity slider, character picker) now renders as the LEFT column of a 2-column `lg:grid-cols-2` grid
- **Magic Random AI controls** (NightCafe Preset, Max Words slider, action buttons, greylist) render as the RIGHT column in the same tab
- Tab type narrowed from `'generator' | 'builder' | 'quickstart'` to `'generator' | 'builder'`; localStorage load maps legacy `'quickstart'` value ? `'generator'`

## 2026-03-14 � Quickstart Prompt Preview

- Added PromptPreview to the **Magic Quickstart** card in src/screens/Generator.tsx so the Quickstart flow now shows a live preview
- Preview uses generatedPrompt || quickStartIdea as prompt source, includes current
  egativePrompt, maxWords, and greylist highlighting when enabled
