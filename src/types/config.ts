export type RuciOptionSeverity = "skip" | "warn" | "error";

export interface RuciConfig {
  baseLanguagePath: string;
  languagePaths: string[];
  projectFiles: string[];
  options: {
    missingKeys: RuciOptionSeverity;
    unusedKeys: RuciOptionSeverity;
    duplicateValues: RuciOptionSeverity;
    verifyProjectKeys: RuciOptionSeverity;
  };
}

export interface ValidatedConfig extends RuciConfig {
  baseDir: string;
}

export interface CliOptions {
  baseLanguagePath?: string;
  languagePaths?: string[];
  projectFiles?: string[];
  missingKeys?: RuciOptionSeverity;
  unusedKeys?: RuciOptionSeverity;
  duplicateValues?: RuciOptionSeverity;
  verifyProjectKeys?: RuciOptionSeverity;
}
