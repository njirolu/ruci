import * as fs from "node:fs/promises";
import * as path from "node:path";

import { FileSystemError, InvalidJsonError } from "@/core/errors";
import type { RuciConfig, ValidatedConfig } from "@/types/config";
import { CONFIG, FILE_ENCODING } from "@/constants";

export async function loadConfig(
  cliArgs: Partial<RuciConfig> = {},
): Promise<ValidatedConfig> {
  const baseDir = process.cwd();
  const configPath = path.join(baseDir, CONFIG.DEFAULT_CONFIG_FILENAME);
  let fileConfig: Partial<RuciConfig> = {};

  try {
    const fileContent = await fs.readFile(configPath, FILE_ENCODING);
    try {
      fileConfig = JSON.parse(fileContent);
    } catch (error: unknown) {
      if (error instanceof SyntaxError) {
        throw new InvalidJsonError(
          configPath,
          error.message,
          { path: configPath },
          error,
        );
      }
      throw error;
    }
    // biome-ignore lint/suspicious/noExplicitAny: unknown error
  } catch (error: any) {
    if (error.code === "ENOENT") {
      // If config file doesn't exist, proceed with default config
    } else {
      throw new FileSystemError(
        `Failed to read config file: ${configPath}`,
        { path: configPath },
        error,
      );
    }
  }

  const mergedConfig: RuciConfig = {
    ...CONFIG.DEFAULT_VALUES,
    ...fileConfig,
    ...cliArgs,
  };

  return {
    ...mergedConfig,
    baseDir,
  };
}
