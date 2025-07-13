export const CHECK_LEVELS = ["skip", "warn", "error"] as const;

export const CONFIG = {
  DEFAULT_CONFIG_FILENAME: "ruci.config.json",
  DEFAULT_VALUES: {
    baseLanguagePath: "src/assets/i18n/en.json",
    languagePaths: [
      "src/assets/i18n/es.json",
      "src/assets/i18n/fr.json",
    ] as string[],
    projectFiles: ["src/**/*.ts", "src/**/*.html"] as string[],
    options: {
      missingKeys: "skip",
      unusedKeys: "skip",
      duplicateValues: "skip",
      verifyProjectKeys: "skip",
    },
  },
} as const;

export const FILE_ENCODING = "utf-8" as const;

export const CLI_OPTION_DESCRIPTIONS = {
  BASE_LANGUAGE_PATH: "Path to the base language file",
  LANGUAGE_PATHS: "Paths to other language files",
  PROJECT_FILES: "Paths to project files",
  MISSING_KEYS: "Find missing keys in translation files (warn|error|skip)",
  UNUSED_KEYS: "Find unused keys in translation files (warn|error|skip)",
  DUPLICATE_VALUES:
    "Find duplicate values in translation files (warn|error|skip)",
  VERIFY_PROJECT_KEYS:
    "Verify translation keys used in project files (warn|error|skip)",
} as const;
