import * as path from "node:path";

import { program } from "commander";
import chalk from "chalk";

import type { ValidatedConfig } from "@/types/config";
import { CHECK_LEVELS, CONFIG } from "@/constants";
import { findDuplicateValues } from "@/core/checkers/find-duplicate-values";
import { findMissingKeys } from "@/core/checkers/find-missing-keys";
import { findUnusedKeys } from "@/core/checkers/find-unused-keys";
import { verifyProjectKeys } from "@/core/checkers/verify-project-keys";
import { FileSystemError } from "@/core/errors";
import {
  reportDuplicateValues,
  reportMissingKeys,
  reportUnusedKeys,
  reportVerifyProjectKeys,
} from "@/reporters/console-reporter";
import type { TranslationFile } from "@/types/translation";
import { startSpinner, succeedSpinner } from "@/utils/spinner";

import type { CliOptions } from "@/types/config";
import type { CommandDependencies } from "./dependencies";
import { createDefaultDependencies } from "./dependencies";

export function setupCommands(
  exitOnError = true,
  dependencies: CommandDependencies = createDefaultDependencies(),
  programInstance = program,
) {
  programInstance
    .command("init")
    .description("Initializes ruci.config.json in the current directory")
    .action(async () => {
      const configPath = path.join(
        process.cwd(),
        CONFIG.DEFAULT_CONFIG_FILENAME,
      );
      try {
        await dependencies.fileSystem.writeFile(
          configPath,
          JSON.stringify(CONFIG.DEFAULT_VALUES, null, 2),
        );
        dependencies.console.log(`Successfully created ${configPath}`);
        // biome-ignore lint/suspicious/noExplicitAny: Unknown error
      } catch (error: any) {
        throw new FileSystemError(
          `Failed to create ruci.config.json at ${configPath}`,
          { path: configPath },
          error,
        );
      }
    });

  programInstance.action(async () => {
    const opts: CliOptions = programInstance.opts();
    const config: ValidatedConfig =
      await dependencies.configLoader.loadConfig(opts);

    // Determine which checks to run based on CLI options or config defaults
    const effectiveMissingKeysLevel =
      opts.missingKeys || config.options.missingKeys;
    const effectiveUnusedKeysLevel =
      opts.unusedKeys || config.options.unusedKeys;

    const effectiveDuplicateValuesLevel =
      opts.duplicateValues || config.options.duplicateValues;
    const effectiveVerifyProjectKeysLevel =
      opts.verifyProjectKeys || config.options.verifyProjectKeys;

    const runMissingKeys =
      CHECK_LEVELS.includes(effectiveMissingKeysLevel) &&
      effectiveMissingKeysLevel !== "skip";
    const runUnusedKeys =
      CHECK_LEVELS.includes(effectiveUnusedKeysLevel) &&
      effectiveUnusedKeysLevel !== "skip";
    const runDuplicateValues =
      CHECK_LEVELS.includes(effectiveDuplicateValuesLevel) &&
      effectiveDuplicateValuesLevel !== "skip";
    const runVerifyProjectKeys =
      CHECK_LEVELS.includes(effectiveVerifyProjectKeysLevel) &&
      effectiveVerifyProjectKeysLevel !== "skip";

    // If no checks are enabled by either CLI or config, show help.
    if (
      !runMissingKeys &&
      !runUnusedKeys &&
      !runDuplicateValues &&
      !runVerifyProjectKeys
    ) {
      programInstance.help();
      return;
    }

    let hasError = false;

    let baseLangFile: TranslationFile | null = null;
    let languageFiles: TranslationFile[] | null = null;

    const getBaseLangFile = async (): Promise<TranslationFile> => {
      if (baseLangFile === null) {
        if (!config.baseLanguagePath) {
          dependencies.console.error(
            "Error: baseLanguagePath is not defined but is required.",
          );
          programInstance.help();
          dependencies.process.exit(1);
        }
        baseLangFile = await dependencies.fileReader.readTranslationFile(
          config.baseLanguagePath,
          config.baseDir,
          `Reading base language file: ${config.baseLanguagePath}`,
        );
      }
      return baseLangFile;
    };

    const getLanguageFiles = async (): Promise<TranslationFile[]> => {
      if (languageFiles === null) {
        if (config.languagePaths.length === 0) {
          return [];
        }
        const files = await Promise.all(
          config.languagePaths.map((pattern) =>
            dependencies.fileReader.readTranslationFiles(
              config.baseDir,
              pattern,
            ),
          ),
        );
        languageFiles = files.flat();
      }
      return languageFiles;
    };

    if (runMissingKeys) {
      if (!config.baseLanguagePath || config.languagePaths.length === 0) {
        dependencies.console.error(
          "Error: --base-language-path and --language-paths are required for missing keys check.",
        );
        programInstance.help();
        return;
      }
      const baseFile = await getBaseLangFile();
      const langFiles = await getLanguageFiles();

      startSpinner("Finding missing keys...");
      const missingKeysResults = findMissingKeys(baseFile, langFiles);
      succeedSpinner("Missing keys check complete.");
      reportMissingKeys(missingKeysResults);
      if (
        effectiveMissingKeysLevel === "error" &&
        missingKeysResults.length > 0
      ) {
        hasError = true;
      }

      if (missingKeysResults.length <= 0) {
        dependencies.console.info(
          chalk.greenBright(
            "✅ [Missing Keys] Translation Keys Available for All Languages",
          ),
        );
      }
    }

    if (runUnusedKeys) {
      if (!config.baseLanguagePath || config.languagePaths.length === 0) {
        dependencies.console.error(
          "Error: --base-language-path and --language-paths are required for unused keys check.",
        );
        programInstance.help();
        return;
      }
      const baseFile = await getBaseLangFile();
      const langFiles = await getLanguageFiles();

      startSpinner("Finding unused keys...");
      const unusedKeysResults = findUnusedKeys(baseFile, langFiles);
      succeedSpinner("Unused keys check complete.");
      reportUnusedKeys(unusedKeysResults);
      if (
        effectiveUnusedKeysLevel === "error" &&
        unusedKeysResults.length > 0
      ) {
        hasError = true;
      }

      if (unusedKeysResults.length <= 0) {
        dependencies.console.info(
          chalk.greenBright(
            "✅ [Unused Keys] All Translation Keys Are Actively Used.",
          ),
        );
      }
    }

    if (runDuplicateValues) {
      if (!config.baseLanguagePath || config.languagePaths.length === 0) {
        dependencies.console.error(
          "Error: --base-language-path and --language-paths are required for duplicate values check.",
        );
        programInstance.help();
        return;
      }
      const baseFile = await getBaseLangFile();
      const langFiles = await getLanguageFiles();
      const allTranslationFiles = [baseFile, ...langFiles];

      startSpinner("Finding duplicate values...");
      const duplicateValuesResults = findDuplicateValues(allTranslationFiles);
      succeedSpinner("Duplicate values check complete.");
      reportDuplicateValues(duplicateValuesResults);
      if (
        effectiveDuplicateValuesLevel === "error" &&
        duplicateValuesResults.length > 0
      ) {
        dependencies.console.error("Error: Duplicate values found.");
        hasError = true;
      }

      if (duplicateValuesResults.length <= 0) {
        dependencies.console.info(
          chalk.greenBright("✅ [Duplicate Values] No Duplicate Values Found"),
        );
      }
    }

    if (runVerifyProjectKeys) {
      if (!config.projectFiles || config.projectFiles.length === 0) {
        dependencies.console.error(
          "Error: --project-files is required for verifying project keys.",
        );
        programInstance.help();
        return;
      }
      if (!config.baseLanguagePath) {
        dependencies.console.error(
          "Error: --base-language-path is required for verifying project keys.",
        );
        programInstance.help();
        return;
      }

      startSpinner("Verifying project keys...");
      const verifyProjectKeysResults = await verifyProjectKeys(
        config.projectFiles,
        config.baseLanguagePath,
        config.baseDir,
      );
      succeedSpinner("Project keys verification complete.");
      reportVerifyProjectKeys(verifyProjectKeysResults);

      if (
        effectiveVerifyProjectKeysLevel === "error" &&
        verifyProjectKeysResults.unusedInBaseLanguage.length > 0
      ) {
        dependencies.console.error("Error: Project key verification failed.");
        hasError = true;
      }

      if (verifyProjectKeysResults.unusedInBaseLanguage.length === 0) {
        dependencies.console.info(
          chalk.greenBright("✅ [Project Keys] All Keys are Valid"),
        );
      }
    }

    if (hasError && exitOnError) {
      dependencies.console.error(
        chalk.red("\nExiting due to detected errors."),
      );
      dependencies.process.exit(1);
    }
  });
  return programInstance;
}
