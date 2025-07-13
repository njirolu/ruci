import { program } from "commander";
import { CLI_OPTION_DESCRIPTIONS } from "@/constants";

export function setupOptions() {
  program
    .option(
      "--base-language-path <path>",
      CLI_OPTION_DESCRIPTIONS.BASE_LANGUAGE_PATH,
    )
    .option(
      "--language-paths <paths...>",
      CLI_OPTION_DESCRIPTIONS.LANGUAGE_PATHS,
    )
    .option("--project-files <files...>", CLI_OPTION_DESCRIPTIONS.PROJECT_FILES)
    .option("--missing-keys <level>", CLI_OPTION_DESCRIPTIONS.MISSING_KEYS)
    .option("--unused-keys <level>", CLI_OPTION_DESCRIPTIONS.UNUSED_KEYS)
    .option(
      "--duplicate-values <level>",
      CLI_OPTION_DESCRIPTIONS.DUPLICATE_VALUES,
    )
    .option(
      "--verify-project-keys <level>",
      CLI_OPTION_DESCRIPTIONS.VERIFY_PROJECT_KEYS,
    );
}
