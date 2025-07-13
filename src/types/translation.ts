export type TranslationData = Record<
  string,
  string | number | boolean | null | Record<string, unknown>
>;

export interface TranslationFile {
  path: string;
  data: TranslationData;
}

export interface CheckResult {
  filePath: string;
}

export interface MissingKeyInfo {
  key: string;
  value: string | number | boolean | null | Record<string, unknown>;
}

export interface MissingKeysResult extends CheckResult {
  missingKeys: MissingKeyInfo[];
}

export interface UnusedKeyInfo {
  key: string;
  value: string | number | boolean | null | Record<string, unknown>;
}

export interface UnusedKeysResult extends CheckResult {
  unusedKeys: UnusedKeyInfo[];
}

export interface DuplicateValueInfo {
  value: string;
  keys: string[];
}

export interface DuplicateValuesResult extends CheckResult {
  duplicates: DuplicateValueInfo[];
  totalKeys: number;
}

export interface TranslationUsage {
  key: string;
  filePath: string;
  lineNumber: number;
  fileType: "html" | "typescript";
}

export interface VerifyProjectKeysResult {
  missingInProject: TranslationUsage[];
  unusedInBaseLanguage: TranslationUsage[];
}
