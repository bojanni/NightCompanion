# NightCompanion — Agent Rules

> Deze regels zijn afgeleid van de daadwerkelijke codebase en walkthrough.md.
> De agent MOET deze regels lezen en volgen bij elke taak.

---

## 1. Algemene werkwijze

- Lees altijd eerst de relevante bestaande code voordat je wijzigingen maakt.
- Valideer elke wijziging met `npm run build` voordat je de taak als afgerond beschouwt.
- Update `walkthrough.md` na elke betekenisvolle wijziging (zie sectie 8).
- Update `nightcompanion.md` wanneer gebruikersgerichte functionaliteit verandert.
- Gebruik LM Studio: "Generate commit message" voor commit-berichten wanneer mogelijk.

---

## 2. Projectstructuur — verplichte locaties

| Type                  | Locatie                              |
|-----------------------|--------------------------------------|
| Schermen (pages)      | `src/screens/`                       |
| Gedeelde componenten  | `src/components/`                    |
| Hooks                 | `src/hooks/`                         |
| Types (renderer)      | `src/types/index.ts`                 |
| Electron types bridge | `src/types/electron.d.ts`            |
| Electron main         | `electron/main.ts`                   |
| IPC handlers          | `electron/ipc/<domein>.ts`           |
| Electron services     | `electron/services/`                 |
| Preload bridge        | `electron/preload.ts`                |
| DB schema             | `src/lib/schema.ts`                  |
| Migraties             | `drizzle/<volgnummer>_<naam>.sql`    |
| Migratiejournal       | `drizzle/meta/_journal.json`         |
| Constanten            | `src/lib/constants.ts`               |
| Providers config      | `src/lib/providers.ts`               |

Maak **geen** nieuwe bestanden op willekeurige locaties. Volg bovenstaande structuur altijd.

---

## 3. IPC — regels

### Naamgeving
- Gebruik het patroon `domein:actie`, bijv. `prompts:list`, `settings:saveOpenRouter`, `characters:saveImage`.
- Domeinen zijn enkelvoud of camelCase: `prompts`, `styleProfiles`, `generationLog`, `nightcafeModels`, `settings`, `generator`.

### Structuur
- Elke IPC-handler komt in een eigen bestand: `electron/ipc/<domein>.ts`.
- Elke handler exporteert één `register<Domein>Ipc({ db, ... })` functie.
- Registreer handlers uitsluitend via `electron/services/ipcRegistry.ts` — nooit direct in `main.ts`.
- Alle handlers retourneren `{ data }` bij succes of `{ error: String(error) }` bij falen — nooit een raw throw.

### Nieuw IPC-kanaal toevoegen — verplichte stappen
1. Handler implementeren in `electron/ipc/<domein>.ts`
2. Registreren in `electron/services/ipcRegistry.ts`
3. Exposeren in `electron/preload.ts`
4. Typen toevoegen in `src/types/electron.d.ts`
5. Gebruiken via `window.electronAPI.<domein>.<actie>()` in de renderer

Sla **geen** stap over — een ontbrekende stap veroorzaakt runtime-fouten.

---

## 4. Database — regels

### Schema
- Alle tabellen worden gedefinieerd in `src/lib/schema.ts` met Drizzle ORM.
- Gebruik `jsonb(...).$type<T>().default([]).notNull()` voor JSON-arrays (niet `text`).
- Gebruik `uuid('id').defaultRandom().primaryKey()` voor UUID primary keys.
- Voeg altijd `createdAt` en `updatedAt` toe aan nieuwe tabellen.

### Migraties
- Elke schemawijziging vereist een nieuwe migratieSQL in `drizzle/`.
- Bestandsnaam: `<volgnummer>_<beschrijvende_naam>.sql`, bijv. `0013_prompt_images.sql`.
- Registreer de migratie altijd in `drizzle/meta/_journal.json`.
- Test met `npm run db:migrate` na aanmaken.
- Verwijder nooit bestaande migraties — voeg alleen nieuwe toe.

### Queries
- Gebruik altijd Drizzle query-builders — geen raw SQL tenzij het echt niet anders kan.
- Gebruik `desc(tabel.createdAt)` als standaard sortering voor lijsten.
- Geef altijd een `.returning()` terug bij insert/update zodat de renderer actuele data krijgt.

---

## 5. Opslag & bestandsbeheer

- Gebruik **nooit** `localStorage` in de renderer voor persistente data — gebruik altijd Electron IPC naar `settings.json` of de database.
- Afbeeldingen worden opgeslagen via `electron/services/storagePaths.ts` (`resolveNightCompanionSubdir`).
- Standaardpad: `%LocalAppData%\NightCompanion\` (configureerbaar via Settings).
- Verwijder bestanden alleen binnen gevalideerde managed roots (`isPathWithin`).
- Sla afbeeldingen op als bestand met `file://` URL — nooit als base64 in de database.

---

## 6. TypeScript — regels

