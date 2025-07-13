import { flattenObject } from "@/parsers/json-parser";
import type {
  DuplicateValuesResult,
  TranslationFile,
} from "@/types/translation";

function groupKeysByDuplicateValue(flattenedObject: Record<string, string>) {
  const valueToKeysMap: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(flattenedObject)) {
    valueToKeysMap[value] = valueToKeysMap[value] || [];
    valueToKeysMap[value].push(key);
  }

  return Object.entries(valueToKeysMap)
    .filter(([, keys]) => keys.length > 1)
    .map(([value, keys]) => ({ value, keys }));
}

export function findDuplicateValues(
  translationFiles: TranslationFile[],
): DuplicateValuesResult[] {
  const results: DuplicateValuesResult[] = [];

  for (const file of translationFiles) {
    const flattenedTranslations = flattenObject(file.data);
    const totalKeys = Object.keys(flattenedTranslations).length;
    const duplicates = groupKeysByDuplicateValue(flattenedTranslations);

    if (duplicates.length > 0) {
      results.push({
        filePath: file.path,
        duplicates,
        totalKeys,
      });
    }
  }

  return results;
}
