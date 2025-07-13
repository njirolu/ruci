import { glob } from "glob";

import { flattenObject } from "@/parsers/json-parser";
import { readTranslationFile } from "@/core/services/file-reader";
import { extractTranslationUsagesFromFile } from "@/core/services/key-extractor";
import type {
  TranslationUsage,
  VerifyProjectKeysResult,
} from "@/types/translation";

export async function verifyProjectKeys(
  projectFilePatterns: string[],
  baseLanguagePath: string,
  baseDir: string,
): Promise<VerifyProjectKeysResult> {
  const allProjectFilePaths = (
    await Promise.all(
      projectFilePatterns.map((pattern) =>
        glob(pattern, { cwd: baseDir, absolute: true }),
      ),
    )
  ).flat();

  const htmlFilePaths = allProjectFilePaths.filter((file) =>
    file.endsWith(".html"),
  );
  const tsFilePaths = allProjectFilePaths.filter((file) =>
    file.endsWith(".ts"),
  );

  const allUsages: TranslationUsage[] = [];

  const htmlProcessingTasks = htmlFilePaths.map((filePath) =>
    extractTranslationUsagesFromFile(filePath, "html"),
  );
  const tsProcessingTasks = tsFilePaths.map((filePath) =>
    extractTranslationUsagesFromFile(filePath, "typescript"),
  );

  const settledResults = await Promise.allSettled([
    ...htmlProcessingTasks,
    ...tsProcessingTasks,
  ]);

  for (const result of settledResults) {
    if (result.status === "fulfilled") {
      allUsages.push(...result.value);
    } else {
      console.error(`⚠️ Failed to process a file:`, result.reason);
    }
  }

  const baseLangFile = await readTranslationFile(baseLanguagePath, baseDir);
  const baseLangKeys = new Set(Object.keys(flattenObject(baseLangFile.data)));

  const usedKeysInProject = new Set(allUsages.map((usage) => usage.key));

  const missingInProject: TranslationUsage[] = [];
  for (const key of baseLangKeys) {
    if (!usedKeysInProject.has(key)) {
      missingInProject.push({
        key: key,
        filePath: "N/A", // Not applicable as it's missing across the project
        lineNumber: 0,
        fileType: "html", // Placeholder, as it's not tied to a specific file type
      });
    }
  }

  const unusedInBaseLanguage: string[] = [];
  for (const key of usedKeysInProject) {
    if (!baseLangKeys.has(key)) {
      unusedInBaseLanguage.push(key);
    }
  }

  return {
    missingInProject,
    unusedInBaseLanguage: allUsages.filter(
      (usage) => !baseLangKeys.has(usage.key),
    ),
  };
}
