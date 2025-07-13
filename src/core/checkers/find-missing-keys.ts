import { flattenObject } from "@/parsers/json-parser";
import type { TranslationFile, MissingKeysResult } from "@/types/translation";

export function findMissingKeys(
  baseLangFile: TranslationFile,
  otherLangFiles: TranslationFile[],
): MissingKeysResult[] {
  const results: MissingKeysResult[] = [];
  const baseLangKeys = new Set(Object.keys(flattenObject(baseLangFile.data)));

  for (const otherLangFile of otherLangFiles) {
    const otherLangKeys = new Set(
      Object.keys(flattenObject(otherLangFile.data)),
    );
    const missingKeys: { key: string; value: string }[] = [];

    for (const key of baseLangKeys) {
      if (!otherLangKeys.has(key)) {
        missingKeys.push({ key, value: "N/A" }); // We don't have the value in the other language file
      }
    }

    if (missingKeys.length > 0) {
      results.push({
        filePath: otherLangFile.path,
        missingKeys,
      });
    }
  }

  return results;
}