- Gebruik **altijd** expliciete typen — geen `any`.
- Definieer lokale types bovenaan het bestand als ze niet gedeeld worden.
- Gebruik `type` (niet `interface`) voor object-shapes.
- Gebruik `ReturnType<typeof drizzle<typeof schema>>` als `Database` type in IPC-bestanden.
- Gebruik `void` operator voor fire-and-forget async calls: `void handleAction()`.
- Gebruik **geen** `!` non-null assertions — valideer liever expliciet.

---

## 7. React & UI — regels

### Componenten
- Schermen (`src/screens/`) zijn pagina-level componenten — houd ze gefocust op één domein.
- Gedeelde UI-elementen horen in `src/components/`.
- Gebruik **geen** `<form>` elements — gebruik `onClick`/`onChange` handlers.
- Gebruik **geen** inline `style={{}}` — gebruik Tailwind klassen of `src/index.css` component-klassen.

### Tailwind
- Gebruik uitsluitend de design tokens uit `tailwind.config.js`:
  - Achtergrond: `bg-night-950` t/m `bg-night-700`
  - Tekst: `text-night-100` t/m `text-night-400`
  - Accenten: `glow-purple`, `glow-blue`, `glow-cyan`, `glow-pink`, `glow-soft`
  - Schaduwen: `shadow-glow`, `shadow-glow-sm`, `shadow-glow-blue`
  - Gradients: `bg-gradient-card`, `bg-gradient-sidebar`, `bg-gradient-night`
- Gebruik de gedefinieerde component-klassen: `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.input`, `.textarea`, `.label`, `.card`, `.tag`.
- Gebruik **geen** willekeurige hexadecimale kleuren of pixel-waarden buiten de config.

### State
- Gebruik `useState` en `useEffect` — geen externe state-manager.
- Laad data in `useEffect` via IPC en sla op in lokale component state.
- Gebruik de dashboard-cache (`DashboardCache`) voor Dashboard; invalideer bij schrijfoperaties.

### Navigatie
- Schermen worden geregistreerd in `src/types/index.ts` (`Screen` type).
- Navigatie-items worden toegevoegd aan `src/components/Sidebar.tsx` (`NAV_ITEMS` array).
- Routing gebeurt in `src/App.tsx` via een switch op `activeScreen`.

---

## 8. Walkthrough.md — verplicht format

Voeg na elke significante wijziging een entry toe aan `walkthrough.md`:

```markdown
## YYYY-MM-DD (Korte titel van de wijziging)

- Findings: [Wat was het probleem of de aanleiding?]
- Conclusions: [Waarom is deze aanpak gekozen?]
- Actions: [Welke bestanden zijn gewijzigd en wat is er precies gedaan?]; gevalideerd met `npm run build`.
```

Vermeld altijd de gewijzigde bestanden met hun pad.

---

## 9. AI-prompts & taal

- Alle AI output instructies gebruiken **English (UK)** spelling (colour, centre, maximise).
- AI-constanten (`BASE_PERSONA`, `IMPROVE_INSTRUCTION`, etc.) leven in `electron/ipc/ai.ts`.
- Voeg geen nieuwe AI-instructies toe in de renderer — alleen in de Electron IPC laag.
- Output van AI-routes is altijd plain text, geen markdown tenzij expliciet anders vereist.

---

## 10. Foutafhandeling

- Alle IPC-handlers gebruiken `try/catch` en retourneren `{ error: String(error) }`.
- De renderer checkt altijd op `result.error` voor gebruik van `result.data`.
- Gebruik `sonner` toast-notificaties voor gebruikersfeedback:
  - `toast.success(...)` bij succes
  - `toast.error(...)` bij fout
  - `toast.warning(...)` bij gedeeltelijk succes (bijv. key opgeslagen, sync mislukt)
- Gebruik `ErrorBoundary` in `src/main.tsx` — niet verwijderen.

---

## 11. Verboden patronen

| Verboden                                   | Gebruik in plaats daarvan                        |
|--------------------------------------------|--------------------------------------------------|
| `localStorage.setItem(...)` voor settings  | Electron IPC `settings:save*`                    |
| `localStorage.setItem(...)` voor images    | IPC + `storagePaths.ts`                          |
| Raw `JSON.parse` van settings zonder check | `normalizeStoredSettings()` in `settings.ts`     |
| Direct schrijven in `electron/main.ts`     | Service in `electron/services/` of IPC in `electron/ipc/` |
| `interface` voor object types              | `type`                                           |
| Inline `style={{}}`                        | Tailwind klassen                                 |
| Nieuwe dependencies zonder check           | Controleer of een bestaande dep volstaat         |
| `any` als type                             | Definieer een expliciet type                     |
| `<form>` element                           | `<div>` met onClick handlers                     |

---

## 12. Commit-berichten

- Gebruik de tegenwoordige tijd: "Add feature" niet "Added feature".
- Begin met een hoofdletter.
- Wees specifiek: beschrijf **wat** en **waarom**, niet alleen **wat**.
- Gebruik LM Studio: "Generate commit message" wanneer beschikbaar.

Voorbeelden:
- ✅ `Add prompt image upload with local file persistence`
- ✅ `Fix: Dashboard cache not invalidated after prompt creation`
- ❌ `Fix bug`
- ❌ `Update code`
