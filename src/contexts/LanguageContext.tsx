import { createContext, useContext, useMemo } from 'react'

export type AppLanguage = 'en' | 'nl'

export type TranslationKey =
  | 'sidebar.logoSub'
  | 'sidebar.nav.dashboard.label'
  | 'sidebar.nav.dashboard.description'
  | 'sidebar.nav.generator.label'
  | 'sidebar.nav.generator.description'
  | 'sidebar.nav.library.label'
  | 'sidebar.nav.library.description'
  | 'sidebar.nav.characters.label'
  | 'sidebar.nav.characters.description'
  | 'sidebar.nav.styleProfiles.label'
  | 'sidebar.nav.styleProfiles.description'
  | 'sidebar.nav.gallery.label'
  | 'sidebar.nav.gallery.description'
  | 'sidebar.nav.usage.label'
  | 'sidebar.nav.usage.description'
  | 'sidebar.nav.settings.label'
  | 'sidebar.nav.settings.description'
  | 'sidebar.nav.aiConfig.label'
  | 'sidebar.nav.aiConfig.description'
  | 'sidebar.language.title'
  | 'sidebar.language.english'
  | 'sidebar.language.dutch'
  | 'app.unexpectedError'
  | 'library.title'
  | 'library.newPrompt'
  | 'library.searchPlaceholder'
  | 'library.modelFilterAll'
  | 'library.promptDeleted'
  | 'library.noPromptTextToCopy'
  | 'library.promptCopied'
  | 'library.promptCopyFailed'
  | 'library.deleteTitle'
  | 'library.deleteMessage'
  | 'library.deleteConfirm'
  | 'library.deleteCancel'

type TranslationMap = Record<TranslationKey, string>

const translations: Record<AppLanguage, TranslationMap> = {
  en: {
    'sidebar.logoSub': 'NightCafe Studio',
    'sidebar.nav.dashboard.label': 'Dashboard',
    'sidebar.nav.dashboard.description': 'Overview & quick actions',
    'sidebar.nav.generator.label': 'Generator',
    'sidebar.nav.generator.description': 'Magic random (AI)',
    'sidebar.nav.library.label': 'Prompt Library',
    'sidebar.nav.library.description': 'Browse & manage prompts',
    'sidebar.nav.characters.label': 'Characters',
    'sidebar.nav.characters.description': 'Reference cast sheets',
    'sidebar.nav.styleProfiles.label': 'Style Profiles',
    'sidebar.nav.styleProfiles.description': 'Reusable style presets',
    'sidebar.nav.gallery.label': 'Gallery',
    'sidebar.nav.gallery.description': 'AI-generated media',
    'sidebar.nav.usage.label': 'Usage',
    'sidebar.nav.usage.description': 'Tokens & cost history',
    'sidebar.nav.settings.label': 'Settings',
    'sidebar.nav.settings.description': 'OpenRouter credentials',
    'sidebar.nav.aiConfig.label': 'AI Configuration',
    'sidebar.nav.aiConfig.description': 'Provider & model routing',
    'sidebar.language.title': 'Language',
    'sidebar.language.english': 'English',
    'sidebar.language.dutch': 'Dutch',
    'app.unexpectedError': 'Unexpected app error. Please try again.',
    'library.title': 'Prompt Library',
    'library.newPrompt': 'New Prompt',
    'library.searchPlaceholder': 'Search prompts...',
    'library.modelFilterAll': 'All models',
    'library.promptDeleted': 'Prompt deleted',
    'library.noPromptTextToCopy': 'No prompt text to copy.',
    'library.promptCopied': 'Prompt copied',
    'library.promptCopyFailed': 'Failed to copy prompt',
    'library.deleteTitle': 'Delete Prompt',
    'library.deleteMessage': 'Are you sure you want to delete this prompt?',
    'library.deleteConfirm': 'Delete',
    'library.deleteCancel': 'Cancel',
  },
  nl: {
    'sidebar.logoSub': 'NightCafe Studio',
    'sidebar.nav.dashboard.label': 'Dashboard',
    'sidebar.nav.dashboard.description': 'Overzicht en snelle acties',
    'sidebar.nav.generator.label': 'Generator',
    'sidebar.nav.generator.description': 'Magic random (AI)',
    'sidebar.nav.library.label': 'Promptbibliotheek',
    'sidebar.nav.library.description': 'Prompts bekijken en beheren',
    'sidebar.nav.characters.label': 'Karakters',
    'sidebar.nav.characters.description': 'Referentiekarakters',
    'sidebar.nav.styleProfiles.label': 'Stijlprofielen',
    'sidebar.nav.styleProfiles.description': 'Herbruikbare stijlpresets',
    'sidebar.nav.gallery.label': 'Galerij',
    'sidebar.nav.gallery.description': 'AI-gegenereerde media',
    'sidebar.nav.usage.label': 'Verbruik',
    'sidebar.nav.usage.description': 'Tokens en kostenhistorie',
    'sidebar.nav.settings.label': 'Instellingen',
    'sidebar.nav.settings.description': 'OpenRouter-gegevens',
    'sidebar.nav.aiConfig.label': 'AI-configuratie',
    'sidebar.nav.aiConfig.description': 'Provider- en modelroutering',
    'sidebar.language.title': 'Taal',
    'sidebar.language.english': 'Engels',
    'sidebar.language.dutch': 'Nederlands',
    'app.unexpectedError': 'Onverwachte appfout. Probeer opnieuw.',
    'library.title': 'Promptbibliotheek',
    'library.newPrompt': 'Nieuwe prompt',
    'library.searchPlaceholder': 'Zoek prompts...',
    'library.modelFilterAll': 'Alle modellen',
    'library.promptDeleted': 'Prompt verwijderd',
    'library.noPromptTextToCopy': 'Geen prompttekst om te kopieren.',
    'library.promptCopied': 'Prompt gekopieerd',
    'library.promptCopyFailed': 'Prompt kopieren mislukt',
    'library.deleteTitle': 'Prompt verwijderen',
    'library.deleteMessage': 'Weet u zeker dat u deze prompt wilt verwijderen?',
    'library.deleteConfirm': 'Verwijderen',
    'library.deleteCancel': 'Annuleren',
  },
}

type LanguageContextValue = {
  language: AppLanguage
  setLanguage: (next: AppLanguage) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({
  language,
  setLanguage,
  children,
}: {
  language: AppLanguage
  setLanguage: (next: AppLanguage) => void
  children: React.ReactNode
}) {
  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguage,
      t: (key) => translations[language][key] ?? translations.en[key],
    }
  }, [language, setLanguage])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }
  return context
}
