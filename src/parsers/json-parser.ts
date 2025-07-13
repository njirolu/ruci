import * as fs from "node:fs/promises";
import * as path from "node:path";

import { InvalidJsonError } from "@/core/errors";
import type { JSONReaderOptions, JSONResult } from "@/types/json";
import { findFilesByPattern } from "@/utils/path";
import { FILE_ENCODING } from "@/constants";

export function parseJson(content: string, filePath?: string): any {
  try {
    return JSON.parse(content);
  } catch (error: any) {
    throw new InvalidJsonError(
      filePath ?? "unknown",
      error.message,
      { path: filePath },
      error,
    );
  }
}

export async function loadTranslationsFromFiles<T = any>(
  filePaths: string[],
  options?: Pick<JSONReaderOptions, "encoding">,
): Promise<JSONResult<T>> {
  const defaultOptions = {
    encoding: FILE_ENCODING as BufferEncoding,
  };
  const config = { ...defaultOptions, ...options };

  const translations: JSONResult<T> = { translations: {} };

  await Promise.all(
    filePaths.map(async (file) => {
      const data = await fs.readFile(file, config.encoding);
      const lang = path.basename(file, ".json");
      translations.translations[lang] = {
        meta: {
          path: file,
          lang,
        },
        value: parseJson(data),
      };
    }),
  );

  return translations;
}

export async function readFileJSON<T>(
  options: JSONReaderOptions,
): Promise<JSONResult<T>> {
  const files = await findFilesByPattern(options);
  const translations = await loadTranslationsFromFiles<T>(files, options);
  return translations;
}

export function flattenObject(obj: any, prefix = ""): Record<string, string> {
  const flattened: Record<string, string> = {};

  if (!obj) {
    return flattened;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null) {
      Object.assign(flattened, flattenObject(value, fullKey));
    } else if (typeof value === "string") {
      flattened[fullKey] = value;
    }
  }
  return flattened;
}
