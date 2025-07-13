import { flattenObject } from "@/parsers/json-parser";
import type { TranslationFile, UnusedKeysResult } from "@/types/translation";

export function findUnusedKeys(
  baseLangFile: TranslationFile,
  otherLangFiles: TranslationFile[],
): UnusedKeysResult[] {
  const results: UnusedKeysResult[] = [];
  const baseLangKeys = new Set(Object.keys(flattenObject(baseLangFile.data)));

  for (const otherLangFile of otherLangFiles) {
    const otherLangKeys = new Set(
      Object.keys(flattenObject(otherLangFile.data)),
    );
    const unusedKeys: { key: string; value: string }[] = [];

    for (const key of otherLangKeys) {
      if (!baseLangKeys.has(key)) {
        unusedKeys.push({ key, value: "N/A" }); // We don't have the value in the base language file
      }
    }

    if (unusedKeys.length > 0) {
      results.push({
        filePath: otherLangFile.path,
        unusedKeys,
      });
    }
  }

  return results;
}
