import * as fs from "node:fs/promises";
import * as path from "node:path";

import { glob } from "glob";

import { FileNotFoundError, FileSystemError } from "@/core/errors";
import { parseJson } from "@/parsers/json-parser";
import type { TranslationFile } from "@/types/translation";
import { startSpinner, succeedSpinner } from "@/utils/spinner";
import { FILE_ENCODING } from "@/constants";

export async function readTranslationFile(
  filePath: string,
  baseDir: string,
  spinnerMessage?: string,
): Promise<TranslationFile> {
  if (spinnerMessage) {
    startSpinner(spinnerMessage);
  }
  try {
    const content = await fs.readFile(filePath, FILE_ENCODING);
    const translationFile = {
      path: path.relative(baseDir, filePath),
      data: parseJson(content, filePath),
    };
    if (spinnerMessage) {
      succeedSpinner(spinnerMessage);
    }
    return translationFile;
  } catch (error) {
    throw new FileSystemError(
      `Failed to read file: ${filePath}`,
      { path: filePath },
      error,
    );
  }
}

export async function readTranslationFiles(
  baseDir: string,
  pattern: string,
): Promise<TranslationFile[]> {
  const files = await glob(pattern, { cwd: baseDir, absolute: true });

  if (files.length === 0) {
    throw new FileNotFoundError(pattern, { path: baseDir });
  }

  const translationFiles: TranslationFile[] = [];
  for (const file of files) {
    const spinnerMessage = `Reading and parsing ${path.relative(
      baseDir,
      file,
    )}...`;
    const translationFile = await readTranslationFile(
      file,
      baseDir,
      spinnerMessage,
    );
    translationFiles.push(translationFile);
  }

  return translationFiles;
}
