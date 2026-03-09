# Walkthrough

## 2026-03-09
- Findings: Settings page for OpenRouter credentials is implemented and wired into sidebar/app navigation.
- Conclusions: Credential storage and retrieval are available through Electron IPC (`settings:getOpenRouter`, `settings:saveOpenRouter`) and consumed by renderer settings form.
- Actions: Verified the relevant files and wiring (`src/screens/Settings.tsx`, `src/App.tsx`, `src/components/Sidebar.tsx`, `electron/preload.ts`, `electron/main.ts`).

## 2026-03-09 (Cache Error Fix)
- Findings: Electron/Chromium reported Windows cache access-denied errors (`cache_util_win.cc`, `gpu_disk_cache.cc`) during startup.
- Conclusions: Session/cache path can be unwritable or locked on some Windows setups; moving session data to temp and disabling GPU shader disk cache avoids this failure mode.
- Actions: Updated `electron/main.ts` to set `sessionData` path to `%TEMP%\\NightCompanion\\session-data` and append `disable-gpu-shader-disk-cache` switch before app startup.
