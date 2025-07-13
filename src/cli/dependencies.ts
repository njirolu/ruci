import type { ValidatedConfig } from "@/types/config";
import type { TranslationFile } from "@/types/translation";

import type { CliOptions } from "@/types/config";

export interface FileReaderService {
  readTranslationFile(
    filePath: string,
    baseDir: string,
    spinnerMessage?: string,
  ): Promise<TranslationFile>;

  readTranslationFiles(
    baseDir: string,
    pattern: string,
  ): Promise<TranslationFile[]>;
}

export interface ConfigLoaderService {
  loadConfig(opts: CliOptions): Promise<ValidatedConfig>;
}

export interface FileSystemService {
  writeFile(path: string, content: string): Promise<void>;
}

export interface ConsoleService {
  log(message: string): void;
  error(message: string): void;
  info(message: string): void;
}

export interface ProcessService {
  exit(code: number): void;
  cwd(): string;
}

export interface CommandDependencies {
  fileReader: FileReaderService;
  configLoader: ConfigLoaderService;
  fileSystem: FileSystemService;
  console: ConsoleService;
  process: ProcessService;
}

export function createDefaultDependencies(): CommandDependencies {
  return {
    fileReader: {
      readTranslationFile: require("@/core/services/file-reader")
        .readTranslationFile,
      readTranslationFiles: require("@/core/services/file-reader")
        .readTranslationFiles,
    },
    configLoader: {
      loadConfig: require("@/config/loader").loadConfig,
    },
    fileSystem: {
      writeFile: require("node:fs/promises").writeFile,
    },
    console: {
      log: console.log,
      error: console.error,
      info: console.info,
    },
    process: {
      exit: process.exit,
      cwd: process.cwd,
    },
  };
}
