export const DEFAULT_LANGUAGE = "lv";
export const SUPPORTED_LANGUAGES = ["lv", "it", "en"];
export const LANGUAGE_OPTIONS = [
  { id: "lv", label: "LV" },
  { id: "it", label: "IT" },
  { id: "en", label: "EN" },
];

export function normalizeLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}

export function getLanguageCopy(language, copies) {
  const normalizedLanguage = normalizeLanguage(language);
  return copies[normalizedLanguage] || copies[DEFAULT_LANGUAGE] || copies.it || copies.en;
}

export function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem("talea:language");
    return stored ? normalizeLanguage(stored) : null;
  } catch {
    return null;
  }
}

export function persistLanguage(language) {
  try {
    window.localStorage.setItem("talea:language", normalizeLanguage(language));
  } catch {
    // Ignore storage failures and keep the in-memory preference.
  }
}
